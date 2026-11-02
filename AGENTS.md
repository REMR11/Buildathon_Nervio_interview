This repository contains a single full-stack application in the **frontend** folder (Next.js: UI + API Route Handlers, Prisma, auth, realtime). There is no separate backend project; the old `backend/` folder only held planning docs and was archived to `docs/archive/sdd-backend/`.

The agent must follow these rules:

1. **Scope**

   * All code tasks (UI, APIs, database, business logic, endpoints, authentication) are resolved inside the `frontend` folder.
   * Look for any defined **skills** and **rules** files within that directory and prioritize them over general knowledge.

2. **Historical docs**

   * `docs/archive/sdd-backend/` and `project-flow.md` describe the original Fase 2 plan (separate NestJS/Express backend). Treat them as background, not as the current architecture.

ALSO READ THE project-flow.md and project-overview.md at the root.

Use caveman if you find the skill in frontend