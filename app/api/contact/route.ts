import { NextRequest, NextResponse } from "next/server";
import { checkOrigin, readJson, validateContact, RequestError } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";
export const runtime = "nodejs";
function cors(req: Request): Record<string,string> {return checkOrigin(req) ? {"Access-Control-Allow-Origin":req.headers.get("origin")!,"Vary":"Origin"} : {};}
export async function OPTIONS(req: NextRequest) {return new NextResponse(null,{status:checkOrigin(req)?204:403,headers:{...cors(req),"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600","Cache-Control":"no-store"}});}
export async function POST(req: NextRequest) {
  const json = (body: unknown, status = 200, headers = {}) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store",...cors(req),...headers}});
  try {
    if (!checkOrigin(req)) return json({error:"Origen no permitido."},403);
    const contact = validateContact(await readJson(req, 24000));
    if (contact.honeypot) return json({ok:true});
    const limit = await rateLimit(req,"contact",contact.email);
    if (!limit.allowed) return json({error:"Has enviado varias consultas. Espera antes de volver a intentarlo."},429,{"Retry-After":String(limit.retry_after)});
    const {error} = await supabaseAdmin().from("clientes_web").insert({
      nombre_contacto:contact.name,nombre_negocio:contact.company || contact.name,email:contact.email,
      mensaje:contact.message || null,origen:"web",consent_at:new Date().toISOString(),privacy_version:"2026-10-25",
    });
    if (error) throw new Error("Contact persistence failed");
    return json({ok:true});
  } catch(error) {
    if (error instanceof RequestError) return json({error:error.message},error.status);
    console.error("contact_request_failed",error instanceof Error ? error.name : "UnknownError");
    return json({error:"No se ha podido guardar tu consulta. Escríbenos a contact@capconsultor.eu."},503);
  }
}
