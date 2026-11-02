# Nervio — App (Frontend + API)

Nervio es un simulador de entrevistas técnicas con IA y voz en tiempo real. Esta aplicación
**Next.js (App Router)** es un monolito modular full-stack: contiene la interfaz de usuario y, a la
vez, el backend como **Route Handlers** (`src/app/api/*`). La voz en tiempo real se delega a
**ElevenLabs** (WebSocket) y la persistencia a **PostgreSQL** mediante **Prisma ORM**.

> Entrega **Fase 3 — Implementación y Despliegue del MVP (Sprint 1)**.

## 1. Prerrequisitos

| Herramienta | Versión recomendada | Notas |
|-------------|---------------------|-------|
| Node.js     | ≥ 20 (probado en 20/22/24) | Runtime de Next.js 16 / React 19 |
| pnpm        | ≥ 9                 | Gestor de paquetes (hay `pnpm-lock.yaml`) |
| PostgreSQL  | ≥ 14 (Supabase o local) | Base de datos relacional |
| Cuenta ElevenLabs | ConvAI + TTS   | Agente conversacional y síntesis de voz |
| Cuenta Resend (opcional) | —        | Correos de confirmación y recordatorio de citas |

## 2. Instalación

```bash
cd frontend
pnpm install          # instala dependencias y ejecuta `prisma generate` (postinstall)
cp .env.example .env  # y completa los valores (ver sección 3)
```

## 3. Variables de entorno

Copia `.env.example` a `.env` y completa los valores. Estructura principal:

| Variable | Obligatoria | Descripción |
|----------|:----------:|-------------|
| `POSTGRES_URL` / `DATABASE_URL` | ✅ | Cadena de conexión en runtime (Supabase pooler, puerto 6543). |
| `DIRECT_URL` | ✅ | Conexión directa (puerto 5432) usada por las migraciones Prisma. |
| `BETTER_AUTH_SECRET` | ✅ | Secreto de sesión (`openssl rand -base64 32`). |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL` | ✅ | URL base de autenticación. |
| `ELEVENLABS_API_KEY` | ✅* | API key del servidor (nunca usar prefijo `NEXT_PUBLIC_`). |
| `ELEVENLABS_AGENT_ID` / `ELEVENLABS_VOICE_ID` | ✅* | Agente ConvAI y voz TTS. |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL pública (enlaces de los correos de citas). |
| `RESEND_API_KEY` / `EMAIL_FROM` | ➖ | Envío de correos (si vacío, se omite el correo sin romper el flujo). |
| `N8N_WEBHOOK_*` | ➖ | Webhooks opcionales; si faltan, se usa el fallback local de preguntas. |
| `CRON_SECRET` | ➖ | Bearer que protege `GET /api/cron/reminders`. |
| `NEXT_PUBLIC_USE_MOCK_INTERVIEW` | ➖ | `true` para probar sin ElevenLabs (modo mock local). |

\* Opcional solo si corres en modo mock (`NEXT_PUBLIC_USE_MOCK_INTERVIEW=true`).

## 4. Base de datos: creación y datos de prueba

Las migraciones Prisma son el **DDL** del proyecto (`prisma/migrations/`).

```bash
# Aplica el esquema a la base de datos (crea tablas, índices y relaciones)
pnpm db:migrate          # = prisma migrate deploy
#   en desarrollo puedes usar:  pnpm exec prisma migrate dev

# Carga usuarios de prueba y una entrevista de ejemplo (idempotente)
pnpm db:seed             # = tsx prisma/seed.ts
```

El seed (`prisma/seed.ts`) crea credenciales válidas vía Better Auth:

| Usuario | Correo | Contraseña |
|---------|--------|-----------|
| Candidata Demo | `demo@nervio.dev` | `Nervio#2026` |
| Candidato QA   | `qa@nervio.dev`   | `Nervio#2026` |
| Admin Nervio (rol `admin`) | `admin@nervio.dev` | `Nervio#2026` |

### Roles y control de acceso

- Plugin **admin** de Better Auth: columna `user.role` (`user` por defecto, `admin`) y baneo
  (`banned`, `banReason`, `banExpires`). Migración `20261102020000_admin_roles`.
