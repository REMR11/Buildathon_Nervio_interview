# Matriz de Trazabilidad — Requisitos ↔ Pruebas

**Proyecto:** Nervio — Simulador de Entrevistas con IA  
**Fase:** Final (Calidad y Pruebas)  
**Fecha:** Noviembre 2026  
**Ciclo:** 02-2026  

---

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Aprobado / Implementado |
| 🧪 | En pruebas |
| ⚠️ | Parcial / Con observaciones |
| ❌ | Fallo / No implementado |

---

## 1. Autenticación y Autorización

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **HU-AUTH-01** | Registro de usuario con validación de email y contraseña segura | Unitaria + Integración | `tests/unit/validations-auth.test.ts`<br>`tests/integration/auth-session.test.ts` | ✅ |
| **HU-AUTH-02** | Inicio de sesión con credenciales válidas | Integración | `tests/integration/auth-session.test.ts` | ✅ |
| **HU-AUTH-03** | Cierre de sesión y limpieza de cookies | Integración | `tests/integration/auth-session.test.ts` | ✅ |
| **SEG-AUTH-01** | Contraseñas con hashing seguro (bcrypt) | Unitaria | Verificado en setup de Better Auth | ✅ |
| **SEG-AUTH-02** | Validación de sesión en endpoints protegidos (401 sin sesión) | Integración | Todos los tests de integración verifican 401 | ✅ |

## 2. Control de Acceso por Roles (RBAC)

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **SEG-ROL-01** | Rol `admin` hereda permisos de `user` | Unitaria | `tests/unit/require-role.test.ts` | ✅ |
| **SEG-ROL-02** | Usuario estándar no puede acceder a rutas de administrador (403) | Unitaria + Integración | `tests/unit/require-role.test.ts`<br>`tests/integration/admin-users.test.ts` | ✅ |
| **SEG-ROL-03** | Usuario baneado recibe 403 incluso con sesión válida | Unitaria + Integración | `tests/unit/require-role.test.ts`<br>`tests/integration/users-me.test.ts` | ✅ |
| **HU-ADM-01** | Administrador puede listar todos los usuarios | Integración | `tests/integration/admin-users.test.ts` | ✅ |
| **HU-ADM-02** | Administrador puede cambiar roles de usuarios | Manual (colección Postman) | `nervio-api.postman_collection.json` → Admin → Set Role | ✅ |
| **HU-ADM-03** | Administrador puede banear/desbanear usuarios | Manual (colección Postman) | `nervio-api.postman_collection.json` → Admin → Ban User | ✅ |

## 3. Gestión de Perfil de Usuario

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **HU-USR-01** | Usuario puede ver su perfil (`GET /api/users/me`) | Integración | `tests/integration/users-me.test.ts` | ✅ |
| **HU-USR-02** | Usuario puede actualizar su nombre y foto (`PATCH /api/users/me`) | Integración | `tests/integration/users-me.test.ts` | ✅ |
| **VAL-USR-01** | Validación estricta de datos de perfil (nombre no vacío) | Unitaria + Integración | `tests/unit/validations-user.test.ts`<br>`tests/integration/users-me.test.ts` | ✅ |

## 4. Entrevistas — Configuración e Inicio

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **HU-INT-01** | Usuario puede configurar entrevista (tipo, rol, nivel, stack) | Unitaria | `tests/unit/validations-interview.test.ts` | ✅ |
| **HU-INT-02** | Usuario puede iniciar entrevista (`POST /api/interview/start`) | Integración | `tests/integration/interview.test.ts` | ✅ |
| **SEG-INT-01** | Solo usuarios autenticados pueden iniciar entrevistas (401) | Integración | `tests/integration/interview.test.ts` | ✅ |
| **CONC-INT-01** | Un usuario NO puede iniciar dos entrevistas simultáneas (409) | Integración (Concurrencia) | `tests/integration/concurrency.test.ts` | ✅ |
| **RF-INT-03** | Sistema genera preguntas dinámicas (N8N o fallback mock) | Unitaria + Integración | `tests/unit/interview-n8n.test.ts`<br>`tests/integration/interview.test.ts` | ✅ |

## 5. Entrevistas — Tiempo Límite

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **RF-TIME-01** | Entrevista tiene duración máxima de 20 minutos (1200 segundos) | Unitaria | `tests/unit/interview-time-limit.test.ts`<br>`tests/unit/interview-constants.test.ts` | ✅ |
| **RF-TIME-02** | Sistema avisa al candidato a los 2 minutos restantes | Unitaria | `tests/unit/interview-time-limit.test.ts` | ✅ |
| **RF-TIME-03** | Sistema solicita despedida a los 30 segundos restantes | Unitaria | `tests/unit/interview-time-limit.test.ts` | ✅ |
| **RF-TIME-04** | Sistema finaliza automáticamente a los 10 segundos restantes | Unitaria | `tests/unit/interview-time-limit.test.ts` | ✅ |
| **HU-INT-05** | Usuario puede finalizar entrevista con motivo `time_limit` | Integración | `tests/integration/interview.test.ts` | ✅ |

