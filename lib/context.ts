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

  parts.push("# CAP CONSULTOR CONTEXT");
  parts.push("");
  parts.push("## 1. IDENTITY");
  parts.push(`- Name: ${c.name || "CAP"}`);
  if (c.full_name) parts.push(`- Full name: ${c.full_name}`);
  if (c.website) parts.push(`- Website: ${c.website}`);
  if (c.sector) parts.push(`- Sector: ${c.sector}`);
  if (c.location) parts.push(`- Location: ${c.location}`);
  if (c.value_proposition) parts.push(`- Value proposition: ${c.value_proposition}`);
  if (c.metrics) parts.push(`- Key metrics: ${c.metrics}`);

  parts.push("");
  parts.push("## 2. CONTACT");
  if (c.email) parts.push(`- Email: ${c.email}`);
  if (c.phone) parts.push(`- Phone: ${c.phone}`);
  if (c.instagram) parts.push(`- Instagram: ${c.instagram}`);
  if (c.linkedin) parts.push(`- LinkedIn: ${c.linkedin}`);
  if (c.headquarters) parts.push(`- Headquarters: ${c.headquarters}`);
  if (c.entry_offer) parts.push(`- Entry offer: ${c.entry_offer}`);

  if (aud.length) {
    parts.push("");
    parts.push("## 3. TARGET AUDIENCE");
    for (const a of aud) parts.push(`- ${a.segment}: ${a.description || ""}`);
  }

  if (srv.length) {
    parts.push("");
    parts.push("## 4. SERVICES (by category)");
    const byCat: Record<string, Row[]> = {};
    for (const s of srv) {
      const cat = s.category || "Other";
      (byCat[cat] = byCat[cat] || []).push(s);
    }
    for (const cat of Object.keys(byCat)) {
      parts.push(`\n### ${cat}`);
      for (const s of byCat[cat]) {
        const flag = s.is_primary ? " ⭐" : "";
        parts.push(`- ${s.name}${flag}: ${s.description || ""}${s.tools ? " — Technologies: " + s.tools : ""}`);
      }
    }
  }

  if (ind.length) {
    parts.push("");
    parts.push("## 4.b RECOMMENDED SERVICES BY INDUSTRY");
    parts.push("(When a user mentions their industry, prioritise these services in the conversation.)");
    for (const i of ind) {
      const items = indSrv.filter((x) => x.industry_id === i.id).map((x) => x.service_name);
      if (!items.length) continue;
      const desc = i.description ? ` (${i.description})` : "";
      parts.push(`\n### ${i.name}${desc}`);
      for (const it of items) parts.push(`- ${it}`);
    }
  }

  parts.push("");
  parts.push("## 5. PHILOSOPHY");
  if (c.philosophy) parts.push(c.philosophy);
  if (c.what_they_dont_do) parts.push(`What they do NOT do: ${c.what_they_dont_do}`);
  if (c.values) parts.push(`Values: ${c.values}`);

  if (c.tech_stack) {
    parts.push("");
    parts.push("## 6. TECH STACK");
    parts.push(c.tech_stack);
  }

  if (tm.length) {
    parts.push("");
    parts.push("## 7. TEAM");
    for (const t of tm) {
      parts.push(`- ${t.name} — ${t.role || ""}${t.bio ? " (" + t.bio + ")" : ""}`);
    }
  }

  if (cli.length) {
    parts.push("");
    parts.push("## 8. CASE STUDIES");
    for (const cl of cli) {
      parts.push(`- ${cl.name} [${cl.sector || ""}${cl.location ? ", " + cl.location : ""}]: ${cl.case_study || ""}`);
    }
  }

  if (prt.length) {
    parts.push("");
    parts.push("## 9. PARTNERS AND COLLABORATORS");
    for (const p of prt) parts.push(`- ${p.name} (${p.type || ""}): ${p.description || ""}`);
  }

  const text = parts.join("\n");
  cache = { text, expires: now + TTL_MS };
  return text;
}

export function clearContextCache() {
  cache = null;
}
