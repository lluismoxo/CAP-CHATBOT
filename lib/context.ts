import { supabasePublic } from "./supabase";

type CompanyInfo = Record<string, any>;
type Row = Record<string, any>;

let cache: { text: string; expires: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function buildCAPContext(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.text;

  const [company, audience, services, team, clients, partners, industries, industryServices] = await Promise.all([
    supabasePublic.from("company_info").select("*").limit(1).maybeSingle(),
    supabasePublic.from("target_audience").select("*"),
    supabasePublic.from("services").select("*").order("is_primary", { ascending: false }),
    supabasePublic.from("team_members").select("*"),
    supabasePublic.from("clients").select("*"),
    supabasePublic.from("partners").select("*"),
    supabasePublic.from("industries").select("*").order("id"),
    supabasePublic.from("industry_services").select("*"),
  ]);

  const c: CompanyInfo = company.data || {};
  const aud: Row[] = audience.data || [];
  const srv: Row[] = services.data || [];
  const tm: Row[] = team.data || [];
  const cli: Row[] = clients.data || [];
  const prt: Row[] = partners.data || [];
  const ind: Row[] = industries.data || [];
  const indSrv: Row[] = industryServices.data || [];

  const parts: string[] = [];

  parts.push("# CONTEXTO CAP CONSULTOR");
  parts.push("");
  parts.push("## 1. IDENTIDAD");
  parts.push(`- Nombre: ${c.name || "CAP"}`);
  if (c.full_name) parts.push(`- Nombre completo: ${c.full_name}`);
  if (c.website) parts.push(`- Web: ${c.website}`);
  if (c.sector) parts.push(`- Sector: ${c.sector}`);
  if (c.location) parts.push(`- Ubicación: ${c.location}`);
  if (c.value_proposition) parts.push(`- Propuesta de valor: ${c.value_proposition}`);
  if (c.metrics) parts.push(`- Métricas destacadas: ${c.metrics}`);

  parts.push("");
  parts.push("## 2. CONTACTO");
  if (c.email) parts.push(`- Email: ${c.email}`);
  if (c.phone) parts.push(`- Teléfono: ${c.phone}`);
  if (c.instagram) parts.push(`- Instagram: ${c.instagram}`);
  if (c.linkedin) parts.push(`- LinkedIn: ${c.linkedin}`);
  if (c.headquarters) parts.push(`- Sede: ${c.headquarters}`);
  if (c.entry_offer) parts.push(`- Oferta de entrada: ${c.entry_offer}`);

  if (aud.length) {
    parts.push("");
    parts.push("## 3. PÚBLICO OBJETIVO");
    for (const a of aud) parts.push(`- ${a.segment}: ${a.description || ""}`);
  }

  if (srv.length) {
    parts.push("");
    parts.push("## 4. SERVICIOS (por categoría)");
    const byCat: Record<string, Row[]> = {};
    for (const s of srv) {
      const cat = s.category || "Otros";
      (byCat[cat] = byCat[cat] || []).push(s);
    }
    for (const cat of Object.keys(byCat)) {
      parts.push(`\n### ${cat}`);
      for (const s of byCat[cat]) {
        const flag = s.is_primary ? " ⭐" : "";
        parts.push(`- ${s.name}${flag}: ${s.description || ""}${s.tools ? " — Tecnologías: " + s.tools : ""}`);
      }
    }
  }

  if (ind.length) {
    parts.push("");
    parts.push("## 4.b SERVICIOS RECOMENDADOS POR SECTOR");
    parts.push("(Cuando un usuario diga su sector, prioriza estos servicios en la conversación.)");
    for (const i of ind) {
      const items = indSrv.filter((x) => x.industry_id === i.id).map((x) => x.service_name);
      if (!items.length) continue;
      const desc = i.description ? ` (${i.description})` : "";
      parts.push(`\n### ${i.name}${desc}`);
      for (const it of items) parts.push(`- ${it}`);
    }
  }

  parts.push("");
  parts.push("## 5. FILOSOFÍA");
  if (c.philosophy) parts.push(c.philosophy);
  if (c.what_they_dont_do) parts.push(`Qué NO hacen: ${c.what_they_dont_do}`);
  if (c.values) parts.push(`Valores: ${c.values}`);

  if (c.tech_stack) {
    parts.push("");
    parts.push("## 6. STACK TECNOLÓGICO");
    parts.push(c.tech_stack);
  }

  if (tm.length) {
    parts.push("");
    parts.push("## 7. EQUIPO");
    for (const t of tm) {
      parts.push(`- ${t.name} — ${t.role || ""}${t.bio ? " (" + t.bio + ")" : ""}`);
    }
  }

  if (cli.length) {
    parts.push("");
    parts.push("## 8. CASOS DE ÉXITO");
    for (const cl of cli) {
      parts.push(`- ${cl.name} [${cl.sector || ""}${cl.location ? ", " + cl.location : ""}]: ${cl.case_study || ""}`);
    }
  }

  if (prt.length) {
    parts.push("");
    parts.push("## 9. SOCIOS Y COLABORADORES");
    for (const p of prt) parts.push(`- ${p.name} (${p.type || ""}): ${p.description || ""}`);
  }

  const text = parts.join("\n");
  cache = { text, expires: now + TTL_MS };
  return text;
}

export function clearContextCache() {
  cache = null;
}
