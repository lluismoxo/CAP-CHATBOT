# CAP Chatbot y contacto

Next.js 16, React 19, Supabase y OpenAI. Despliegue de producción desde `main` en Vercel: https://capchatbotfinal.vercel.app.

## Comprobación

```sh
npm ci
npm test
npm run lint
npm run build
npm run test:integration
```

La integración usa exclusivamente un servidor Supabase simulado en localhost y datos ficticios. Requiere el build previo. No envía correos ni escribe en producción.

## Configuración del servidor

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto existente. Se usa únicamente desde el servidor.
- `SUPABASE_SERVICE_ROLE_KEY`: secreto del servidor para contexto público, cuotas y contacto. Nunca exponer en el navegador.
- `OPENAI_API_KEY`: secreto del proveedor IA.
- `OPENAI_MODEL`: modelo opcional, por defecto `gpt-4o-mini`.
- `ADMIN_API_TOKEN`: opcional para `GET /api/leads`; sin configurar, siempre deniega el acceso. No necesario para la web.

La antigua clave anónima y `ALLOWED_ORIGINS` ya no se usan. La lista de dominios permitidos está en `lib/security.ts`; los dominios de desarrollo solo funcionan fuera de producción. No registrar secretos ni cuerpos de consultas en logs.

## Flujo y privacidad

`POST /api/chat` admite solo mensajes user/assistant, hasta 20 mensajes, 2.000 caracteres por mensaje y 12.000 por historial. El servidor controla el prompt, consulta campos explícitos de las tablas públicas de conocimiento (caché 5 minutos) y llama a OpenAI, con máximo 600 tokens de respuesta y timeout. No conserva conversaciones ni extrae datos personales. Los registros anteriores permanecen para que el titular gestione su conservación y derechos; no se borran automáticamente.

`POST /api/contact` exige consentimiento explícito, valida tipos/longitudes, detecta honeypot, limita peticiones y guarda exclusivamente nombre, empresa, email, mensaje, origen y evidencia de consentimiento. CORS permite los orígenes de CAP. Los webhooks existentes de la base de datos siguen funcionando. La clave anónima del navegador no debe tener INSERT en `clientes_web` una vez migrado el formulario.

`GET /api/leads` requiere token de administrador con comparación constante. `POST /api/leads` está eliminado. Todas las API responden sin caché y con errores genéricos.

## Cuotas persistentes

La función SQL `cap_check_rate_limits` y la tabla privada de contadores están en la migración del repositorio CAP. Los identificadores IP/email se derivan con HMAC y caducan en un máximo de 24 horas. El borrado de contadores vencidos se realiza en la siguiente petición, por lo que los registros pueden permanecer físicamente hasta entonces. La función solo puede ejecutarla service_role. Ante indisponibilidad de las cuotas, las API fallan de forma cerrada.

- Chat: 10/minuto, 50/hora y 200/día por IP; 1.000/día globales.
- Contacto: 3/15 minutos y 10/día por IP; 3/día por email; 100/día globales.

Se usan ventanas fijas. Una IP compartida comparte cuota; los límites globales protegen costes pero un abuso puede consumir la cuota disponible. Origin es una defensa del navegador, no autenticación. Mantener límites de gasto y vigilancia de consumo del proveedor. La aplicación no tiene herramientas que ejecuten acciones por instrucciones del modelo; no se promete inmunidad a prompt injection.

## Interfaz y cabeceras

La web CAP integra el asistente después del permiso opcional del visitante. CSP con nonce dinámico, lista restringida de frame-ancestors, HSTS, nosniff, permisos de navegador limitados y noindex en todo el proyecto del chatbot. El dominio principal conserva su indexación independiente. El widget genérico `public/widget.js` carga solo al abrir; cada web que lo integre debe gestionar sus propios avisos y permisos.
