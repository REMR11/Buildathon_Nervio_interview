# Guion de demo en vivo — Nervio (~10 min)

Guion para presentar Nervio frente al jurado. Cada bloque indica el **criterio de la rúbrica** que cubre, qué mostrar y cuánto tiempo dedicarle.

## Cuentas de prueba

Se crean con `pnpm db:seed`, que es idempotente y se puede correr las veces que haga falta.

| Rol | Correo | Contraseña | Qué tiene |
| --- | --- | --- | --- |
| Usuario (principal) | `demo@nervio.dev` | `Nervio#2026` | 5 entrevistas finalizadas con reporte, 1 cita próxima y 3 tickets de soporte |
| Usuario (secundario) | `qa@nervio.dev` | `Nervio#2026` | 1 ticket abierto |
| Administrador | `admin@nervio.dev` | `Nervio#2026` | Panel `/admin`, gestión de usuarios y bandeja de soporte |

Entrevistas sembradas para `demo@nervio.dev`:

| Rol | Tipo | Hace | Puntaje global |
| --- | --- | --- | --- |
| Frontend Developer | técnica | reciente | 82 |
| Backend Developer Node.js | técnica | 21 días | 74 |
| Product Designer | RR. HH. | 14 días | 81 |
| Data Analyst | general | 7 días | 88 |
| Full Stack Developer | modo estrés | 3 días | 69 |

Las entrevistas sembradas no tienen grabación de audio. No inventamos audios, y las conversaciones reales en ElevenLabs ya pasaron la retención de 14 días. Para mostrar la grabación, haz una entrevista en vivo.

## Guion (10 min)

| # | Min | Criterio de la rúbrica | Qué mostrar |
| --- | --- | --- | --- |
| 1 | 0:00–0:45 | **Repositorio y ramas** | GitHub: ramas `main`, `develop` y `feature/*`; merges `--no-ff` en el historial (`git log --graph --oneline`); ver [CONTRIBUTING.md](../CONTRIBUTING.md). |
| 2 | 0:45–1:30 | **README / documentación** | `README.md` raíz y `frontend/README.md`: instalación, variables, seed, scripts, despliegue. |
| 3 | 1:30–2:45 | **Autenticación y roles** | Registro con validaciones (correo inválido, contraseña corta) → login con `demo@nervio.dev`. Intentar abrir `/admin` como usuario → redirige o deniega el acceso. Cerrar sesión y entrar como `admin@nervio.dev`. |
| 4 | 2:45–3:45 | **Gestión de usuarios** | `/admin`: listar y buscar usuarios, cambiar rol, banear y desbanear (usar `qa@nervio.dev`, nunca la propia cuenta). |
| 5 | 3:45–6:00 | **Flujo principal: entrevista** | Como demo: `/interview/setup` → elegir rol, nivel y tipo → entrevista por voz con Nova (30–60 s) → finalizar → reporte con puntajes, fortalezas y debilidades, transcripción y feedback por respuesta. Luego `/interview/reports`: historial con las 5 entrevistas sembradas y `/interview/schedules` con la cita próxima. |
| 6 | 6:00–7:00 | **Soporte** | `/support/new`: crear un ticket (probar el envío vacío para ver la validación). Como admin, `/admin/support`: cambiar estado y prioridad y responder. |
| 7 | 7:00–8:15 | **Tiempo real (2 ventanas)** | Ventana A (normal): `demo@nervio.dev` en `/support/[ticketId]`. Ventana B (incógnito): `admin@nervio.dev` en `/admin/support/[ticketId]` del mismo ticket. Responder en B y ver el mensaje aparecer en A sin recargar (SSE); cambiar el estado en B y ver cómo se actualiza en A. |
| 8 | 8:15–9:00 | **Estados de error y validación** | Formularios con campos inválidos, URL inexistente (página 404 real), `/interview/<uuid-falso>/report` → 404 y API sin sesión → `401` en Postman. |
| 9 | 9:00–10:00 | **Postman** | Importar `nervio-api.postman_collection.json` + `nervio-api.postman_environment.json`; ejecutar Login → endpoints protegidos y de admin; mostrar `pnpm check:api` (38 requests, 0 faltantes). |

## Plan B

**Si falla ElevenLabs o el micrófono:**

1. Poner `NEXT_PUBLIC_USE_MOCK_INTERVIEW="true"` en `frontend/.env` (o en las variables de Vercel) y reiniciar el servidor o volver a desplegar. La entrevista usa preguntas simuladas locales, sin voz.
2. Si tampoco se puede reiniciar, saltar directo a `/interview/reports` y abrir el reporte de **Data Analyst** (88, el mejor ejemplo) y el de **Full Stack** (modo estrés, muestra debilidades). Ambos tienen transcripción y feedback por respuesta.

**Si falla la red o Vercel:**

- Correr en local: `cd frontend && pnpm build && pnpm start` y usar `http://localhost:3000`. Se necesita una conexión a Supabase; en caso extremo, usar el hotspot del celular.
- Tener capturas o un video corto grabado de antemano del flujo de entrevista con voz.

**Si falla el tiempo real:** recargar la ventana A para mostrar que los datos persisten; explicar el endpoint SSE `/api/realtime/support/[ticketId]`.

## Checklist antes de la demo

- [ ] `main` desplegado en Vercel y la URL abre sin errores.
- [ ] Variables en Vercel (Production):
  - Base de datos: `DATABASE_URL` / `POSTGRES_URL`, `DIRECT_URL`
  - Auth y URLs: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` y `NEXT_PUBLIC_APP_URL`. Las URLs deben ser la del dominio de Vercel.
  - ElevenLabs: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_VOICE_ID`
  - Supabase Storage: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_RECORDINGS_BUCKET`
  - Correo y cron: `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`
  - `NEXT_PUBLIC_USE_MOCK_INTERVIEW`: sin definir o `false` (activarla solo como plan B).
- [ ] `pnpm db:seed` corrido contra la base de producción; la cita demo se re-programa sola si ya pasó.
- [ ] Login probado con las 3 cuentas.
- [ ] Micrófono y audio probados en el navegador de la demo; permisos de autoplay activos.
- [ ] Ventana normal + ventana incógnito listas para la demo de tiempo real.
- [ ] Postman con la colección y el entorno importados, y `baseUrl` apuntando a la URL desplegada.
- [ ] Pestañas abiertas: GitHub (ramas), README, app y Postman.
- [ ] Plan B probado: `NEXT_PUBLIC_USE_MOCK_INTERVIEW=true` en local.