## 6. Entrevistas — Finalización y Reporte

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **HU-INT-06** | Usuario puede finalizar entrevista (`POST /api/interview/[id]/end`) | Integración | `tests/integration/interview.test.ts` | ✅ |
| **SEG-INT-02** | Usuario no puede repetir una entrevista ya finalizada (409) | Integración | `tests/integration/interview.test.ts` | ✅ |
| **RF-REP-01** | Sistema genera reporte con puntajes y feedback | Unitaria | `tests/unit/interview-reporting.test.ts` | ✅ |
| **RF-REP-02** | Sistema genera transcripción de la conversación | Unitaria | `tests/unit/interview-transcript.test.ts` | ✅ |
| **HU-REP-01** | Usuario puede ver su historial de entrevistas (`GET /api/interview/reports`) | Integración | `tests/integration/interview.test.ts` | ✅ |
| **HU-REP-02** | Usuario puede compartir reporte con token temporal | Integración | `tests/integration/share-pdf.test.ts` | ✅ |

## 7. CV — Subida y Extracción de Texto

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **RF-CV-01** | Usuario puede subir CV en formato PDF o DOCX (máx. 5 MB, 10 páginas) | Integración | `tests/integration/cv.test.ts` | ✅ |
| **RF-CV-02** | Sistema extrae texto del CV (unpdf, mammoth) | Unitaria | `tests/unit/cv-extract.test.ts` | ✅ |
| **VAL-CV-01** | Validación de tipo MIME por magic bytes (no solo extensión) | Unitaria + Integración | `tests/unit/cv-extract.test.ts`<br>`tests/integration/cv.test.ts` | ✅ |
| **VAL-CV-02** | Rechazo de archivos demasiado grandes (413) o tipo incorrecto (415) | Integración | `tests/integration/cv.test.ts` | ✅ |
| **VAL-CV-03** | Rechazo de PDF sin texto extraíble (422) | Integración | `tests/integration/cv.test.ts` | ✅ |
| **SEG-CV-01** | Usuario solo puede ver/eliminar sus propios CVs (404 en CVs ajenos) | Integración | `tests/integration/cv.test.ts` | ✅ |
| **RF-CV-03** | Sistema limita subidas a 5/min y 20/día por usuario | Unitaria | `tests/unit/rate-limit.test.ts` | ✅ |

## 8. Agenda — Programación de Entrevistas

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **HU-AGD-01** | Usuario puede agendar entrevista futura (`POST /api/interview/schedule`) | Integración | `tests/integration/interview.test.ts` | ✅ |
| **VAL-AGD-01** | Sistema rechaza fechas en el pasado (400) | Unitaria + Integración | `tests/unit/validations-interview.test.ts`<br>`tests/integration/interview.test.ts` | ✅ |
| **RF-AGD-02** | Sistema envía recordatorio por correo antes de la cita | Unitaria | `tests/unit/interview-reminder.test.ts` | ✅ |
| **RF-AGD-03** | Cron job procesa recordatorios pendientes (`/api/cron/reminders`) | Integración | `tests/integration/cron.test.ts` | ✅ |

## 9. Soporte — Sistema de Tickets

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **HU-SUP-01** | Usuario puede crear ticket de soporte (`POST /api/support`) | Integración | `tests/integration/support.test.ts` | ✅ |
| **HU-SUP-02** | Usuario puede responder a su propio ticket | Integración | `tests/integration/support.test.ts` | ✅ |
| **SEG-SUP-01** | Usuario NO puede ver tickets de otros usuarios (404, no enumeración) | Integración | `tests/integration/support.test.ts` | ✅ |
| **HU-SUP-03** | Admin puede ver todos los tickets y cambiar estado/prioridad | Integración | `tests/integration/support.test.ts` | ✅ |
| **SEG-SUP-02** | No se pueden agregar respuestas a tickets cerrados (409) | Integración | `tests/integration/support.test.ts` | ✅ |
| **RF-SUP-04** | Respuesta de staff cambia estado a `in_progress` automáticamente | Integración | `tests/integration/support.test.ts` | ✅ |
| **VAL-SUP-01** | Validación de campos: alias `medium` = `normal`, mensaje no vacío | Unitaria | `tests/unit/validations-support.test.ts`<br>`tests/unit/support-tickets.test.ts` | ✅ |

## 10. Tiempo Real (SSE)

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **RF-RT-01** | Stream SSE de eventos de ticket (`/api/realtime/support/[id]`) | Integración | `tests/integration/realtime.test.ts` | ✅ |
| **RF-RT-02** | Stream SSE de eventos de reporte (`/api/realtime/interview/[id]`) | Integración | `tests/integration/realtime.test.ts` | ✅ |
| **SEG-RT-01** | Solo dueño o admin pueden conectarse al stream (401/404) | Integración | `tests/integration/realtime.test.ts` | ✅ |
| **RF-RT-03** | Stream respeta formato SSE estándar (`Content-Type`, `retry:`) | Unitaria + Integración | `tests/unit/realtime-sse.test.ts`<br>`tests/integration/realtime.test.ts` | ✅ |

