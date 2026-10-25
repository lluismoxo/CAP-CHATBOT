export const LIMITS = { maxMessageChars: 2000, maxMessagesPerRequest: 20, maxTotalChars: 12000 };
const ORIGINS = new Set(["https://capconsultor.eu", "https://www.capconsultor.eu", "https://cap-sigma-two.vercel.app", "https://capchatbotfinal.vercel.app"]);
export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (process.env.NODE_ENV !== "production" && origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  return !!origin && ORIGINS.has(origin) && req.headers.get("sec-fetch-site") !== "none";
}
export class RequestError extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
export async function readJson(req: Request, maxBytes = 20000): Promise<unknown> {
  if (!/^application\/json(?:;|$)/i.test(req.headers.get("content-type") || "")) throw new RequestError("Formato no permitido.", 415);
  if (Number(req.headers.get("content-length")) > maxBytes) throw new RequestError("Solicitud demasiado grande.", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new RequestError("Solicitud vacía.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RequestError("Solicitud demasiado grande.", 413); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) { if (error instanceof RequestError) throw error; throw new RequestError("JSON inválido."); }
}
export type ChatMessage = {role: "user" | "assistant"; content: string};
export function validateMessages(body: unknown): ChatMessage[] {
  if (!body || typeof body !== "object" || !("messages" in body) || !Array.isArray(body.messages)) throw new RequestError("Faltan mensajes.");
  const messages = body.messages;
  if (!messages.length || messages.length > LIMITS.maxMessagesPerRequest) throw new RequestError("Historial demasiado largo.");
  let total = 0;
  for (const m of messages) {
    if (!m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || !m.content.trim() || m.content.length > LIMITS.maxMessageChars) throw new RequestError("Mensaje inválido o demasiado largo.");
    total += m.content.length;
  }
  if (total > LIMITS.maxTotalChars || messages.at(-1).role !== "user") throw new RequestError("Historial inválido.");
  return messages.map(m => ({role: m.role, content: m.content.trim()}));
}
export function validateContact(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new RequestError("Solicitud inválida.");
  const b = body as Record<string, unknown>;
  function field(key: string, max: number, required = false) {
    const value = b[key] ?? "";
    if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new RequestError("Revisa los campos del formulario.");
    if (required && !value.trim()) throw new RequestError("Completa los campos obligatorios.");
    return value.trim();
  }
  const name = field("name", 120, true), company = field("company", 160), email = field("email", 254, true).toLowerCase(), message = field("message", 4000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new RequestError("El email no es válido.");
  if (b.consent !== true) throw new RequestError("Debes autorizar el tratamiento de tu consulta.");
  return {name, company, email, message, honeypot: field("website_url", 200)};
}
