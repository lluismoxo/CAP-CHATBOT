import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY no configurada — añade la key en Vercel (Environment Variables) o en .env.local");
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: key });
  }
  return _client;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export function isOpenAIConfigured() {
  return !!process.env.OPENAI_API_KEY;
}
