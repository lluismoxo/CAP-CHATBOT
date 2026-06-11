# CAP Chatbot

Chatbot RAG para **CAP — Consultoría Adaptativa Pymes**. Next.js 15 (App Router) + Supabase + OpenAI.

- Inyecta contexto completo de CAP (servicios, equipo, casos de éxito, filosofía) desde Supabase en el system prompt.
- Detecta automáticamente datos de lead (nombre, email, teléfono, empresa, sector, intereses) en los mensajes del usuario y los guarda en la tabla `leads`.
- UI minimalista blanco/azul/negro.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 + TailwindCSS |
| Backend | Next.js API Routes (Node runtime) |
| LLM | OpenAI (`gpt-4o-mini` por defecto) |
| Base de datos | Supabase (Postgres + RLS) |
| Deploy | Vercel |

---

## 1. Variables de entorno

Copia `.env.local.example` a `.env.local`:

```bash
cp .env.local.example .env.local
```

| Variable | Dónde se obtiene | Obligatoria |
|----------|-----------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` / publishable | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (¡secreta!) | Sí (para escribir leads/conversaciones) |
| `OPENAI_API_KEY` | platform.openai.com → API Keys | Sí (en producción; sin ella el chat responde con fallback) |
| `OPENAI_MODEL` | Modelo OpenAI a usar | No (default `gpt-4o-mini`) |
| `ADMIN_API_TOKEN` | Token cualquiera que invente usted | No (solo si quiere acceder a `GET /api/leads`) |
| `ALLOWED_ORIGINS` | Lista CSV de origins permitidos | No (default: capconsultor.eu + dominio Vercel + localhost) |

## Seguridad anti-abuso

`POST /api/chat` aplica capas defensa:

1. **Origin check**: solo acepta requests desde dominios en `ALLOWED_ORIGINS` (en producción).
2. **Rate limit por IP** (in-memory):
   - 10 mensajes/minuto
   - 50 mensajes/hora
   - 200 mensajes/día
3. **Validación entrada**:
   - Max 2000 chars por mensaje
   - Max 30 mensajes por request
   - Max 20000 chars totales en histórico
4. **Sanitización prompt injection**: bloquea patrones tipo "ignore previous instructions".
5. **OpenAI**: `max_tokens: 600` cap por respuesta.

**Recomendado además:** configurar **hard limit mensual** en https://platform.openai.com/account/limits (ej. 20 USD/mes) como red de seguridad final.

> El proyecto Supabase ya está creado: **CAP CHATBOT** (`mhsphyvehhmkyvartsrr`). El esquema y los datos seed ya están aplicados.

---

## 2. Instalación local

```bash
npm install
npm run dev
```

Abrir <http://localhost:3000>.

---

## 3. Esquema Supabase

Tablas ya creadas:

- `company_info` — datos de identidad, contacto, filosofía.
- `target_audience` — segmentos de cliente objetivo.
- `services` — catálogo de servicios.
- `team_members` — equipo.
- `clients` — casos de éxito.
- `partners` — socios y colaboradores.
- `leads` — leads capturados desde el chat (clave: `email` indexada).
- `conversations` — una por sesión de chat.
- `messages` — historial de cada conversación.

Las tablas de info pública tienen `RLS` con policy `public_read_*`.
Las tablas `leads`, `conversations`, `messages` solo son accesibles desde el backend con la `SUPABASE_SERVICE_ROLE_KEY` (no tienen policies para anon, por seguridad).

---

## 4. Cómo funciona el RAG

1. En cada petición `POST /api/chat`:
   - Se obtiene/crea la conversación por `sessionId` (UUID guardado en `localStorage`).
   - Se guarda el mensaje del usuario en `messages`.
   - Se ejecuta `extractLeadInfo(text)` sobre el mensaje del usuario y, si detecta señales (email, teléfono, nombre, empresa, interés, pain points…), se hace `upsert` en `leads` y se vincula la conversación.
   - Se carga (con caché de 5 min) todo el contexto de CAP desde Supabase y se inyecta en el system prompt.
   - Se llama a OpenAI con los mensajes históricos del usuario.
   - Se guarda la respuesta del asistente y se devuelve al cliente.

Si `OPENAI_API_KEY` no está configurada, el endpoint devuelve un mensaje fallback amistoso (e igualmente guarda el mensaje y extrae el lead).

---

## 5. Endpoints

### `POST /api/chat`

```json
{
  "sessionId": "uuid-cliente",
  "messages": [
    { "role": "user", "content": "Hola, soy Marcos de Pyme XYZ" }
  ]
}
```

Respuesta:
```json
{ "reply": "...", "conversationId": "uuid", "configured": true }
```

### `GET /api/leads` (admin)

Cabecera `x-admin-token: <ADMIN_API_TOKEN>`. Devuelve los últimos 200 leads.

### `POST /api/leads`

Crear lead manualmente. No requiere auth (puedes proteger si quieres).

---

## 6. Deploy en Vercel

1. Sube el repo a GitHub.
2. En Vercel → **New Project** → importa el repo.
3. En **Environment Variables** añade:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marcar como secret)
   - `OPENAI_API_KEY` (cuando la tengas)
   - `OPENAI_MODEL` (opcional)
   - `ADMIN_API_TOKEN` (opcional)
4. Deploy. La región está fijada a `fra1` (Frankfurt) para minimizar latencia con Supabase `eu-west-1`.

---

## 7. Añadir la OpenAI API key más tarde

Cuando obtengas la key:

- **Local:** edita `.env.local` con `OPENAI_API_KEY=sk-...` y reinicia `npm run dev`.
- **Producción (Vercel):** Project → Settings → Environment Variables → añade `OPENAI_API_KEY` → redeploy.

No hace falta tocar código. Mientras tanto el bot responde con un fallback pero los leads se siguen guardando.

---

## 8. Personalización

- **Tono/instrucciones del bot:** editar `SYSTEM_PROMPT_TEMPLATE` en `app/api/chat/route.ts`.
- **Detectores de lead:** ampliar regex/keywords en `lib/leadExtractor.ts`.
- **Colores marca:** `tailwind.config.js` (`capblue`).
- **Datos CAP:** se editan directamente en Supabase (Table Editor) — el bot los recoge automáticamente (caché 5 min).
