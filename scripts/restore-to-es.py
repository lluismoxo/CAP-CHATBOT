#!/usr/bin/env python3
"""
Devuelve el contenido del chatbot CAP al espanol, a partir del backup que se
hizo antes de traducirlo al ingles (backup-es-2026-08-02/).

Uso:
    SUPABASE_SERVICE_KEY=... python3 scripts/restore-to-es.py --dry-run
    SUPABASE_SERVICE_KEY=... python3 scripts/restore-to-es.py --apply

Solo restaura columnas de texto y solo en las filas que existian en el backup.
No toca filas creadas despues, ni `conversations`, `messages` o `leads`.
Es idempotente: se puede reejecutar sin efectos raros.
"""
import json
import os
import sys
import urllib.request

URL = os.environ.get("SUPABASE_URL", "https://dzslnlqylsnxotnidfhi.supabase.co") + "/rest/v1"
KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
BACKUP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backup-es-2026-08-02")

if not KEY:
    sys.exit("Falta SUPABASE_SERVICE_KEY en el entorno.")

# Columnas de texto que se tradujeron al ingles, por tabla.
TEXT_COLS = {
    "company_info": ["full_name", "sector", "location", "value_proposition", "metrics",
                     "instagram", "headquarters", "entry_offer", "philosophy",
                     "what_they_dont_do", "values", "tech_stack"],
    "target_audience": ["segment", "description"],
    "services": ["name", "category", "description"],
    "team_members": ["role"],
    "clients": ["sector", "location", "case_study"],
    "partners": ["type", "description"],
    "industries": ["name", "description"],
    "industry_services": ["service_name"],
}


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


def plan():
    ops = []
    for table, cols in TEXT_COLS.items():
        path = os.path.join(BACKUP, table + ".json")
        if not os.path.exists(path):
            print(f"  aviso: sin backup de {table}, se omite")
            continue
        rows = json.load(open(path, encoding="utf-8"))
        current = {r["id"]: r for r in req("GET", f"/{table}?select=*")}
        for old in rows:
            rid = old.get("id")
            if rid is None or rid not in current:
                continue
            patch = {}
            for c in cols:
                if c in old and old[c] != current[rid].get(c):
                    patch[c] = old[c]
            if patch:
                ops.append((table, rid, patch))
    return ops


def main():
    apply_changes = "--apply" in sys.argv
    ops = plan()

    by_table = {}
    for table, _, _ in ops:
        by_table[table] = by_table.get(table, 0) + 1
    print(f"\n{len(ops)} filas a restaurar al espanol\n")
    for t, n in by_table.items():
        print(f"  {t}: {n}")

    if not apply_changes:
        print("\n--dry-run: no se ha escrito nada. Usa --apply para aplicar.")
        for table, rid, patch in ops[:4]:
            print(f"\n{table} #{rid}")
            for k, v in patch.items():
                print(f"  {k} = {json.dumps(v, ensure_ascii=False)[:100]}")
        return

    print()
    failed = 0
    for table, rid, patch in ops:
        try:
            req("PATCH", f"/{table}?id=eq.{rid}", patch, prefer="return=minimal")
        except Exception as e:
            failed += 1
            print(f"  ERROR {table} #{rid}: {e}")
    print(f"Hecho. {len(ops) - failed} filas restauradas, {failed} errores.")


if __name__ == "__main__":
    main()
