import { createClient } from "@supabase/supabase-js";

// .trim() por si las vars se pegan en Vercel con saltos/espacios al final.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export const supabasePublic = createClient(url, anonKey);

export function supabaseAdmin() {
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
