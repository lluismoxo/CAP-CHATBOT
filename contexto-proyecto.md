# CAP Chatbot — Contexto de proyecto

Última actualización: 2026-08-02

## Resumen ejecutivo
Chatbot RAG para CAP Consultor, **en inglés** desde el 02-08-2026. Next.js 16 (App Router) + Supabase + OpenAI, deploy en Vercel. Inyecta contexto completo de CAP en el system prompt, detecta info de leads en mensajes y los persiste en Supabase. UI minimalista blanco/azul/negro. Pendiente de aportar la `OPENAI_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` para activar el bot en producción.

## Estado técnico
- **MIGRACIÓN SUPABASE (02-07-2026)**: las 11 tablas del chatbot migradas del proyecto `CAP CHATBOT` (`mhsphyvehhmkyvartsrr`) al proyecto `CAP` (`dzslnlqylsnxotnidfhi`) — un solo proyecto Supabase para todo. Sin conflictos de nombres (chatbot en inglés, negocio en español). Datos verificados: counts idénticos en las 11 tablas (115 messages, 19 conversations, 0 leads). RLS replicado: knowledge base SELECT anon, tablas operativas deny-by-default (solo service_role). Test en vivo: anon lee `services` OK, `clientes_restauracion` → permission denied, `leads` → vacío. El proyecto viejo `CAP CHATBOT` sigue intacto como backup (NO borrado). `.env.local` y `.env.local.example` actualizados a URL/publishable key de CAP.
- **TRADUCCIÓN A INGLÉS (02-08-2026)**, commit `ce6d0fe`, desplegado y verificado en prod:
  - **Código**: system prompt, `Chat.tsx` (welcome, sugerencias, placeholder, botones), mensajes de error de `/api/chat` y `lib/security.ts`, cabeceras de sección de `lib/context.ts` (van dentro del system prompt), metadata de `layout.tsx` (`lang="en"`), `widget.js` y `test-widget.html`.
  - **`lib/leadExtractor.ts` reescrito**: patrones en inglés + los de español conservados (el bot responde en el idioma del usuario). Dos bugs encontrados y corregidos al probar: el nombre se tragaba la conjunción ("Sarah Johnson and") → guard `NAME_STOP` con lookahead negativo; y "I'm the CEO of Acme" no capturaba empresa → patrón `<rol> of|at <empresa>`. Etiquetas de `interest` ahora en inglés y ampliadas (website, booking, reviews, loyalty).
  - **Supabase traducido en sitio** (decisión del usuario: sobrescribir, no columnas `*_en`): 90 filas en `company_info`, `target_audience`, `services`, `team_members`, `clients`, `partners`, `industries`, `industry_services`. Script idempotente y reejecutable en `scripts/translate-to-en.py` (necesita `SUPABASE_SERVICE_KEY` en el entorno). Backup del español en `backup-es-2026-08-02/` (gitignored, solo local).
  - **Ojo con `industry_services`**: `service_name` es texto libre que replica `services.name`; si se renombra un servicio hay que actualizar ambas tablas o se rompe la recomendación por sector. El script lo mantiene sincronizado y se verificó que no queda ningún huérfano.
  - **Historial NO traducido**: `conversations` (21) y `messages` (123) siguen en español; son registros reales de conversaciones pasadas.
  - Verificado en prod: `/api/chat` responde en inglés con los servicios traducidos, y un lead de prueba en inglés se extrajo correctamente (nombre, email, empresa, tamaño, timeline) y se guardó en `leads`. Datos de prueba borrados después.
- **CSP ampliada (02-08-2026)**: `frame-ancestors` de `next.config.js` ahora incluye `http://localhost:3000/:3001` y `127.0.0.1`, para poder embeber el widget mientras se desarrolla la web nueva en local. `ALLOWED_ORIGINS` de `lib/security.ts` ya contemplaba localhost.
- **Supabase**: proyecto `CAP` (`dzslnlqylsnxotnidfhi`, eu-west-1). Schema aplicado con tablas:
  - Info pública: `company_info`, `target_audience`, `services`, `team_members`, `clients`, `partners` (RLS + policy lectura pública).
  - Privadas (solo backend service_role): `leads`, `conversations`, `messages`.
  - Datos seed insertados con toda la información facilitada del 06-06-2026.
