# Fase 4 — PostgreSQL application integration

**Rama:** `feat/al-lio-postgres-app-integration`
**Fecha:** 2026-06-11
**Estado:** Completado — capa repositorio creada, lecturas/escrituras de datos migradas a PostgreSQL

---

## Objetivo

Adaptar la aplicación al-lio para leer y escribir datos de negocio desde PostgreSQL propio (`lib/db/pool.ts`) en lugar de Supabase, manteniendo Supabase Auth activo hasta Fase 6.

---

## Qué usa ya PostgreSQL propio (post-Fase 4)

### Lecturas de datos (lib/data.ts → getGlobalStore)
- `tasks` — PostgreSQL ✅
- `courses` — PostgreSQL ✅
- `hackathons` — PostgreSQL ✅
- `opportunities` — PostgreSQL ✅
- `quick_links` — PostgreSQL ✅
- `tech_opportunities` — PostgreSQL ✅ (incluida API route `/api/tech-opportunities` para cliente)

### Escrituras de datos (lib/actions.ts)
- `createTask`, `updateTaskStatus`, `postponeTaskTomorrow`, `deleteTask` — PostgreSQL ✅
- `createOpportunity`, `updateOpportunityStatus`, `deleteOpportunity` — PostgreSQL ✅
- `createCourse`, `updateCourseStatus`, `deleteCourse` — PostgreSQL ✅
- `createHackathon`, `markHackathonReviewed`, `createTaskFromHackathon`, `createReminderFromHackathon` — PostgreSQL ✅
- `createQuickLink`, `deleteQuickLink` — PostgreSQL ✅

### Operaciones genéricas (lib/db.ts → insertDb/updateDb/deleteDb)
- Usadas por `components/guest-app.tsx` — migradas a PostgreSQL con whitelist de tablas ✅

### Seed endpoint (app/api/seed/route.ts)
- Operaciones de seed/cleanup — PostgreSQL ✅

---

## Qué sigue dependiendo de Supabase

### Auth (pendiente Fase 6)
- `loginProfile`, `loginOrRegisterProfile`, `signUp`, `signOut` — Supabase Auth
- `middleware.ts` — sesión via Supabase SSR
- `lib/auth/current-user.ts` — uuid obtenido de Supabase Auth
- `lib/auth/google.ts` — Google OAuth via magic links Supabase
- `app/api/auth/login/route.ts`

**Nota:** Los UUID de Supabase Auth coinciden con `public.users.id` (preservados en importación Fase 3B), por lo que las queries PostgreSQL funcionan correctamente con el userId de Supabase Auth.

### Sincronización de perfiles en flujo de auth
`lib/auth/sync-postgres-user.ts` — `ensurePostgresUserForSupabaseUser` hace upsert de `public.users` + `public.profiles` en PostgreSQL propio tras cada sign-in o sign-up exitoso. No quedan `profiles.upsert` en Supabase dentro de `lib/actions.ts`. Nuevos usuarios tendrán filas en PostgreSQL antes de cualquier escritura de datos de negocio.

### Scripts de importación (pendiente Fase 5)
- `scripts/import-tech-opportunities.mjs`
- `scripts/import-courses.mjs`
- `scripts/import-hackathons.mjs`
- `scripts/seed-semanal-tasks.mjs`
- `scripts/setup-users.mjs`

---

## Cómo setear password de usuario en PostgreSQL

Prerequisito de Fase 6. Los usuarios importados desde Supabase tienen `password_hash = null`.

```bash
DATABASE_URL="postgresql://..." \
AL_LIO_SET_PASSWORD_CONFIRMATION=SET_POSTGRES_USER_PASSWORD \
AL_LIO_USER_EMAIL=usuario@example.com \
AL_LIO_USER_PASSWORD=<contraseña> \
npm run postgres:user:set-password
```

**No ejecutar** hasta que Fase 6 esté lista y la app use auth propia.

---

## Artefactos creados en Fase 4

| Artefacto | Descripción |
|---|---|
| `lib/db/types.ts` | Tipos PostgreSQL (DbUser, DbTask, DbCourse, etc.) |
| `lib/db/repositories/` (11 archivos) | Capa repositorio por tabla |
| `lib/auth/current-user.ts` | Helper temporal de userId (Supabase Auth → Fase 6) |
| `app/api/tech-opportunities/route.ts` | API route para fetch cliente de tech_opportunities |
| `scripts/postgres/set-user-password.mjs` | Tooling para setear password_hash |
| `scripts/validate-postgres-app-integration.mjs` | Validador estático de la integración |
| `lib/db/pool.ts` | Actualizado: pool lazy (no lanza en import si DATABASE_URL ausente) |
| `lib/data.ts` | Actualizado: usa repositorios PostgreSQL |
| `lib/actions.ts` | Actualizado: datos via repositorios, auth sigue en Supabase |
| `lib/db.ts` | Actualizado: insertDb/updateDb/deleteDb via PostgreSQL |
| `lib/tech-opportunities.ts` | Actualizado: fetch via `/api/tech-opportunities` |
| `app/api/seed/route.ts` | Actualizado: usa repositorios PostgreSQL |
| `docs/POSTGRES_APP_INTEGRATION_AUDIT.md` | Auditoría completa de dependencias Supabase |

---

## Lo que NO se hizo

- No se ejecutaron migraciones reales
- No se tocó VPS ni producción
- No se tocó Caddy ni DNS
- No se tocaron `.env` reales ni secretos
- No se modificó auth (permanece en Supabase hasta Fase 6)
- No se eliminaron dependencias Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- No se desplegó nada

---

## Checklist antes de desplegar Fase 4 en VPS

- [ ] `DATABASE_URL` apunta a `aidraft_postgres` en VPS
- [ ] Schema aplicado en VPS: `npm run postgres:setup` (sobre VPS DATABASE_URL)
- [ ] Datos importados en VPS (Fase 3B ejecutada con VPS sandbox ya completado)
- [ ] `npm run validate:postgres-app-integration` pasa
- [ ] `npm run lint && npm run typecheck && npm run build` pasan
- [ ] Supabase Auth sigue activo (no eliminarlo hasta Fase 6)
- [ ] Test de login/logout funciona (sigue siendo Supabase Auth)
- [ ] Test de creación/lectura de tasks y hackathons (PostgreSQL)
- [ ] Smoke test en VPS staging antes de producción

---

## Próxima fase

**Fase 5** — Migrar scripts de importación (`import-*.mjs`, `setup-users.mjs`) de Supabase a `pg` + `DATABASE_URL`.

**Fase 6** — Reemplazar Supabase Auth por auth propia:
- Tabla `public.users` + `bcryptjs`
- Sesiones con `iron-session` o JWT
- Eliminar `@supabase/ssr`, `@supabase/supabase-js`
- Setear `password_hash` con `postgres:user:set-password`

Ver [SUPABASE_TO_POSTGRES_AUDIT.md](./SUPABASE_TO_POSTGRES_AUDIT.md) para inventario completo.
