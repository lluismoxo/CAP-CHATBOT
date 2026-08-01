export const LIMITS = {
  maxMessageChars: 2000,
  maxMessagesPerRequest: 30,
  maxTotalChars: 20000,
};

const DEFAULT_ALLOWED = [
  "https://capconsultor.eu",
  "https://www.capconsultor.eu",
  "https://capchatbotfinal.vercel.app",
  "https://cap-chatbot-iota.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function getAllowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS;
  if (!env) return DEFAULT_ALLOWED;
  return env.split(",").map((s) => s.trim()).filter(Boolean);
}

export function checkOrigin(req: Request): { ok: boolean; reason?: string } {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const allowed = getAllowedOrigins();

  if (process.env.NODE_ENV !== "production") return { ok: true };

  const source = origin || (referer ? new URL(referer).origin : null);
  if (!source) return { ok: false, reason: "No origin" };
  if (!allowed.includes(source)) return { ok: false, reason: `Origin not allowed: ${source}` };
  return { ok: true };
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export function validatePayload(body: any): ValidationResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body", status: 400 };
  const { sessionId, messages } = body;
  if (typeof sessionId !== "string" || sessionId.length < 4 || sessionId.length > 100) {
    return { ok: false, error: "Invalid sessionId", status: 400 };
  }
  if (!Array.isArray(messages) || !messages.length) {
    return { ok: false, error: "messages is required", status: 400 };
  }
  if (messages.length > LIMITS.maxMessagesPerRequest) {
    return { ok: false, error: `Too many messages (max ${LIMITS.maxMessagesPerRequest})`, status: 400 };
  }
  let totalChars = 0;
  for (const m of messages) {
    if (!m || typeof m !== "object") return { ok: false, error: "Invalid message", status: 400 };
    if (m.role !== "user" && m.role !== "assistant" && m.role !== "system") {
      return { ok: false, error: "Invalid role", status: 400 };
    }
    if (typeof m.content !== "string") return { ok: false, error: "Invalid content", status: 400 };
    if (m.content.length > LIMITS.maxMessageChars) {
      return { ok: false, error: `Message too long (max ${LIMITS.maxMessageChars} chars)`, status: 400 };
    }
    totalChars += m.content.length;
  }
  if (totalChars > LIMITS.maxTotalChars) {
    return { ok: false, error: "Conversation history too long", status: 400 };
  }
  return { ok: true };
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+(instructions|prompts)/i,
  /disregard\s+(all\s+)?(previous|system)/i,
  /you\s+are\s+now\s+(a\s+)?(different|new)/i,
  /\bsystem\s*:\s*you\s+are\b/i,
  /\bact\s+as\s+(a\s+)?(different|new)\s+(assistant|ai|bot|model)/i,
  /reveal\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
  /print\s+(your\s+)?(system\s+)?prompt/i,
];

export function sanitizeUserMessage(text: string): string {
  let t = text.slice(0, LIMITS.maxMessageChars);
  for (const re of INJECTION_PATTERNS) {
    t = t.replace(re, "[blocked content]");
  }
  return t;
}