- API: `requireRole("admin")` en `src/lib/require-role.ts` → `401` sin sesión, `403` sin rol o baneado.
  El rol `admin` hereda los permisos de `user`.
- Páginas: `/admin` (listado de usuarios) protegida en `src/proxy.ts` (cookie) y validada en servidor
  con `requireAdminPage()`; un usuario sin rol admin ve 404.
- Endpoints admin: `GET /api/admin/users` y los del plugin `POST /api/auth/admin/set-role`,
  `ban-user`, `unban-user`, `remove-user`, `GET /api/auth/admin/list-users` (ver colección Postman, carpeta *Admin*).

### Gestión de usuarios

- `GET /api/users/me` y `PATCH /api/users/me` (nombre, foto; validado con zod) → página `/profile`.
- `/admin`: cambiar rol (user ⇄ admin) y bloquear/desbloquear usuarios con las APIs del plugin admin,
  con estados de carga, error y éxito. Un admin no puede modificarse a sí mismo desde el panel.

### Soporte (tickets)

- Usuario: `/support` (mis tickets), `/support/new` (formulario validado), `/support/[id]` (hilo + respuesta).
- API: `GET/POST /api/support`, `GET /api/support/[id]`, `POST /api/support/[id]/replies`.
  Solo el dueño o un admin ven/responden un ticket (otros reciben 404). Responder un ticket cerrado → 409.
- Admin: `/admin/support` (filtro por estado) y `/admin/support/[id]`; `GET /api/admin/support?status=open`,
  `PATCH /api/admin/support/[id]` con `{ "status": "open|in_progress|closed", "priority": "low|normal|high" }`.
  Una respuesta del staff a un ticket abierto lo pasa a `in_progress`.
- `POST /api/support`: `priority` es opcional (por defecto `normal`, nivel medio; se acepta `medium` como alias).
- El seed crea 3 tickets de ejemplo (demo y qa, con respuestas del admin); es idempotente.

Además inserta una entrevista finalizada con preguntas, respuestas, evaluación (reporte) y una
cita futura, para revisar historial, reporte y agenda sin grabar una entrevista completa.

> Reinicio total de la base (¡borra datos!): `pnpm db:reset`.

### Tiempo real

La app usa **dos canales en tiempo real independientes**:

1. **Voz (ElevenLabs, WebRTC)**: la entrevista en vivo. El navegador pide un token
   firmado a `GET /api/elevenlabs/token` (la API key nunca llega al cliente) y abre la
   sesión de audio bidireccional directamente con ElevenLabs.
2. **Eventos de la app (SSE)**: notificaciones del servidor al navegador con
   `EventSource`; el sentido cliente → servidor usa los endpoints REST normales
   (responder, cambiar estado). Endpoints:
   - `GET /api/realtime/support/[ticketId]` → eventos `reply` (nueva respuesta) y
     `ticket` (cambio de estado/prioridad). Lo usan `/support/[id]` y `/admin/support/[id]`.
   - `GET /api/realtime/interview/[sessionId]` → `report.pending` y `report.ready`
     (cierra el stream). Lo usan `/interview/[id]/ended` y el reporte si aún no está listo;
     mientras espera, el servidor reintenta el análisis de ElevenLabs.

**Por qué SSE y no Supabase Realtime**: no requiere exponer la anon key de Supabase
(`NEXT_PUBLIC_SUPABASE_*` no existe en este proyecto) ni políticas RLS sobre
`realtime.messages`. La autorización es la misma sesión de better-auth: cada stream
valida dueño/admin al conectar (401 sin sesión, 404 si el recurso es ajeno), así que
nunca se reciben eventos de otros usuarios. Es stateless y compatible con Vercel: el
servidor consulta la BD cada 2–3 s, cierra el stream a los ~50 s (`maxDuration = 60`) y
`EventSource` se reconecta enviando `Last-Event-ID` para no perder respuestas.
No necesita variables de entorno nuevas.

### Subida de CV (RF-CV-01 / RF-CV-02)

En `/interview/setup` el candidato puede adjuntar su CV (opcional) para que Nova
personalice las preguntas:

