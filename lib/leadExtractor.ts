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

// El bot responde en el idioma del usuario, asi que los patrones cubren
// ingles (principal) y espanol (visitantes que escriben en castellano).
// Palabras que nunca forman parte de un nombre propio: cortan la captura.
const NAME_STOP = "(?:and|but|from|with|at|the|a|an|i|we|my|our|y|de|del|la|el)";

const NAME_PATTERNS = [
  new RegExp(
    `\\b(?:my name is|i am called|this is)\\s+((?!${NAME_STOP}\\b)[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]+(?:\\s+(?!${NAME_STOP}\\b)[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]+){0,2})`,
    "i"
  ),
  new RegExp(
    `\\bi'?m\\s+((?!${NAME_STOP}\\b)[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]+(?:\\s+(?!${NAME_STOP}\\b)[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]+){0,2})(?=\\s*[,.;!?]|\\s+(?:and|from|the|a|an)\\b|$)`,
    "i"
  ),
  new RegExp(
    `\\bme llamo\\s+((?!${NAME_STOP}\\b)[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]+(?:\\s+(?!${NAME_STOP}\\b)[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]+){0,2})`,
    "i"
  ),
  new RegExp(
    `\\bmi nombre es\\s+((?!${NAME_STOP}\\b)[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]+(?:\\s+(?!${NAME_STOP}\\b)[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]+){0,2})`,
    "i"
  ),
  new RegExp(
    `\\bsoy\\s+((?!${NAME_STOP}\\b)[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]+(?:\\s+(?!${NAME_STOP}\\b)[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]+){0,2})`,
    "i"
  ),
];

const COMPANY_PATTERNS = [
  /\b(?:i work at|i work for|my company is|the company is|our company is|i run|i own|i manage)\s+([A-Z0-9][\w&.\- ]{1,40}?)(?=\s+(?:and|that|which|because|for|where|when)\b|[,.;!?]|$)/i,
  // "I'm the CEO of Acme Ltd", "founder of Acme"
  /\b(?:CEO|CTO|COO|CFO|founder|co-?founder|director|manager|owner|head)\s+(?:of|at)\s+([A-Z0-9][\w&.\- ]{1,40}?)(?=\s+(?:and|that|which|because|where|when)\b|[,.;!?]|$)/i,
  /\b(?:trabajo en|en la empresa|empresa se llama|mi empresa es|de la empresa|dirijo|llevo)\s+([A-Z0-9][\w&.\- ]{1,40}?)(?=\s+(?:y|que|,|\.|;|porque|para|donde|cuando)\b|[,.;!?]|$)/i,
  /\bsoy de\s+([A-Z][\w&.\- ]{2,40}?)(?=\s+(?:y|que|,|\.|;|porque|para)\b|[,.;!?]|$)/i,
];

const ROLE_PATTERNS = [
  /\bi'?m\s+(?:the\s+|a\s+|an\s+)?(CEO|CTO|COO|CFO|founder|co-?founder|director|manager|owner|head of [\w ]{3,30}|marketing manager|operations manager)\b/i,
  /\b(?:i work as|my role is|my position is|my title is)\s+(?:an?\s+)?([\w ]{3,40})/i,
  /\bsoy\s+(CEO|CTO|director[a]?|gerente|fundador[a]?|co-?fundador[a]?|responsable|jefe[a]?|encargado[a]?|consultor[a]?|manager)\b/i,
  /\b(?:trabajo como|mi puesto es|mi rol es)\s+([\wáéíóúñ ]{3,40})/i,
];

const INDUSTRY_PATTERNS = [
  /\b(?:in the|the)\s+([\w ]{3,30}?)\s+(?:sector|industry)\b/i,
  /\b(?:we are|we're|i'?m)\s+(?:in|into)\s+([\w ]{3,40}?)(?=\s*[,.;!?]|\s+(?:and|but)\b|$)/i,
  /\bwe (?:do|sell|run)\s+([\w ,]{3,60})/i,
  /\bsector\s+([\wáéíóúñ ]{3,40})/i,
  /\bindustria\s+([\wáéíóúñ ]{3,40})/i,
  /\bnos dedicamos a\s+([\wáéíóúñ ,]{3,80})/i,
];

const SIZE_PATTERNS = [
  /\b(\d{1,4})\s*(?:employees|staff|people(?:\s+(?:in|on)\s+the\s+team)?|workers)/i,
  /\bwe(?:'?re| are)\s+(\d{1,4})\b/i,
  /\bteam of\s+(\d{1,4})\b/i,
  /\b(\d{1,4})\s*(?:empleados|trabajadores|personas en el equipo)/i,
  /\bsomos\s+(\d{1,4})\b/i,
];

const TIMELINE_PATTERNS = [
  /\b(this week|this month|next month|next few weeks|coming weeks|q[1-4]|this quarter|next quarter|before [a-z]+|in \d+ (?:weeks|months)|asap|as soon as possible)/i,
  /\b(esta semana|este mes|pr[oó]ximas semanas|pr[oó]ximo mes|trimestre|antes de [a-z]+|en \d+ (?:semanas|meses))/i,
];

const BUDGET_PATTERNS = [
  /\b(\d{1,6}\s?(?:€|euros?|eur|\$|usd|gbp|£)|\d{1,3}k\s?(?:€|eur|\$|usd|£)?)/i,
  /\bbudget\s+(?:of\s+|is\s+|around\s+)?([\w€£$\d. -]{2,40})/i,
  /\bpresupuesto\s+(?:de\s+)?([\w€\d. -]{2,40})/i,
];

const INTEREST_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(automat\w*)\s+(?:my\s+|the\s+|our\s+)?(?:accounting|bookkeeping)|automatizar?\s+(?:la\s+|de\s+)?contabilidad/i, "Accounting automation"],
  [/\b(stock|inventory|inventario)/i, "Stock management"],
  [/\b(cash[\s-]?flow|treasury|liquidity|tesorer[ií]a|liquidez)/i, "Predictive financial management"],
  [/\b(leads?|prospecting|outreach|captaci[oó]n)/i, "Lead generation"],
  [/\b(seo|search rankings?|posicionamiento)/i, "SEO"],
  [/\b(content|posts?|videos?|images?|contenido|v[ií]deos?|im[aá]genes)/i, "Content creation"],
  [/\b(n8n|workflows?|orchestration|orquestaci[oó]n)/i, "Claude + n8n"],
  [/\b(marketing|campaigns?|campa[ñn]a)/i, "Marketing"],
  [/\b(data|analytics|airflow|power\s*bi|tableau|datos|anal[ií]tica)/i, "Data analysis"],
  [/\b(chatbot|assistant|agents?|asistente|agente)/i, "Chatbot / AI agents"],
  [/\b(website|web\s?site|web page|landing page|p[aá]gina web)/i, "Website development"],
  [/\b(booking|appointments?|calendar|reservas|citas)/i, "Booking and calendar automation"],
  [/\b(reviews?|reputation|rese[ñn]as)/i, "Review collection"],
  [/\b(loyalty|rewards?|fideliza\w*)/i, "Loyalty programmes"],
];

const PAIN_PATTERNS = [
  /\b(problem|pain|struggle|struggling|it takes me|i waste|i lose time|no time|inefficien\w*|manual|chaos|messy|bottleneck)[^.\n]{3,160}/i,
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
  if (size) out.company_size = `${size} people`;

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