## 11. Manejo de Errores y Validaciones

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **SEG-ERR-01** | Respuestas de error estructuradas (JSON con `error` y código HTTP) | Integración | Todos los tests de integración verifican formato | ✅ |
| **SEG-ERR-02** | Sin stack traces ni detalles de infraestructura al cliente | Integración | Verificado en todos los endpoints (catch genéricos) | ✅ |
| **VAL-ERR-01** | Validación de entradas con Zod (tipos, longitudes, formatos) | Unitaria | `tests/unit/validations-*.test.ts` | ✅ |
| **HTTP-400** | Errores de validación devuelven 400 Bad Request | Integración | Verificado en múltiples tests (400) | ✅ |
| **HTTP-401** | Sin autenticación devuelve 401 Unauthorized | Integración | Verificado en todos los tests con autenticación | ✅ |
| **HTTP-403** | Sin permisos devuelve 403 Forbidden | Integración | `tests/integration/admin-users.test.ts`, `users-me.test.ts` | ✅ |
| **HTTP-404** | Recurso no encontrado devuelve 404 Not Found | Integración | `tests/integration/cv.test.ts`, `support.test.ts` | ✅ |
| **HTTP-409** | Conflictos (repetir entrevista, ticket cerrado, concurrencia) devuelven 409 | Integración | `tests/integration/interview.test.ts`, `concurrency.test.ts`, `support.test.ts` | ✅ |
| **HTTP-413** | Archivo muy grande devuelve 413 Payload Too Large | Integración | `tests/integration/cv.test.ts` | ✅ |
| **HTTP-415** | Tipo MIME no soportado devuelve 415 Unsupported Media Type | Integración | `tests/integration/cv.test.ts` | ✅ |
| **HTTP-422** | Datos procesables pero semánticamente incorrectos devuelven 422 | Integración | `tests/integration/cv.test.ts` (PDF sin texto) | ✅ |
| **HTTP-500** | Errores internos devuelven 500 Internal Server Error | Integración | Verificado en catch blocks genéricos | ✅ |

## 12. Rate Limiting

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **SEG-RL-01** | Límite de tokens de ElevenLabs: 3/min por usuario | Unitaria | `tests/unit/rate-limit.test.ts` | ✅ |
| **SEG-RL-02** | Límite de subidas de CV: 5/min, 20/día por usuario | Unitaria | `tests/unit/rate-limit.test.ts` | ✅ |
| **HTTP-429** | Exceder límite devuelve 429 Too Many Requests | Integración | Verificado manualmente (no automatizado en suite) | ⚠️ |

## 13. Seguridad de Credenciales

| ID Requisito | Descripción Funcional | Tipo de Verificación | Archivo/Caso de Prueba | Estado |
|--------------|----------------------|---------------------|------------------------|--------|
| **SEG-CRED-01** | Contraseñas hasheadas con Better Auth (bcrypt) | Manual (arquitectura) | Configuración en `src/lib/auth.ts` | ✅ |
| **SEG-CRED-02** | API keys y secretos solo en variables de entorno | Manual (revisión código) | `.env.example`, sin claves en código fuente | ✅ |
| **SEG-CRED-03** | `.env.example` actualizado con todas las variables requeridas | Manual (revisión) | `frontend/.env.example` | ✅ |

---

## Resumen de Cobertura

| Categoría | Total Requisitos | Aprobados (✅) | Parciales (⚠️) | Fallos (❌) | % Éxito |
|-----------|-----------------|---------------|---------------|-------------|---------|
| **Autenticación** | 5 | 5 | 0 | 0 | 100% |
| **RBAC** | 6 | 6 | 0 | 0 | 100% |
| **Perfil de Usuario** | 3 | 3 | 0 | 0 | 100% |
| **Entrevistas** | 5 | 5 | 0 | 0 | 100% |
| **Tiempo Límite** | 5 | 5 | 0 | 0 | 100% |
| **Reporte** | 6 | 6 | 0 | 0 | 100% |
| **CV** | 7 | 7 | 0 | 0 | 100% |
| **Agenda** | 4 | 4 | 0 | 0 | 100% |
| **Soporte** | 7 | 7 | 0 | 0 | 100% |
| **Tiempo Real** | 4 | 4 | 0 | 0 | 100% |
| **Errores y Validaciones** | 14 | 14 | 0 | 0 | 100% |
| **Rate Limiting** | 3 | 2 | 1 | 0 | 67% |
| **Seguridad** | 3 | 3 | 0 | 0 | 100% |
| **TOTAL** | **72** | **71** | **1** | **0** | **98.6%** |

---

## Notas

- **Concurrencia (CONC-INT-01)**: Nueva prueba agregada en la Fase Final para verificar que dos usuarios no pueden iniciar entrevistas simultáneas. Implementa protección a nivel de base de datos (check de sesión activa antes de crear).
- **Rate Limiting (HTTP-429)**: Marcado como parcial (⚠️) porque la verificación del código 429 se hace manualmente en desarrollo pero no está automatizada en la suite de integración.
- **Todos los requisitos críticos de la guía de Fase Final están cubiertos**: validaciones, RBAC, manejo de errores, concurrencia, sanitización de entradas, y seguridad de credenciales.
