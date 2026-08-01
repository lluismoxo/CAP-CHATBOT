import { NextRequest, NextResponse } from "next/server";
import { buildCAPContext } from "@/lib/context";
import { getOpenAI, OPENAI_MODEL, isOpenAIConfigured } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase";
import { extractLeadInfo, hasLeadSignal } from "@/lib/leadExtractor";
import { rateLimit, getClientIP } from "@/lib/rateLimit";
import { checkOrigin, validatePayload, sanitizeUserMessage } from "@/lib/security";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM_PROMPT_TEMPLATE = (ctx: string) => `You are the virtual assistant for CAP — Adaptive Consulting for Small Businesses (capconsultor.eu).

ROLE:
- Answer questions about CAP's services, team, method and case studies.
- Qualify leads naturally and warmly: when the moment is right, ask for their name, company, industry, the problem they want to solve, and contact details (email or phone) so the team can get back to them.
- Promote the entry offer: a free 30-minute call plus a free initial audit.

TONE:
- Warm, direct, professional. English by default. If the user writes in another language, reply in that language.
- Keep answers short (2-5 sentences) unless they ask for detail.
- Never invent services, prices, technologies or clients that do not appear in the CONTEXT.

RULES:
- If you do not know something, or it is not in the CONTEXT, say so plainly and suggest contacting the team.
- If the user shows serious interest, offer the free call and ask for their email or phone number.
- Do not promise specific timelines or prices: point those to the call or audit.

=== CONTEXT ===
${ctx}
=== END CONTEXT ===`;

async function getOrCreateConversation(sessionId: string, req: NextRequest) {
  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("conversations")
    .select("id, lead_id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing) return existing;

  const userAgent = req.headers.get("user-agent") || null;
  const { data: created, error } = await admin
    .from("conversations")
    .insert({ session_id: sessionId, user_agent: userAgent })
    .select("id, lead_id")
    .single();
  if (error) throw error;
  return created;
}

async function persistMessage(conversationId: string, role: string, content: string) {
  const admin = supabaseAdmin();
  await admin.from("messages").insert({ conversation_id: conversationId, role, content });
}

async function upsertLeadFromMessage(conversationId: string, existingLeadId: string | null, userText: string) {
  const extracted = extractLeadInfo(userText);
  if (!hasLeadSignal(extracted)) return existingLeadId;

  const admin = supabaseAdmin();

  if (existingLeadId) {
    const { data: current } = await admin.from("leads").select("*").eq("id", existingLeadId).maybeSingle();
    const patch: Record<string, any> = {};
    for (const k of Object.keys(extracted) as Array<keyof typeof extracted>) {
      const newVal = extracted[k];
      if (newVal && (!current || !current[k])) patch[k] = newVal;
    }
    if (Object.keys(patch).length) {
      patch.updated_at = new Date().toISOString();
      await admin.from("leads").update(patch).eq("id", existingLeadId);
    }
    return existingLeadId;
  }

  let leadId: string | null = null;
  if (extracted.email) {
    const { data: byEmail } = await admin
      .from("leads")
      .select("id")
      .eq("email", extracted.email)
      .maybeSingle();
    if (byEmail) leadId = byEmail.id;
  }

  if (!leadId) {
    const { data: inserted, error } = await admin
      .from("leads")
      .insert({ ...extracted, conversation_id: conversationId, source: "chatbot" })
      .select("id")
      .single();
    if (error) throw error;
    leadId = inserted.id;
  } else {
    await admin.from("leads").update({ ...extracted, updated_at: new Date().toISOString() }).eq("id", leadId);
  }

  await admin.from("conversations").update({ lead_id: leadId, updated_at: new Date().toISOString() }).eq("id", conversationId);
  return leadId;
}

export async function POST(req: NextRequest) {
  try {
    const originCheck = checkOrigin(req);
    if (!originCheck.ok) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const ip = getClientIP(req);
    const rl = rateLimit(ip);
    if (!rl.ok) {
      const retryAfter = Math.max(1, Math.ceil(((rl as any).resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: `Too many requests. Please wait a few minutes (${(rl as any).scope} limit).` },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const validation = validatePayload(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const sessionId: string = body.sessionId;
    const messages: ChatMessage[] = body.messages.map((m: ChatMessage) => ({
      role: m.role,
      content: m.role === "user" ? sanitizeUserMessage(m.content) : m.content,
    }));

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      return NextResponse.json({ error: "Missing user message" }, { status: 400 });
    }

    const conv = await getOrCreateConversation(sessionId, req);
    await persistMessage(conv.id, "user", lastUser.content);
    await upsertLeadFromMessage(conv.id, conv.lead_id, lastUser.content);

    if (!isOpenAIConfigured()) {
      const fallback =
        "Hi, I'm the CAP Consultor assistant. I'm not connected to the language model yet (the OPENAI_API_KEY still needs to be configured on the server), but I've saved your message. If you like, write to us directly at contact@capconsultor.eu or call +34 669 802 256 and we'll set up a free 30-minute call.";
      await persistMessage(conv.id, "assistant", fallback);
      return NextResponse.json({ reply: fallback, conversationId: conv.id, configured: false });
    }

    const ctx = await buildCAPContext();
    const system = SYSTEM_PROMPT_TEMPLATE(ctx);

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.5,
      max_tokens: 600,
    });

    const reply = completion.choices[0]?.message?.content || "Sorry, I could not generate a reply.";
    await persistMessage(conv.id, "assistant", reply);

    return NextResponse.json({ reply, conversationId: conv.id, configured: true });
  } catch (err: any) {
    console.error("[/api/chat] error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
