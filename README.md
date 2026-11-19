# Nervio — Simulador de entrevistas con IA y voz

Monorepo del proyecto **Nervio** (Buildathon). Entrega actual: **Fase Final — Calidad y Pruebas (Fase 4)**.

## Estructura

| Carpeta / archivo | Contenido |
|-------------------|-----------|
| [`frontend/`](./frontend) | Aplicación Next.js (UI + API Route Handlers), Prisma y seeds. **Empieza aquí:** [`frontend/README.md`](./frontend/README.md). |
| [`docs/`](./docs) | Guion de demo y SOW. No hay carpeta `backend/`: toda la API vive en `frontend/` como API Route Handlers de Next.js. |
| [`nervio-api.postman_collection.json`](./nervio-api.postman_collection.json) | Colección de pruebas manuales de la API (Postman / Thunder / Insomnia). |
| `Actividad_evaluada_N_4_Nervio.pdf` | Documento maestro: Fase 1 (análisis) + Fase 2 (diseño). |
| `Actividad_evaluada_Fase3_Nervio.docx` | Informe de la Fase 3 (implementación y despliegue). |

## Arranque rápido

```bash
cd frontend
pnpm install
cp .env.example .env     # completar credenciales
pnpm db:migrate          # aplica el esquema (DDL)
pnpm db:seed             # usuarios y datos de prueba
pnpm dev                 # http://localhost:3000
```

Detalle de prerrequisitos, variables de entorno, base de datos, pruebas de API y despliegue en
[`frontend/README.md`](./frontend/README.md).

## Pruebas automatizadas

### Ejecutar suite completa

```bash
cd frontend
pnpm install
pnpm test              # unitarias + integración (163 pruebas)
pnpm test:unit         # solo unitarias (110 pruebas)
pnpm test:integration  # solo integración (53 pruebas, incluye concurrencia)
pnpm test:coverage     # genera reporte de cobertura en coverage/
```

### Requisitos para pruebas

- PostgreSQL 16 ejecutándose (local o servicio)
- Base de datos de prueba: `nervio_test`
- Variables de entorno en `frontend/.env.test` (se copia de `.env.test.example`)

El suite incluye:
- **110 pruebas unitarias**: validaciones, lógica de negocio, transformaciones de datos
- **53 pruebas de integración**: endpoints API, CRUD, autenticación, roles, concurrencia
- **Concurrencia**: verificación de que dos usuarios no pueden iniciar entrevistas simultáneas

Más detalles: [`docs/TESTING.md`](./docs/TESTING.md) · Matriz de trazabilidad: [`docs/matriz-trazabilidad.md`](./docs/matriz-trazabilidad.md)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Better Auth · Prisma ORM +
PostgreSQL · ElevenLabs (ConvAI / TTS) · Resend · Vercel (hosting + cron).

## Funcionalidades clave

- Entrevista por voz con IA (Nova, ElevenLabs) personalizada por puesto, nivel y tipo.
- **Subida de CV (PDF/DOCX)**: se extrae el texto y Nova lo usa para personalizar las
  preguntas. Detalle en [`frontend/README.md`](./frontend/README.md#subida-de-cv-rf-cv-01--rf-cv-02).
- Reporte con puntajes, transcripción y feedback; agenda con recordatorios por correo.
- Soporte con tiempo real (SSE) y panel de administración por roles.

## Estrategia de ramas y revisión de código

Seguimos **Git Flow** adaptado:

- **`main`**: rama estable de producción. Solo se actualiza vía PR desde `develop` tras validación completa.
- **`develop`**: rama de integración. Todos los cambios pasan por aquí antes de `main`.
- **`feature/*`**: ramas de trabajo para cada nueva funcionalidad o corrección.

### Flujo de trabajo

1. Crear rama desde `develop`: `git checkout -b feature/mi-funcionalidad`
2. Desarrollar y hacer commits descriptivos
3. Ejecutar pruebas localmente: `cd frontend && pnpm test`
4. Push: `git push -u origin feature/mi-funcionalidad`
5. Abrir **Pull Request** hacia `develop` (usar plantilla en `.github/PULL_REQUEST_TEMPLATE.md`)
6. **Revisión obligatoria**: otro miembro del equipo revisa el código
7. CI ejecuta automáticamente: lint, typecheck y pruebas (GitHub Actions)
8. Merge solo si: revisión aprobada + CI pasa + sin conflictos

### Política de revisión de código

- ✅ Todo PR requiere aprobación de al menos un revisor antes del merge
- ✅ El CI debe pasar (lint + typecheck + tests)
- ✅ No se permite merge directo a `main` sin pasar por `develop`
- ✅ Los conflictos se resuelven localmente antes del merge
- ✅ Commits descriptivos siguiendo [Conventional Commits](https://www.conventionalcommits.org/)

Más detalles: [CONTRIBUTING.md](CONTRIBUTING.md) · Demo: [docs/DEMO.md](docs/DEMO.md)
