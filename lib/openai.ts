// Use native fetch in the current Node runtime; avoid the legacy node-fetch URL parser.
import "openai/shims/web";
import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  // .trim() evita el error "is not a legal HTTP header value" cuando la key
  // se pega en Vercel con un salto de línea o espacio al final.
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY no configurada — añade la key en Vercel (Environment Variables) o en .env.local");
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: key, timeout: 18000, maxRetries: 0 });
  }
  return _client;
}

export const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
