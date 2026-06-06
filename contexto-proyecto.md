# CAP Chatbot — Contexto de proyecto

Última actualización: 2026-06-06

## Resumen ejecutivo
Chatbot RAG para CAP Consultor. Next.js 16 (App Router) + Supabase + OpenAI, deploy en Vercel. Inyecta contexto completo de CAP en el system prompt, detecta info de leads en mensajes y los persiste en Supabase. UI minimalista blanco/azul/negro. Pendiente de aportar la `OPENAI_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` para activar el bot en producción.

## Estado técnico
- **Supabase**: proyecto `CAP CHATBOT` (`mhsphyvehhmkyvartsrr`, eu-west-1). Schema aplicado con tablas:
  - Info pública: `company_info`, `target_audience`, `services`, `team_members`, `clients`, `partners` (RLS + policy lectura pública).
  - Privadas (solo backend service_role): `leads`, `conversations`, `messages`.
  - Datos seed insertados con toda la información facilitada del 06-06-2026.
- **Frontend**: `app/page.tsx` + `components/Chat.tsx`. Tailwind config con color `capblue` (#1E4DD8). Sesión persistida en `localStorage` como UUID.
- **Backend**: 
  - `POST /api/chat` → carga contexto Supabase (caché 5 min) + OpenAI completion (`gpt-4o-mini` default) + persiste mensajes y extrae leads.
  - `GET/POST /api/leads` → CRUD básico de leads (GET protegido con `ADMIN_API_TOKEN`).
  - `lib/leadExtractor.ts` → regex/keywords para email, teléfono, nombre, empresa, rol, sector, tamaño, interés (10 categorías), pain points, budget, timeline.
- **Build verificado**: `npm run build` OK con Next 16.2.7.

## Decisiones
- Sin embeddings — contexto CAP entero cabe en system prompt (decisión del usuario por simplicidad y coste).
- LLM: OpenAI (no Anthropic). Key vacía por ahora, fallback amistoso si no está configurada.
- Stack unificado Next.js full-stack en lugar de FastAPI + React separado.
- Región Vercel fijada a `fra1` (Frankfurt) para minimizar latencia con Supabase eu-west-1.
- RLS: tablas info públicas SELECT abierto, tablas privadas sin policies (solo service_role).

## Pendiente
- [ ] Usuario debe añadir `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → service_role) en `.env.local` y Vercel.
- [ ] Usuario debe añadir `OPENAI_API_KEY` cuando la obtenga.
- [ ] Subir repo a GitHub + conectar a Vercel.
- [ ] (Opcional) Panel admin para visualizar leads en lugar de hacer GET con curl.
- [ ] (Opcional) Streaming de respuestas (actualmente JSON normal).
- [ ] (Opcional) Embed widget para insertar el chat en capconsultor.eu como iframe/script.

## Ubicación
- Código: `/Users/luis/Documents/Claude/Projects/CAP Chatbot/`
- Supabase project ID: `mhsphyvehhmkyvartsrr`
- Supabase URL: `https://mhsphyvehhmkyvartsrr.supabase.co`
