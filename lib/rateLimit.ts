import { createHmac } from "node:crypto";
import { supabaseAdmin } from "./supabase";
export function privateHash(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Missing server configuration");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export async function rateLimit(req: Request, scope: "chat" | "contact", email?: string) {
  // Vercel replaces this header at its trusted ingress. Never trust a client IP in JSON.
  const ip = (req.headers.get("x-vercel-forwarded-for") || req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const key = privateHash(ip);
  const limits = scope === "chat" ? [[60, 10], [3600, 50], [86400, 200]] : [[900, 3], [86400, 10]];
  const rules = limits.map(([seconds, limit]) => ({key: `${scope}:ip:${key}:${seconds}`, seconds, limit}));
  rules.push({key: `${scope}:global`, seconds: 86400, limit: scope === "chat" ? 1000 : 100});
  if (email) rules.push({key: `contact:email:${privateHash(email)}`, seconds: 86400, limit: 3});
  const { data, error } = await supabaseAdmin().rpc("cap_check_rate_limits", {p_rules: rules});
  if (error || !data || typeof data.allowed !== "boolean") throw new Error("Rate limiter unavailable");
  return data as {allowed: boolean; retry_after: number};
}
