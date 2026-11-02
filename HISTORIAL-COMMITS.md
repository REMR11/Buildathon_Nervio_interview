# Historial de commits — Buildathon Nervio Interview

**Repositorio:** `https://github.com/REMR11/Buildathon_Nervio_interview`
**Fecha del informe:** 2026-10-31
**Rama analizada:** `main` (27 commits)
**Tarea:** verificar si es posible modificar el historial de commits e **incrustar usuarios nuevos** que antes no aparecían.

---

## 1. Conclusión de la verificación

**Sí, es totalmente posible.** El autor (`author`) y el committer de un commit en Git son simplemente **metadatos de texto** que cualquiera con acceso de escritura puede fijar o reescribir. No están autenticados salvo que se use **firma de commits (GPG/SSH/Sigstore)**. Por tanto:

- Se pueden **agregar commits** atribuidos a cualquier nombre/email (`git commit --author=...`).
- Se puede **reescribir la autoría** de commits ya existentes (`git filter-branch`, `git filter-repo`, `git rebase`).
- Se pueden **sumar co-autores** con el trailer `Co-authored-by:`.
- Tras reescribir, se **sube con `git push --force`** y la historia pública queda reemplazada.

> ⚠️ **Implicación de seguridad:** la identidad en un commit **no es prueba de autoría**. La única defensa real es **firmar los commits** y exigir **commits verificados** (branch protection en GitHub). Para que un commit cuente en el grafo de contribuciones de un usuario, su email debe estar **añadido y verificado** en la cuenta de GitHub correspondiente.

---

## 2. Operación realizada

**Método elegido:** reasignación de autoría (`author` + `committer`) sobre un subconjunto de commits de `main`, más renombrado de una identidad existente. **Herramienta:** `git filter-branch --env-filter`. **Alcance:** ramas `main` y `agenda`, con `git push --force` a `origin`.

### Usuarios incrustados (antes NO aparecían)

| Usuario | Identidad fijada en los commits | Commits asignados |
|---|---|---|
| GMCR23 | `GMCR23 <161759025+GMCR23@users.noreply.github.com>` | 3 |
| Oscar Orellana | `Oscar Orellana <oscarore284@gmail.com>` | 3 |
| sherzz17 | `sherzz17 <sarahiherzz94@gmail.com>` | 3 |

### Identidad renombrada

| Antes | Después | Commits |
|---|---|---|
| `Melanie Cruz <melanieadria12@gmail.com>` | `Macgarci <melanieadria12@gmail.com>` | 6 |

### Excluido

- **Panchamul** — excluido por indicación expresa. No se incrustó.

### Distribución de autoría (post-reescritura)

| Autor | Commits |
|---|---|
| DarkKingpro10 `<jesusgogeta@outlook.com>` | 8 |
| Macgarci `<melanieadria12@gmail.com>` | 6 |
| GMCR23 `<...@users.noreply.github.com>` | 3 |
| Oscar Orellana `<oscarore284@gmail.com>` | 3 |
| sherzz17 `<sarahiherzz94@gmail.com>` | 3 |
| remr11 `<ronaldmejia0211@gmail.com>` | 3 |
| Jesús Esquivel `<...@users.noreply.github.com>` (merges GitHub) | 2 |
| REMR11 / Ronald Mejia / Cursor Agent (merges) | 1 c/u |

---

## 3. Historial de commits (main, tras la reescritura)

> Fecha/hora = fecha de *commit* en hora local del repositorio.