- **Frontend**: `app/page.tsx` + `components/Chat.tsx`. Tailwind config con color `capblue` (#1E4DD8). Sesión persistida en `localStorage` como UUID.
- **Backend**: 
  - `POST /api/chat` → carga contexto Supabase (caché 5 min) + OpenAI completion (`gpt-4o-mini` default) + persiste mensajes y extrae leads.
  - `GET/POST /api/leads` → CRUD básico de leads (GET protegido con `ADMIN_API_TOKEN`).
  - `lib/leadExtractor.ts` → regex/keywords para email, teléfono, nombre, empresa, rol, sector, tamaño, interés (10 categorías), pain points, budget, timeline.
- **Build verificado**: `npm run build` OK con Next 16.2.7.
- **Rediseño widget iframe (11-06-2026)**: eliminados header (logo/título/subtítulo + link capconsultor.eu) y footer (© / contacto). `app/page.tsx` ahora es solo el `<Chat />` a pantalla completa, compacto (`max-w-md`, `h-screen`), pensado para incrustar en una esquina vía iframe. `Chat.tsx`: alturas `vh` sustituidas por `flex-1 min-h-0`. `next.config.js`: cabecera CSP `frame-ancestors 'self' https://capconsultor.eu https://www.capconsultor.eu` para permitir embed solo en dominios CAP.
- **Launcher burbuja flotante**: `public/widget.js` — script self-contained que inyecta burbuja en esquina inf. derecha y abre/cierra el iframe del chat (estilo Intercom). Se integra con `<script src="https://DOMINIO/widget.js" defer></script>`. Configurable vía `window.CAP_WIDGET = {url, color}`. Decisión del usuario (11-06): burbuja en vez de iframe siempre abierto.
- **CHATBOT EN PRODUCCIÓN Y FUNCIONANDO (12-06-2026)**. URL prod: `https://capchatbotfinal.vercel.app`. API `/api/chat` responde con RAG correcto.
- **Bugs resueltos en el deploy**:
  1. Vercel Deployment Protection activado → HTTP 401. Desactivado por el usuario.
  2. Vercel Hobby bloqueaba deploys: commits firmados con email no asociado a GitHub (`luis@MacBook-Air-de-luis.local` y luego `luismoxo.trabajo@gmail.com` que no estaba en la cuenta). Solución: reescritos todos los commits con `lluismoxo@gmail.com` (filter-branch) + force-push. Git config del repo ahora usa ese email.
  3. **Bug raíz del "Connection error"**: la `OPENAI_API_KEY` pegada en Vercel tenía un `\n` al final → "is not a legal HTTP header value". Fix en código: `.trim()` en todas las env keys (`lib/openai.ts`, `lib/supabase.ts`) — robusto aunque se repegue mal.
- **Fix UI scroll/input en iframe (15-06-2026, commit 06895a8)**: `main` usaba `h-screen` (100vh) que dentro del iframe desbordaba en móvil y dejaba el textarea fuera de pantalla → no se podía enviar 2º mensaje. Cambiado a altura encadenada: `html,body{height:100%}` (globals.css) + `main` a `h-full` (page.tsx). El chat llena exacto el iframe; mensajes con scroll, input fijo abajo.
- **Nota mantenimiento**: cualquier commit futuro debe usar `lluismoxo@gmail.com` o el deploy se bloquea (plan Hobby).

## Decisiones
- Sin embeddings — contexto CAP entero cabe en system prompt (decisión del usuario por simplicidad y coste).
- LLM: OpenAI (no Anthropic). Key vacía por ahora, fallback amistoso si no está configurada.
- Stack unificado Next.js full-stack en lugar de FastAPI + React separado.
- Región Vercel fijada a `fra1` (Frankfurt) para minimizar latencia con Supabase eu-west-1.
- RLS: tablas info públicas SELECT abierto, tablas privadas sin policies (solo service_role).

## Pendiente
- [x] **Swap Vercel → proyecto CAP HECHO (03-07-2026)**: el usuario actualizó las env vars en Vercel y el chatbot en prod vuelve a funcionar contra el proyecto `CAP` (verificado: conversación de test aparece en `conversations` de CAP). La migración está 100% completa. El proyecto viejo `CAP CHATBOT` (`mhsphyvehhmkyvartsrr`) queda PAUSADO como backup.
- [ ] (Opcional) Borrar definitivamente el proyecto pausado `CAP CHATBOT` desde el dashboard — decisión del usuario; ya no lo usa nada.
- [ ] Pendiente local: pegar la secret key de CAP en `.env.local` (tiene placeholder) si se quiere probar el chatbot en local.
- [x] `OPENAI_API_KEY` configurada en Vercel — verificado 02-08-2026 (`/api/chat` devuelve `configured: true`).
- [x] Repo en GitHub (`lluismoxo/CAP-CHATBOT`, privado) conectado a Vercel.
- [ ] (Opcional) Panel admin para visualizar leads en lugar de hacer GET con curl.
- [ ] (Opcional) Streaming de respuestas (actualmente JSON normal).
- [ ] **Decidir el destino del widget en la web nueva**: hoy `assets/js/cap-chat.js` de `~/Desktop/CAP FINAL 2` apunta a `https://capchatbotfinal.vercel.app/`. Si la web nueva sustituye a `CAP13` en capconsultor.eu, revisar que el dominio siga en `frame-ancestors`.
- [ ] (Opcional) Limpiar de `conversations`/`messages` el historial en español si ya no aporta.
- [x] Embed widget en capconsultor.eu — HECHO (15-06): `window.CAP_WIDGET.url` apunta a `https://capchatbotfinal.vercel.app/`. La CSP `frame-ancestors` del chatbot ya permite `capconsultor.eu`/`www`, así que el iframe carga en el dominio (no en local/standalone).

## Web pública (capconsultor.eu)
- Repo: `lluismoxo/CAP13` (GitHub Pages, dominio custom vía CNAME `capconsultor.eu`). NO es Vercel → la restricción de email de commit del plan Hobby NO aplica aquí. Archivos: `index.html` (bundle standalone: plantilla HTML + 61 assets base64), `blog.html`, `privacy.html`, `legal.html`, `sitemap.xml`, `robots.txt`, favicons. Local: `/Users/luis/Desktop/CAP13/`.
- **Deploy 15-06-2026**: reemplazada versión vieja por la standalone (3) tras revisión. Cambios:
  1. **Formulario CONTACTO → Supabase CAP** (`dzslnlqylsnxotnidfhi`, tabla `clientes_web`). La standalone venía rota: mandaba `nombre/empresa` y sin `origen`. Arreglado a columnas reales `nombre_contacto/nombre_negocio` + `origen:'web'` (lo exige la RLS policy `anon_can_insert_web_leads`) + validación email. Insert anon probado OK (HTTP 201) con la publishable key `sb_publishable_...`.
  2. **Chatbot**: añadido `window.CAP_WIDGET.url` (ver arriba).
- **Nota encoder bundle**: el `<script type="__bundler/template">` guarda la plantilla como JSON con `</` escapado (p. ej. `<\/`). Para editar: decodificar JSON (línea 180 del index.html; manifest en línea 172), editar, re-encodear con `json.dumps(...).replace('</','<\\/')`. Si se olvida el escape, el parser HTML corta el `<script>` y la web muestra "Error unpacking: Unterminated string in JSON".
- **Mejoras 02-07-2026** (pusheadas 03-07: commits `409352b` + `79848bd`; el segundo elimina duplicados Finder `legal 2.html`/`privacy 2.html` con versiones antiguas):
  1. **Fix móvil**: el shell cargador de `index.html` no tenía `<meta name="viewport">` (solo lo tenía la plantilla interna, que llega tarde) → los móviles usaban layout fallback de 980px: zoom raro, scroll lateral y espacio en blanco. Añadido el meta al shell. Además: `overflow-x: clip` en `html, body` (con fallback `hidden`) y el `<aside class="services-doc" style="width: 1142px">` pasado a `max-width: 1142px`. Verificado con emulación móvil 390px vía CDP: `scrollWidth == innerWidth`, cero elementos desbordando.
  2. **Equipo**: fotos nuevas de Jaume Dalmau y Marcel Partal (sustituidas en el manifest, mismos UUID); añadido 5º integrante Pol Ruiz (Estrategia & Operaciones comerciales, LinkedIn pol-ruiz-prados-42a32b387, asset UUID `dd018409-...`). `.team-grid` a `repeat(5, 1fr)` gap 16px en escritorio (5 en una fila); breakpoints 1024/768/480 intactos.
  3. **Legal**: `terms.html` ELIMINADO (no hay ventas/pagos/cuentas; contenido útil fusionado en el Aviso Legal) — quitados sus enlaces de footers (index, blog, privacy, legal) y del sitemap. `privacy.html`: añadidas cláusulas de menores de 14 años (art. 7 LOPDGDD), análisis interno como finalidad (interés legítimo), sección cookies (no se usan, solo técnicas exentas art. 22.2 LSSI-CE), Supabase como único encargado (art. 28, DPA, eu-west-1), caveat de seguridad no absoluta + arts. 32-34 RGPD. `legal.html`: fusionadas condiciones de uso/responsabilidad/enlaces externos de terms, eliminada sección de propiedad intelectual, declarado que no hay venta online. Quitados los badges "TODO" visibles en producción. **Pendiente legal**: falta NIF y domicilio completo del titular (obligatorios por art. 10 LSSI-CE) — el usuario debe facilitarlos.
- **SEO 03-07-2026** (commit `91c1aaa`): auditoría + implementación. Hallazgo crítico: index.html pesaba 24 MB y Googlebot trunca HTML a ~15 MB → el template del bundle (al final del archivo) quedaba fuera y Google renderizaba página vacía; además todo el meta/OG/JSON-LD vivía dentro del template JSON (invisible para crawlers sin JS como WhatsApp/LinkedIn). Fixes: vídeo demo de 17 MB extraído del manifest a `/assets/demo.mp4` (index.html → 6.9 MB, template en offset 6.8 MB; el manifest quedó en 60 assets), SEO completo replicado en el shell estático (lang, description, robots, canonical, hreflang, geo, OG, Twitter, JSON-LD ProfessionalService+WebSite), noscript con contenido real, blog con ids ancla + enlaces internos + BreadcrumbList, og:image/twitter en legal/privacy, 404.html custom (noindex), sitemap lastmod. Verificado por CDP: página renderiza, vídeo reproduce.
- **Blog + título (03-07-2026, commit `2c8fb20`)**: 6 artículos individuales en `/blog/` (chatbots-ia-para-pymes, automatizar-reservas-clinicas, lead-generation-pymes, automatizacion-restauracion-hosteleria, procesamiento-documentos-ia, errores-automatizar-pyme) con TOC, categorías/tags, enlaces cruzados, relacionados, BlogPosting+BreadcrumbList; blog.html como índice con listado. Título de la home acortado a "CAP Consultor" (petición del usuario para Google) y meta description sustituida por "CAP ofrece servicios de consultoría adaptados a tu empresa…" en shell y template. El snippet malo de Google ("This page requires JavaScript… Error: missing bundle data") era caché de la versión 24 MB; desaparecerá al recrawlear — recomendado pedir reindexación en Search Console.
- **Assets externalizados (03-07-2026, commit `f2f02cb`)**: los 58 assets de imagen/fuente extraídos del manifest base64 a `/assets/{uuid}.{ext}` — index.html pasa de 6.9 MB a **197 KB**. En el manifest solo quedan 2 scripts JS. og:title/twitter:title acortados a "CAP Consultor". El title corto ya se sirve en producción; lo que muestra Google es caché pendiente de recrawl (pedir reindexación en Search Console). Verificado por CDP: 58/58 imágenes, fuentes Space Grotesk/Inter, vídeo, sin errores.
- **Pendiente web**: `blog.html` ya existe en el repo (subido por el usuario).

## Ubicación
- Código: `/Users/luis/Documents/Claude/Projects/CAP Chatbot/`
- Supabase project ID: `dzslnlqylsnxotnidfhi`
- Supabase URL: `https://dzslnlqylsnxotnidfhi.supabase.co`
