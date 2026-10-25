import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const expected = process.env.ADMIN_API_TOKEN;
  const provided = req.headers.get("x-admin-token") || "";
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(expected),Buffer.from(provided))) return NextResponse.json({error:"No autorizado."},{status:401,headers:{"Cache-Control":"no-store"}});
  try {
    const {data,error} = await supabaseAdmin().from("leads").select("id,name,email,phone,company,created_at").order("created_at",{ascending:false}).limit(100);
    if (error) throw error;
    return NextResponse.json({leads:data},{headers:{"Cache-Control":"no-store"}});
  } catch {return NextResponse.json({error:"Servicio no disponible."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
// No public creation endpoint. Contact requests use the validated /api/contact route.
