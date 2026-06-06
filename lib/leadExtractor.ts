export type ExtractedLead = {
  email?: string;
  phone?: string;
  name?: string;
  company?: string;
  role?: string;
  industry?: string;
  company_size?: string;
  interest?: string;
  pain_points?: string;
  budget_range?: string;
  timeline?: string;
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/;

const NAME_PATTERNS = [
  /\bme llamo\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+){0,2})/i,
  /\bmi nombre es\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+){0,2})/i,
  /\bsoy\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+){0,2})/i,
];

const COMPANY_PATTERNS = [
  /\b(?:trabajo en|en la empresa|empresa se llama|mi empresa es|de la empresa|dirijo|llevo)\s+([A-Z0-9][\w&.\- ]{1,40}?)(?=\s+(?:y|que|,|\.|;|porque|para|donde|cuando)\b|[,.;!?]|$)/i,
  /\bsoy de\s+([A-Z][\w&.\- ]{2,40}?)(?=\s+(?:y|que|,|\.|;|porque|para)\b|[,.;!?]|$)/i,
];

const ROLE_PATTERNS = [
  /\bsoy\s+(CEO|CTO|director[a]?|gerente|fundador[a]?|co-?fundador[a]?|responsable|jefe[a]?|encargado[a]?|consultor[a]?|manager)\b/i,
  /\b(?:trabajo como|mi puesto es|mi rol es)\s+([\wáéíóúñ ]{3,40})/i,
];

const INDUSTRY_PATTERNS = [
  /\bsector\s+([\wáéíóúñ ]{3,40})/i,
  /\bindustria\s+([\wáéíóúñ ]{3,40})/i,
  /\bnos dedicamos a\s+([\wáéíóúñ ,]{3,80})/i,
];

const SIZE_PATTERNS = [
  /\b(\d{1,4})\s*(?:empleados|trabajadores|personas en el equipo)/i,
  /\bsomos\s+(\d{1,4})\b/i,
];

const TIMELINE_PATTERNS = [
  /\b(esta semana|este mes|pr[oó]ximas semanas|pr[oó]ximo mes|q[1-4]|trimestre|antes de [a-z]+|en \d+ (?:semanas|meses))/i,
];

const BUDGET_PATTERNS = [
  /\b(\d{1,6}\s?(?:€|euros?|eur|\$)|\d{1,3}k\s?(?:€|eur)?)/i,
  /\bpresupuesto\s+(?:de\s+)?([\w€\d. -]{2,40})/i,
];

const INTEREST_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(automatizar?|automatizaci[oó]n)\s+(?:la\s+|de\s+)?contabilidad/i, "Automatización contabilidad"],
  [/\b(stock|inventario)/i, "Gestión de stock"],
  [/\b(cash[\s-]?flow|tesorer[ií]a|liquidez)/i, "Gestión financiera predictiva"],
  [/\b(leads?|captaci[oó]n|prospecting|outreach)/i, "Generación de leads"],
  [/\b(seo|posicionamiento)/i, "SEO"],
  [/\b(contenido|posts?|v[ií]deos?|im[aá]genes)/i, "Creación de contenido"],
  [/\b(n8n|workflow|orquestaci[oó]n)/i, "Claude + n8n"],
  [/\b(marketing|campa[ñn]a)/i, "Marketing"],
  [/\b(datos|anal[ií]tica|airflow|power\s*bi|tableau)/i, "Análisis de datos"],
  [/\b(chatbot|asistente|agente)/i, "Chatbot / agentes IA"],
];

const PAIN_PATTERNS = [
  /\b(problema|dolor|me cuesta|me lleva|pierdo tiempo|no tengo tiempo|ineficien|manual|caos|desorden)[^.\n]{3,160}/i,
];

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return undefined;
}

export function extractLeadInfo(text: string): ExtractedLead {
  const out: ExtractedLead = {};
  const t = text || "";

  const email = t.match(EMAIL_RE);
  if (email) out.email = email[0];

  const phone = t.match(PHONE_RE);
  if (phone) {
    const digits = phone[1].replace(/\D/g, "");
    if (digits.length >= 9) out.phone = phone[1].trim();
  }

  const name = firstMatch(t, NAME_PATTERNS);
  if (name) out.name = name;

  const company = firstMatch(t, COMPANY_PATTERNS);
  if (company) out.company = company;

  const role = firstMatch(t, ROLE_PATTERNS);
  if (role) out.role = role;

  const industry = firstMatch(t, INDUSTRY_PATTERNS);
  if (industry) out.industry = industry;

  const size = firstMatch(t, SIZE_PATTERNS);
  if (size) out.company_size = `${size} personas`;

  const timeline = firstMatch(t, TIMELINE_PATTERNS);
  if (timeline) out.timeline = timeline;

  const budget = firstMatch(t, BUDGET_PATTERNS);
  if (budget) out.budget_range = budget;

  const interests: string[] = [];
  for (const [re, label] of INTEREST_KEYWORDS) {
    if (re.test(t)) interests.push(label);
  }
  if (interests.length) out.interest = Array.from(new Set(interests)).join(", ");

  for (const p of PAIN_PATTERNS) {
    const m = t.match(p);
    if (m) {
      out.pain_points = m[0].trim().slice(0, 300);
      break;
    }
  }

  return out;
}

export function hasLeadSignal(lead: ExtractedLead): boolean {
  return !!(lead.email || lead.phone || lead.name || lead.company || lead.interest || lead.pain_points);
}
