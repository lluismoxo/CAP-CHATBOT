import { NextRequest, NextResponse } from "next/server";
import { buildCAPContext } from "@/lib/context";
import { getOpenAI, OPENAI_MODEL, isOpenAIConfigured } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase";
import { extractLeadInfo, hasLeadSignal } from "@/lib/leadExtractor";
import { rateLimit, getClientIP } from "@/lib/rateLimit";
import { checkOrigin, validatePayload, sanitizeUserMessage } from "@/lib/security";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM_PROMPT_TEMPLATE = (ctx: string) => `Eres el asistente virtual de CAP — Consultoría Adaptativa para Pymes (capconsultor.eu).

ROL:
- Responder dudas sobre servicios, equipo, metodología y casos de éxito de CAP.
- Calificar leads de forma natural y cercana: cuando sea oportuno, pregunta nombre, empresa, sector, qué problema quiere resolver y datos de contacto (email o teléfono) para que el equipo le llame.
- Promover la oferta de entrada: llamada gratuita de 30 min + auditoría inicial sin coste.

TONO:
- Cercano, directo, profesional. Español por defecto. Si el usuario escribe en otro idioma, responde en ese idioma.
- Respuestas breves (2-5 frases) salvo que pidan detalle.
- Nunca inventes servicios, precios, tecnologías ni clientes que no aparezcan en el CONTEXTO.

REGLAS:
- Si no sabes algo o no está en el CONTEXTO, dilo claramente y propón contactar al equipo.
- Si el usuario muestra interés serio, ofrece la llamada gratuita y pide su email o teléfono.
- No prometas plazos ni precios concretos: derívalos a la llamada/auditoría.

=== CONTEXTO ===
${ctx}
=== FIN CONTEXTO ===`;

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
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }

    const ip = getClientIP(req);
    const rl = rateLimit(ip);
    if (!rl.ok) {
      const retryAfter = Math.max(1, Math.ceil(((rl as any).resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: `Demasiadas peticiones. Espera unos minutos (límite por ${(rl as any).scope}).` },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
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
      return NextResponse.json({ error: "Falta mensaje de usuario" }, { status: 400 });
    }

    const conv = await getOrCreateConversation(sessionId, req);
    await persistMessage(conv.id, "user", lastUser.content);
    await upsertLeadFromMessage(conv.id, conv.lead_id, lastUser.content);

    if (!isOpenAIConfigured()) {
      const fallback =
        "Hola, soy el asistente de CAP Consultor. Aún no estoy conectado al modelo de lenguaje (falta configurar la OPENAI_API_KEY en el servidor), pero he guardado tu mensaje. Si quieres, escríbenos directamente a contact@capconsultor.eu o al +34 669 802 256 y agendamos una llamada gratuita de 30 minutos.";
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

    const reply = completion.choices[0]?.message?.content || "Lo siento, no he podido generar una respuesta.";
    await persistMessage(conv.id, "assistant", reply);

    return NextResponse.json({ reply, conversationId: conv.id, configured: true });
  } catch (err: any) {
    console.error("[/api/chat] error:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
