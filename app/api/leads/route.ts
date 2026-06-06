import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function checkAdminAuth(req: NextRequest) {
  const required = process.env.ADMIN_API_TOKEN;
  if (!required) return false;
  const provided = req.headers.get("x-admin-token");
  return provided === required;
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("leads")
      .insert({ ...body, source: body.source || "manual" })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lead: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
