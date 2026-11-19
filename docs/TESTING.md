# Plan de pruebas — Nervio (Fase 4)

Pruebas **unitarias** y de **integración** automatizadas del monolito Next.js en `frontend/`. E2E y BDD quedan fuera de esta entrega.

Rama de trabajo: `feature/tests` (parte de `feature/cv-upload` / PR #6).

## 1. Framework: Vitest (no Jest)

Se eligió **Vitest 5** con `@vitest/coverage-v8`.

| Criterio | Vitest | Jest |
|----------|--------|------|
| ESM nativo + TypeScript | Sin `ts-jest` ni transform extra | Requiere más cableado en Next 16 ESM |
| Alias `@/` y Node 22 | `resolve.alias` directo | Más config |
| Mocks (`vi.mock`, `vi.stubEnv`, `vi.stubGlobal`) | Suficientes para Next Route Handlers | Equivalente, más pesado |
| Velocidad | Vite; dos proyectos (`unit` / `integration`) | Más lento en watch |
| Cobertura | V8 integrada | `jest --coverage` |

Next.js 16, `"type"` implícito ESM y `moduleResolution: bundler` encajan mejor con Vitest. Jest seguiría funcionando, pero duplicaría transformadas que el repo no tenía.

## 2. Qué se testea y por qué

Módulos críticos para autenticación, datos del candidato y el flujo de entrevista. Un fallo aquí rompe la demo o filtra datos.

| Módulo | Por qué es crítico | Unitario | Integración |
|--------|--------------------|----------|-------------|
| Auth y roles | 401/403, baneo, admin hereda `user` | `hasRole`, `isAdmin`, `requireRole` (sesión mockeada) | Cookie real de Better Auth + Route Handlers |
| Gestión de usuarios | Perfil y listado admin | Zod `updateProfileSchema` | `GET/PATCH /api/users/me`, `GET /api/admin/users` |
| Entrevistas / sesiones | Persistencia, 20 min, start/end | Payload N8N, evaluación, transcripción, tiempo | start/messages/end/reports/schedule |
| Soporte y tickets | 404 para no enumerar tickets ajenos | `isUuid`, `parseJson`, esquemas | CRUD + admin PATCH + 409 cerrado |
| CV | Validación, extracción, serialización | `detectCvKind`, `cleanCvText`, `extractCvText` (unpdf/mammoth mockeados), `toCvSummary` | POST 201/400/413/415, GET/DELETE dueño vs ajeno |
| Límite de 20 min | Cierre suave (2 min / 30 s / 10 s) | `remainingInterviewSeconds`, `getInterviewTimePhase` | `POST .../end` con `reason: "time_limit"` |
| Errores HTTP | Contrato de la API | Zod y `CvValidationError` | 400/401/403/404/409/413/415/500/502 |
| Realtime SSE | Autorización del stream | `encodeSse`, `sseResponse` | 401/404 y `Content-Type: text/event-stream` |

## 3. Unitario vs integración

**Unitario** (`tests/unit/`): funciones puras y servicios sin PostgreSQL. Mocks de `fetch`, `unpdf`, `mammoth` y `auth.api.getSession`. No hay red hacia ElevenLabs, Supabase, N8N ni Resend.

**Integración** (`tests/integration/`): Route Handlers importados y ejecutados contra **PostgreSQL real** (migraciones Prisma). Better Auth crea usuarios y cookies. `next/headers` se mockea para inyectar esa cookie (Next no monta request store fuera del servidor). El resto de I/O externo está mockeado o deshabilitado por env vacío.

## 4. Estrategia de mocks (nunca llamadas reales)

| Dependencia | Cómo se evita |
|-------------|----------------|
| ElevenLabs | Env vacío; `fetch` a `elevenlabs.io` lanza. Token 200/502 con `vi.stubGlobal("fetch")`. TTS unitario con fetch fake. |
| Supabase Storage | Sin `SUPABASE_URL` / service role. `uploadCvFile` / `removeCvFile` / `downloadCvFile` mockeados en el setup de integración. |
| N8N | Webhook vacío → fallback de preguntas mock. Unitario de `callN8nGenerateInterview` con fetch fake. |
| Resend | Sin `RESEND_API_KEY` → no envía. `after()` de Next es no-op en integración. |
| unpdf / mammoth | `vi.doMock` en unitarias. En integración de POST `/api/cv`, `extractCvText` se mockea; `detectCvKind` sigue real (magic bytes). El archivo se llama solo `cv.pdf` / `cv.docx` (CV ficticio). |

Cualquier `fetch` a ElevenLabs, Supabase, Resend o webhooks N8N se **bloquea** en el setup de integración.

## 5. Cómo correrlas

### 5.1 Prerrequisitos

- Node ≥ 20, pnpm ≥ 9
- PostgreSQL 16 (local o el service de GitHub Actions)

```bash
# Local (Debian/Ubuntu)
sudo service postgresql start   # o: sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE USER nervio WITH PASSWORD 'nervio' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE nervio_test OWNER nervio;"
```

Variables: copia `frontend/.env.test.example` → `frontend/.env.test` si hace falta. El setup carga el example y completa defaults (`nervio` / `nervio_test` en `127.0.0.1:5432`). **No** commits de `.env.test`.

### 5.2 Comandos (`frontend/`)

```bash
cd frontend
pnpm install
pnpm test              # unitarias + integración
pnpm test:unit
pnpm test:integration  # aplica `prisma migrate deploy` (globalSetup)
pnpm test:coverage     # HTML + lcov en frontend/coverage/
pnpm lint
pnpm exec tsc --noEmit
```

CI: `.github/workflows/ci.yml` en PRs y pushes a `develop` y `main` (lint, `tsc`, migrate, `test:coverage` + Postgres 16).

### 5.3 Refactors mínimos (testabilidad, sin cambio de producto)

1. `hasRole` exportado desde `require-role.ts`.
2. `resetRateLimitBucketsForTests` en `rate-limit.ts`.
3. `remainingInterviewSeconds` y `getInterviewTimePhase` (mismos umbrales que el cliente).
4. Rate limit de Better Auth desactivado si `NODE_ENV === "test"` (el suite crea muchas cuentas).

## 6. Limitaciones (qué no es integración HTTP “full Next”)

No se levanta `next start`. Los handlers se invocan como funciones (`GET`/`POST`) con `Request` + cookie inyectada. Cubren auth, Prisma, validación y códigos HTTP. No cubren `src/proxy.ts`, RSC ni el WebRTC de ElevenLabs.

SSE: se comprueba 401/404, `Content-Type` y el prefijo `retry:`; no se espera el ciclo de 50 s.

PDF compartido: 404 de token inválido/vencido; no se renderiza `@react-pdf` (pesado y sin ElevenLabs).

`extractCvText` real (unpdf/mammoth) se cubre en unitarias con mocks; un PDF de producción no entra al repo.

## 7. Tabla de casos y resultado

Los resultados se rellenan tras `pnpm test:coverage` en esta VM. Convención: **PASS** / **FAIL**.

### Unitarias

| ID | Caso | Tipo | Resultado |
|----|------|------|-----------|
| U-AUTH-01 | `hasRole` nulo = user; admin hereda | unit | PASS |
| U-AUTH-02 | `requireRole` 401 sin sesión | unit | PASS |
| U-AUTH-03 | `requireRole` 403 baneado / rol insuficiente | unit | PASS |
| U-AUTH-04 | `requireRole` admin en ruta user | unit | PASS |
| U-VAL-01 | login/register Zod | unit | PASS |
| U-VAL-02 | updateProfile strict / vacío | unit | PASS |
| U-VAL-03 | interview setup + schedule pasado / reminder | unit | PASS |
| U-VAL-04 | tickets, alias `medium`, reply vacía | unit | PASS |
| U-CV-01 | `detectCvKind` PDF/DOCX/415 | unit | PASS |
| U-CV-02 | `cleanCvText` truncate | unit | PASS |
| U-CV-03 | `extractCvText` unpdf/mammoth mock + 422 | unit | PASS |
| U-CV-04 | `toCvSummary` stored flag | unit | PASS |
| U-RL-01 | token/CV rate limit 5/min | unit | PASS |
| U-TIME-01 | 1200 s y fases warning/farewell/graceful/expired | unit | PASS |
| U-REM-01 | reminder offsets y formato | unit | PASS |
| U-N8N-01 | payload + stress_mode; fetch mock | unit | PASS |
| U-REP-01 | evaluación local / ElevenLabs / `toInterviewReport` | unit | PASS |
| U-TR-01 | transcript pair, feedback, heurística | unit | PASS |
| U-SSE-01 | `encodeSse` + stream done/error | unit | PASS |
| U-SUP-01 | `isUuid` + `parseJson` 400 | unit | PASS |
| U-MAIL-01 | `escapeHtml` / CTA | unit | PASS |
| U-URL-01 | join URL + Google Calendar UTC | unit | PASS |
| U-REC-01 | retención 14 días | unit | PASS |
| U-TTS-01 | data URL + synthesizeSpeech mock | unit | PASS |
| U-STO-01 | `isStorageConfigured` | unit | PASS |

### Integración

| ID | Caso | Tipo | Resultado |
|----|------|------|-----------|
| I-AUTH-01 | sign-up rol user; cookie → `/api/users/me` | int | PASS |
| I-AUTH-02 | password incorrecta | int | PASS |
| I-ME-01 | 401 / 403 banned (sesión viva) / PATCH 400 / PATCH 200 | int | PASS |
| I-ADM-01 | admin users 401/403/200 | int | PASS |
| I-SUP-01 | ticket 401/400/201 + 404 ajeno | int | PASS |
| I-SUP-02 | admin ve, cierra, 409 reply | int | PASS |
| I-SUP-03 | reply staff → `in_progress` | int | PASS |
| I-CV-01 | 401/400/415/413 | int | PASS |
| I-CV-02 | 201 + lista; 404 ajeno; DELETE dueño | int | PASS |
| I-INT-01 | start 401/400/404 CV | int | PASS |
| I-INT-02 | start 200 mock questions, sin audio | int | PASS |
| I-INT-03 | end `time_limit`, 409 repeat, message 409 | int | PASS |
| I-INT-04 | share 409 sin reporte; reports lista | int | PASS |
| I-INT-05 | schedule 400 pasado / 200 futuro | int | PASS |
| I-EL-01 | token 401/400/404/409/500 | int | PASS |
| I-EL-02 | token 200/502 con fetch mock | int | PASS |
| I-CRON-01 | reminders/cleanup 401 y 200 | int | PASS |
| I-SSE-01 | realtime interview/support 401/404/200 | int | PASS |
| I-PDF-01 | share PDF 404 token corto/vencido | int | PASS |

Ejecución local en esta VM (`pnpm test:coverage`): **33 archivos, 163 pruebas, 0 fallos**.

- Unitarias: 23 archivos, **110** pruebas
- Integración: 10 archivos, **53** pruebas
- Cobertura V8 (handlers + `src/lib`, sin UI): **58.56% statements / 60.43% lines / 64.41% functions / 49.11% branches**

Los huecos grandes son a propósito: grabaciones ElevenLabs, PDF de reporte, `auth-server` (RSC), emails Resend y el catch-all de Better Auth. Los módulos de la rúbrica (roles, validaciones, CV extract, tiempo, SSE, tickets, start/end/support/admin) quedan por encima del 70–100% de líneas.

### Hallazgo real de las pruebas

Better Auth **no emite cookie** si `user.banned = true` en el `sign-in`. El 403 de `requireRole` solo aparece con una **sesión ya abierta** a la que luego se le pone el baneo. El test de integración cubre ese segundo caso.

## 8. Privacidad

Fixtures: correos `*@test.example`, nombres genéricos, archivo `cv.pdf` / texto «CV de prueba (ficticio)». Sin CVs reales ni datos personales.