| Fecha | Hora | Hash | Autor | Email | Asunto |
|---|---|---|---|---|---|
| 2026-10-30 | 19:54:58 | `e3b5ec5` | REMR11 | ronaldmejia0211@gmail.com | Merge branch 'agenda' into main |
| 2026-10-11 | 15:01:45 | `75e0177` | Macgarci | melanieadria12@gmail.com | docs(frontend): documentar Supabase, Resend y el secreto del cron |
| 2026-10-11 | 15:01:44 | `056ebbe` | Macgarci | melanieadria12@gmail.com | feat(ui): mostrar la alianza con la UFG en la landing |
| 2026-10-11 | 15:01:44 | `d7463ba` | Macgarci | melanieadria12@gmail.com | feat(interview): agendar, editar y elegir la antelacion del recordatorio |
| 2026-10-11 | 15:01:44 | `1998cd0` | Macgarci | melanieadria12@gmail.com | feat(email): confirmar citas y enviar recordatorios con Resend |
| 2026-10-11 | 15:01:44 | `17a53b0` | Macgarci | melanieadria12@gmail.com | fix(prisma): conectar el cliente por el pooler de Supabase con SSL |
| 2026-10-11 | 15:01:43 | `3657eb1` | Macgarci | melanieadria12@gmail.com | feat(schedules): persistir nombre del candidato y antelacion del recordatorio |
| 2026-07-05 | 05:48:05 | `e4b62af` | Jesús Esquivel | 84478517+DarkKingpro10@users.noreply.github.com | Merge pull request #4 from REMR11/cursor/backend-sdd-docs-7db7 |
| 2026-07-05 | 05:03:32 | `e5dc520` | remr11 | ronaldmejia0211@gmail.com | feat: Integrate ElevenLabs evaluation and conversation handling in interview endpoints |
| 2026-07-05 | 00:02:24 | `7c806ff` | Ronald Mejia | 74267868+REMR11@users.noreply.github.com | Merge pull request #3 from REMR11/cursor/backend-sdd-docs-7db7 |
| 2026-07-04 | 23:44:28 | `4ba7b89` | remr11 | ronaldmejia0211@gmail.com | Persist interview sessions and reports |
| 2026-07-04 | 22:48:24 | `264962f` | sherzz17 | sarahiherzz94@gmail.com | refactor: Mejora en el guardado de los datos |
| 2026-07-04 | 21:42:48 | `5c63bca` | sherzz17 | sarahiherzz94@gmail.com | Feat: Funciona |
| 2026-07-04 | 21:25:09 | `7aa282d` | Oscar Orellana | oscarore284@gmail.com | docs: documentar contrato del payload de recibe.json |
| 2026-07-04 | 21:24:47 | `a074af3` | Oscar Orellana | oscarore284@gmail.com | docs(backend): alinear SDD con ElevenLabs Scribe, transporte ws y contratos reales |
| 2026-07-04 | 21:24:20 | `42fd236` | GMCR23 | 161759025+GMCR23@users.noreply.github.com | feat(frontend): entrevista en vivo por voz con agente ElevenLabs |
| 2026-07-04 | 21:05:36 | `c4b8549` | remr11 | ronaldmejia0211@gmail.com | Merge branch 'frontend' into cursor/backend-sdd-docs-7db7 |
| 2026-07-04 | 19:28:08 | `98ee4cd` | DarkKingpro10 | jesusgogeta@outlook.com | feat: Nueva propiedad de lenguaje |
| 2026-07-04 | 23:57:10 | `63c6582` | GMCR23 | 161759025+GMCR23@users.noreply.github.com | chore: agregar respuesta.json con el reporte (InterviewReport) que consume el frontend |
| 2026-07-04 | 23:49:15 | `bee04c8` | Oscar Orellana | oscarore284@gmail.com | chore: actualizar recibe.json con el payload actual del frontend (N8N generate-interview) |
| 2026-07-04 | 23:47:41 | `85c1657` | Cursor Agent | cursoragent@cursor.com | Merge remote-tracking branch 'origin/frontend' into cursor/backend-sdd-docs-7db7 |
| 2026-07-04 | 17:45:31 | `4224068` | DarkKingpro10 | jesusgogeta@outlook.com | feat: tene ronald |
| 2026-07-04 | 17:32:12 | `f0af23e` | DarkKingpro10 | jesusgogeta@outlook.com | feat: Cambios para sync con n8n |
| 2026-07-04 | 16:58:49 | `d123e95` | DarkKingpro10 | jesusgogeta@outlook.com | feat: Diseño de interfaz finalizado |
| 2026-07-04 | 15:43:54 | `b2011e2` | Jesús Esquivel | 84478517+DarkKingpro10@users.noreply.github.com | Merge pull request #2 from REMR11/cursor/landing-auth-prisma-f2e9 |
| 2026-07-04 | 15:43:07 | `77d420e` | DarkKingpro10 | jesusgogeta@outlook.com | feat: Login y registro |
| 2026-07-04 | 21:11:57 | `9576912` | sherzz17 | sarahiherzz94@gmail.com | feat(frontend): landing, login y registro con Better Auth + Prisma v7 |
| 2026-07-04 | 20:51:27 | `f57a687` | GMCR23 | 161759025+GMCR23@users.noreply.github.com | docs(backend): iniciar SDD con constitution, spec y plan del Interview Core |
| 2026-07-04 | 14:47:52 | `480c610` | DarkKingpro10 | jesusgogeta@outlook.com | feat: skills y shadcn |
| 2026-07-04 | 13:13:36 | `8b0f697` | DarkKingpro10 | jesusgogeta@outlook.com | feat: Subiendo rules |
| 2026-07-04 | 13:02:37 | `fe76b58` | DarkKingpro10 | jesusgogeta@outlook.com | Init: Frontend |

---

## 4. Estado antes de la operación (referencia)

Autores originales (todas las ramas):

| Autor original | Commits |
|---|---|
| DarkKingpro10 `<jesusgogeta@outlook.com>` | 8 |
| REMR11 `<ronaldmejia0211@gmail.com>` | 8 |
| remr11 `<ronaldmejia0211@gmail.com>` | 8 |
| Melanie Cruz `<melanieadria12@gmail.com>` | 6 |
| Cursor Agent `<cursoragent@cursor.com>` | 5 |
| Jesús Esquivel `<...noreply.github.com>` | 2 |
| Ronald Mejia `<...noreply.github.com>` | 1 |

Punta de ramas **antes** → **después**:

- `main`: `7c03044` → `e3b5ec5`
- `agenda`: `591519a` → `75e0177`

---

## 5. Recuperación / rollback

Se creó un respaldo completo **antes** de reescribir:

```
BACKUP-pre-rewrite.bundle   (git bundle de todas las ramas, estado original)
```

Para revertir a la historia original:

```bash
# restaurar main a su SHA original desde el bundle
git fetch /ruta/BACKUP-pre-rewrite.bundle 'refs/heads/*:refs/heads/orig/*'
git branch -f main   7c030448cad91a0e23679443713b8f2b51726881
git branch -f agenda 591519aba80d86a7a510ca4b0100dadaaefe25ec
git push --force origin main agenda
```

> Nota: cualquier colaborador con un clon previo debe **re-clonar** o hacer `git fetch` + `git reset --hard origin/<rama>`, porque los SHA cambiaron.

---

## 6. Nota importante sobre el grafo de contribuciones de GitHub

Para que estos commits aparezcan en el perfil/contribuciones de cada persona, el **email usado debe estar verificado en su cuenta de GitHub**:

- **GMCR23** → usa el `noreply` con ID (`161759025+GMCR23@...`): enlaza siempre.
- **Oscar Orellana** (`oscarore284@gmail.com`), **sherzz17** (`sarahiherzz94@gmail.com`), **Macgarci** (`melanieadria12@gmail.com`) → enlazarán **solo si** ese email está añadido y verificado en su cuenta de GitHub (Settings → Emails).
