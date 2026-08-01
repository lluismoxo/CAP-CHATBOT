#!/usr/bin/env python3
"""
Traduce el contenido del chatbot CAP de espanol a ingles, en sitio.

Uso:
    python3 scripts/translate-to-en.py --dry-run   # muestra los cambios
    python3 scripts/translate-to-en.py --apply     # los escribe en Supabase

Backup previo en backup-es-2026-08-02/. Idempotente: se puede reejecutar.
"""
import json
import os
import sys
import urllib.request

URL = os.environ.get("SUPABASE_URL", "https://dzslnlqylsnxotnidfhi.supabase.co") + "/rest/v1"
KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not KEY:
    sys.exit("Falta SUPABASE_SERVICE_KEY en el entorno.")


def req(method, path, body=None, prefer=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(URL + path, data=data, method=method)
    r.add_header("apikey", KEY)
    r.add_header("Authorization", "Bearer " + KEY)
    r.add_header("Content-Type", "application/json")
    if prefer:
        r.add_header("Prefer", prefer)
    with urllib.request.urlopen(r) as resp:
        raw = resp.read().decode()
        return json.loads(raw) if raw.strip() else None


# --- Nombres canonicos de servicio (ES -> EN) -------------------------------
# services.name e industry_services.service_name deben coincidir siempre.
SERVICE_NAMES = {
    "Creación de Páginas Web Personalizadas": "Custom Website Development",
    "Chatbots Inteligentes Personalizados": "Custom AI Chatbots",
    "Automatización de Atención al Cliente": "Customer Support Automation",
    "Procesamiento Inteligente de Documentos": "Intelligent Document Processing",
    "Análisis de Datos Automatizado": "Automated Data Analysis",
    "Reporting Interno Automatizado": "Automated Internal Reporting",
    "Lead Generation": "Lead Generation",
    "Lead Management": "Lead Management",
    "Lead Recovery y Reactivación de Bases de Datos": "Lead Recovery and Database Reactivation",
    "Automatización de Reservas y Calendarios": "Booking and Calendar Automation",
    "Sistema de Captación de Reseñas": "Review Collection System",
    "Programas de Fidelización": "Customer Loyalty Programmes",
    "Marketing Automatizado con IA": "AI-Powered Marketing Automation",
    "Producción Visual con IA": "AI Visual Production",
}

SERVICE_CATEGORIES = {
    "Desarrollo Web": "Web Development",
    "Inteligencia Artificial y Automatización": "Artificial Intelligence and Automation",
    "Gestión Comercial y Ventas": "Sales and Business Development",
    "Gestión de Citas y Agenda": "Scheduling and Appointments",
    "Fidelización y Reputación Online": "Customer Loyalty and Online Reputation",
    "Marketing y Creación de Contenido": "Marketing and Content Creation",
}

SERVICE_DESCRIPTIONS = {
    1: "Design and development of fully bespoke websites, built around each business's needs, with a professional approach, scalability and high performance.",
    2: "Advanced chatbots trained on the company's own information and connected to live databases. Deployable on the web, WhatsApp and other channels.",
    3: "Intake of information by email, forms or messaging. Automatic classification by category, priority or department. Logging into databases. Automatic notifications to the right person.",
    4: "AI agents for administrative and accounting work: intake from email or folders, classification by document type, data extraction and analysis, and automatic logging into databases or spreadsheets.",
    5: "Analysis and visualisation systems using tools such as Claude Artifacts, with automatic data refresh and report generation.",
    6: "Weekly tracking of sales pipelines, KPI consolidation, collection of updates, data extraction, automated analysis and team notifications.",
    7: "Generating sales opportunities with Apollo and Instantly: identifying qualified prospects, building databases and running prospecting campaigns.",
    8: "End-to-end management: organising and maintaining databases, automating campaigns, tracking interactions and keeping a full history.",
    9: "Recovering opportunities from existing databases: analysis of dormant contacts, reactivation campaigns and automated follow-up.",
    10: "Calendly-style systems integrated with Google Calendar: automatic appointment handling, reminders, notifications and alerts. Bespoke systems built where needed.",
    11: "Physical QR-code cards so customers can leave reviews on your Google Business Profile. Ideal for restaurants, clinics, shops and service businesses.",
    12: "Loyalty systems with custom QR codes: accumulating perks and discounts, automatic profile management and real-time updates of points, spend and rewards.",
    13: "Content creation through AI agents for posts, campaigns and marketing materials.",
    14: "Image and video generation for social media with advanced tools such as Higgsfield AI, cutting production time and cost.",
}

COMPANY = {
    "full_name": 'CAP — Adaptive Consulting for Small Businesses (also "Adaptable Consulting for SMEs")',
    "sector": "AI automation consulting",
    "location": "Barcelona, Spain",
    "value_proposition": "Consulting that adapts to your business. Bringing quality consulting and enterprise-grade tools to small businesses, with real 1:1 human support.",
    "metrics": "Time saved on operational work, 100% bespoke solutions, genuine 1:1 human support.",
    "instagram": "@cap_consultor (https://www.instagram.com/cap_consultor/)",
    "headquarters": "Barcelona · Spain",
    "entry_offer": "Free 30-minute call with no obligation, plus a free initial audit (diagnosis at no cost).",
    "philosophy": "Strategic judgement: we prioritise what genuinely saves time and money — we don't automate for the sake of it. Human oversight: AI assists, people decide, and everything is reviewed continuously. Full adaptation: we match the size, complexity and scope to where the business actually is.",
    "what_they_dont_do": "We don't replace your team, we don't complicate what already works, and we don't add automation you don't need.",
    "values": "Closeness and real commitment, full personalisation, strategic judgement, measurable results.",
    "tech_stack": "Claude Code (Anthropic), n8n, Apache Airflow, Apollo.io, Clay, Brevo, Supabase, Canva, Kling AI, Veo, Nanobanana.",
}

TARGET_AUDIENCE = {
    1: ("Growing SMEs", "Teams that work but need structure, automation and strategy in order to scale."),
    2: ("Micro-businesses", "Small businesses where every hour counts; we give them back their time and enterprise-grade tools."),
    3: ("Startups and new businesses", "Early-stage projects with the potential to grow fast."),
}

TEAM_ROLES = {
    1: "Co-founder · Director of Strategic Operations",
    2: "Co-founder · Marketing & Operations",
    3: "Accounting",
    4: "Data Analysis Specialist",
}

CLIENTS = {
    1: ("Retail · Photography", "Automation of accounting and stock management; end-to-end accounting processes and stock control without manual errors."),
    2: ("Tourism · Expeditions · Africa", "Automation of customer acquisition and digital marketing; a lead flow segmented by destination and personalised communication at scale with AI. Our only travel-related client."),
    3: ("Healthcare · Psychology", "Lead acquisition and management, marketing and content creation, and faster customer service."),
    4: ("Clothing", None),
}
CLIENT_LOCATIONS = {2: "Based in Barcelona"}

PARTNERS = {
    1: ("Partner · IT consultancy", "Digital transformation"),
    2: ("Partner · IT consultancy", "AI applied to business"),
    3: ("Partner · IT consultancy", "Architecture and data"),
    4: ("Collaborator", "IT consulting"),
    5: ("Collaborator", "IT consulting"),
}

INDUSTRIES = {
    1: ("Private Clinics", "Dental, aesthetics, physiotherapy, psychology"),
    2: ("Real Estate and Property Developers", None),
    3: ("Restaurants and Hospitality", None),
    4: ("SaaS / B2B Software", None),
    5: ("Private Education / Academies / Driving Schools", None),
    6: ("Hotels and Tourism", None),
    7: ("B2B Industrial Companies", None),
    8: ("Wholesale Distributors", None),
}


def plan():
    """Devuelve una lista de (tabla, id, patch)."""
    ops = []

    ops.append(("company_info", 1, COMPANY))

    for i, (segment, desc) in TARGET_AUDIENCE.items():
        ops.append(("target_audience", i, {"segment": segment, "description": desc}))

    services = req("GET", "/services?select=*")
    for s in services:
        patch = {}
        en_name = SERVICE_NAMES.get(s["name"])
        if en_name and en_name != s["name"]:
            patch["name"] = en_name
        en_cat = SERVICE_CATEGORIES.get(s["category"])
        if en_cat and en_cat != s["category"]:
            patch["category"] = en_cat
        en_desc = SERVICE_DESCRIPTIONS.get(s["id"])
        if en_desc and en_desc != s["description"]:
            patch["description"] = en_desc
        if patch:
            ops.append(("services", s["id"], patch))

    for i, role in TEAM_ROLES.items():
        ops.append(("team_members", i, {"role": role}))

    for i, (sector, case) in CLIENTS.items():
        patch = {"sector": sector, "case_study": case}
        if i in CLIENT_LOCATIONS:
            patch["location"] = CLIENT_LOCATIONS[i]
        ops.append(("clients", i, patch))

    for i, (ptype, desc) in PARTNERS.items():
        ops.append(("partners", i, {"type": ptype, "description": desc}))

    for i, (name, desc) in INDUSTRIES.items():
        ops.append(("industries", i, {"name": name, "description": desc}))

    # industry_services.service_name debe seguir a services.name
    links = req("GET", "/industry_services?select=*")
    for link in links:
        en = SERVICE_NAMES.get(link["service_name"])
        if en and en != link["service_name"]:
            ops.append(("industry_services", link["id"], {"service_name": en}))

    return ops


def main():
    apply_changes = "--apply" in sys.argv
    ops = plan()

    print(f"{len(ops)} filas a actualizar\n")
    by_table = {}
    for table, row_id, patch in ops:
        by_table.setdefault(table, 0)
        by_table[table] += 1
    for table, n in by_table.items():
        print(f"  {table}: {n}")

    if not apply_changes:
        print("\n--dry-run: no se ha escrito nada. Usa --apply para aplicar.")
        for table, row_id, patch in ops[:5]:
            print(f"\n{table} #{row_id}")
            for k, v in patch.items():
                print(f"  {k} = {json.dumps(v, ensure_ascii=False)[:110]}")
        return

    print()
    failed = 0
    for table, row_id, patch in ops:
        try:
            req("PATCH", f"/{table}?id=eq.{row_id}", patch, prefer="return=minimal")
        except Exception as e:
            failed += 1
            print(f"  ERROR {table} #{row_id}: {e}")
    print(f"Hecho. {len(ops) - failed} filas actualizadas, {failed} errores.")


if __name__ == "__main__":
    main()