- **Formatos:** PDF o DOCX, máx. **5 MB** y **10 páginas**. El tipo se valida por
  *magic bytes* (`%PDF-` / ZIP con `word/`), no solo por la extensión → `415` si no coincide.
- **Extracción:** `unpdf` (PDF) y `mammoth` (DOCX); el texto se limpia y se recorta a
  **8000 caracteres**. Un PDF escaneado o sin texto devuelve `422` con un mensaje claro.
- **Vista previa editable:** el candidato corrige el texto antes de iniciar; se envía como
  `cvText` y se agrega al contexto de Nova (`buildContext()`) y al `extra_context` de n8n.
  Puede reutilizar su **último CV** con un clic. La tarjeta muestra una **miniatura de la
  primera página** (pdfjs-dist en el navegador; worker copiado a `public/` en `postinstall`);
  los DOCX muestran un ícono con el nombre.
- **Almacenamiento:** el archivo va al bucket **privado** `cvs` de Supabase Storage
  (`<userId>/<cvId>.pdf|docx`), que se crea solo con la service role. Si falta
  `SUPABASE_SERVICE_ROLE_KEY`, el texto se extrae y se guarda igual (sin archivo) y la UI
  avisa que el original no se guardó.
- **API:** `POST /api/cv` (multipart, campo `file`), `GET /api/cv` (últimos 5),
  `GET|DELETE /api/cv/[cvId]` y `GET /api/cv/[cvId]/file` (archivo original inline, para la miniatura y abrirlo en otra pestaña). Solo el dueño: un CV ajeno devuelve `404`. Límite de
  5 subidas/min y 20/día por usuario (`429`).
- **BD:** tabla `candidate_cvs` + columna nullable `interview_sessions.cv_id`
  (migración aditiva `20261102040000_candidate_cvs`).

## 5. Ejecución en local

```bash
pnpm dev     # http://localhost:3000
```

Recorrido del MVP: **Registro → Login → Configurar entrevista → Entrevista en vivo →
Reporte → Historial → Agendar**.

## 6. Pruebas manuales de la API

Importa `../nervio-api.postman_collection.json` (raíz del repo) en Postman / Thunder Client /
Insomnia. Autentica con **Auth → Sign In** (la cookie de sesión queda en el cookie jar) y luego
ejecuta los endpoints de entrevista y agenda. Detalle en el documento de la Fase 3.

- Importa también `../nervio-api.postman_environment.json` (variables `baseUrl`, `sessionId`,
  `scheduleId`, `ticketId`, `userId`, `shareToken`, `cronSecret`).
- La colección cubre todas las rutas de `src/app/api`; `pnpm check:api` lo verifica (falla si
  se agrega una ruta sin su request en Postman).

## 7. Scripts disponibles

| Script | Acción |
|--------|--------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | `prisma generate && next build` |
| `pnpm start` | Servidor de producción |
| `pnpm lint` | Linter (Biome) |
| `pnpm format` | Formateo (Biome) |
| `pnpm db:migrate` | Aplica migraciones |
| `pnpm db:seed` | Siembra datos de prueba |
| `pnpm db:reset` | Reinicia la base y re-migra |

## 8. Despliegue (Vercel)

- **Build command:** `prisma generate && next build` · **Install:** `pnpm install`.
- **Variables de entorno:** las de la sección 3 (usar `DIRECT_URL` para migraciones y
  `POSTGRES_URL` para runtime).
- **Cron:** `vercel.json` programa `GET /api/cron/reminders` cada minuto (protegido por
  `CRON_SECRET`) para enviar recordatorios de citas.
- **Base de datos:** PostgreSQL gestionado (Supabase). Ejecutar `prisma migrate deploy` contra
  `DIRECT_URL` en el pipeline de despliegue.

## 9. Estructura relevante

```
frontend/
├── src/app/                 # Páginas (UI) + API Route Handlers (/api/*)
│   ├── api/auth/            # Better Auth (registro, login, sesión)
│   ├── api/interview/       # start, messages, end, report, schedule
│   └── api/elevenlabs/      # token efímero para WebSocket
├── src/lib/                 # Dominio: auth, prisma, interview/*, email/*
├── prisma/                  # schema.prisma, migrations/, seed.ts
└── src/components/          # UI (shadcn/base-ui), entrevista, layout
```
