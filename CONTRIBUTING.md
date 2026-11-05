# Contribuir a Nervio

## Estrategia de ramas

```
feature/*  ──PR──▶  develop  ──PR──▶  main  ──▶  Vercel (producción)
```

| Rama | Uso |
| --- | --- |
| `main` | Código estable y desplegado. Solo recibe merges desde `develop`. |
| `develop` | Integración. Aquí se juntan las features ya probadas. |
| `feature/<nombre>` | Una funcionalidad o corrección. Se crea desde `develop` (ej. `feature/support`, `feature/realtime`). |

### Flujo

1. Actualiza `develop` y crea tu rama:
   ```bash
   git checkout develop && git pull
   git checkout -b feature/mi-cambio
   ```
2. Haz commits pequeños con mensajes descriptivos (`feat:`, `fix:`, `docs:`, `chore:`).
3. Antes de abrir el PR, corre en `frontend/`:
   ```bash
   pnpm lint && npx tsc --noEmit && pnpm test && pnpm build && pnpm check:api
   ```
   Las pruebas unitarias e de integración se documentan en [`docs/TESTING.md`](docs/TESTING.md). El workflow de GitHub Actions (`.github/workflows/ci.yml`) ejecuta lint, typecheck y el suite contra PostgreSQL en PRs hacia `develop` y `main`.
4. Abre un **Pull Request `feature/*` → `develop`**. Se fusiona con merge commit (`--no-ff`) para conservar el historial de la feature.
5. Cuando `develop` esté estable, abre un **PR `develop` → `main`** (también `--no-ff`). Vercel despliega `main` automáticamente.

### Reglas

- Nada de `git push --force` en `main` ni en `develop`; no reescribas historial compartido (rebase o reset de ramas publicadas).
- Nunca subas `.env` ni archivos `.bak`; solo `.env.example` con valores de ejemplo.
- Los cambios de base de datos son aditivos y van en una migración de Prisma.
- Si agregas o cambias un endpoint, actualiza la colección de Postman (`pnpm check:api` debe dar 0 faltantes).
