# Auditoría de integración — al-lio app con PostgreSQL propio

**Fecha:** 2026-06-11
**Rama:** `feat/al-lio-postgres-app-integration`
**Fase:** 4 — PostgreSQL application integration

---

## Uso Supabase encontrado en el código (pre-Fase 4)

### lib/data.ts
| Tabla | Operación | Estado |
|---|---|---|
| `tasks` | SELECT * | ✅ Migrado a PostgreSQL |
| `courses` | SELECT * | ✅ Migrado a PostgreSQL |
| `hackathons` | SELECT * | ✅ Migrado a PostgreSQL |
| `opportunities` | SELECT * | ✅ Migrado a PostgreSQL |
| `quick_links` | SELECT * | ✅ Migrado a PostgreSQL |
| `tech_opportunities` | SELECT * | ✅ Migrado a PostgreSQL |
| `auth.getUser()` | Auth | ⏳ Pendiente Fase 6 |

### lib/actions.ts (acciones de datos)
| Tabla | Operación | Estado |
|---|---|---|
| `tasks` | INSERT / UPDATE / DELETE | ✅ Migrado a PostgreSQL |
| `courses` | INSERT / UPDATE / DELETE | ✅ Migrado a PostgreSQL |
| `hackathons` | INSERT / UPDATE | ✅ Migrado a PostgreSQL |
| `opportunities` | INSERT / UPDATE / DELETE | ✅ Migrado a PostgreSQL |
| `quick_links` | INSERT / DELETE | ✅ Migrado a PostgreSQL |
| `reminders` | INSERT | ✅ Migrado a PostgreSQL |

### lib/actions.ts (acciones de autenticación — pendientes Fase 6)
| Función | Tipo | Estado |
|---|---|---|
| `loginProfile` | `auth.signInWithPassword` + `auth.signUp` | ⏳ Pendiente Fase 6 |
| `loginOrRegisterProfile` | `auth.signInWithPassword` + `auth.signUp` | ⏳ Pendiente Fase 6 |
| `signUp` | `auth.signUp` | ⏳ Pendiente Fase 6 |
| `signOut` | `auth.signOut` | ⏳ Pendiente Fase 6 |
| `seedHackathons` | RPC `seed_hackathons_for_current_user` | ⛔ Deprecated (RPC no existe en PostgreSQL propio) |
| `profiles.upsert` dentro de auth | Supabase `.from("profiles")` | ⏳ Pendiente Fase 6 — solo para nuevos usuarios |

### lib/db.ts (generic insert/update/delete)
| Estado |
|---|
| ✅ Migrado a PostgreSQL — usa `query` de `lib/db/pool.ts` con whitelist de tablas |

### lib/tech-opportunities.ts
| Estado |
|---|
| ✅ Migrado — fetch desde `/api/tech-opportunities` (PostgreSQL) en lugar de Supabase browser client |

### app/api/seed/route.ts
| Tabla | Operación | Estado |
|---|---|---|
| `tasks` | DELETE LIKE + INSERT | ✅ Migrado a repositorios PostgreSQL |
| `hackathons` | DELETE LIKE + INSERT | ✅ Migrado a repositorios PostgreSQL |
| `courses` | DELETE LIKE + INSERT | ✅ Migrado a repositorios PostgreSQL |
| `auth.getUser()` | Auth | ⏳ Pendiente Fase 6 |

### Dependencias Supabase restantes (post-Fase 4)

| Archivo | Uso | Fase de migración |
|---|---|---|
| `lib/supabase/` (client, server, admin, middleware, env) | Clientes Supabase Auth | Fase 6 |
| `lib/actions.ts` (auth functions) | `signInWithPassword`, `signUp`, `signOut` | Fase 6 |
| `lib/auth/google.ts` | Magic links + Google OAuth | Fase 6 |
| `middleware.ts` | `updateSession` via Supabase SSR | Fase 6 |
| `app/api/auth/login/route.ts` | Login/register API | Fase 6 |
| `lib/auth/current-user.ts` | `auth.getUser()` — uuid compartido | Fase 6 |
| `scripts/check-supabase-remote.mjs` | Admin API Supabase | Fase 5 (scripts) |
| `scripts/apply-supabase-sql.mjs` | RPC Supabase | Fase 5 |
| `scripts/setup-users.mjs` | Admin API + profiles | Fase 5 |
| `scripts/seed-semanal-tasks.mjs` | Admin API + tasks | Fase 5 |
| `scripts/import-tech-opportunities.mjs` | `tech_opportunities.upsert` | Fase 5 |
| `scripts/import-courses.mjs` | `courses.upsert` | Fase 5 |
| `scripts/import-hackathons.mjs` | `hackathons.upsert` | Fase 5 |

---

## Capa repositorio creada

```
lib/db/repositories/
  users.ts          — getUserById, getUserByEmail, updatePasswordHash
  profiles.ts       — getProfileByUser, upsertProfile
  sources.ts        — getSourcesByUser, createSource, deleteSource
  quick_searches.ts — getQuickSearchesByUser, createQuickSearch, deleteQuickSearch
  opportunities.ts  — getOpportunitiesByUser, createOpportunity, updateOpportunityStatus, updateOpportunity, deleteOpportunity
  hackathons.ts     — getHackathonsByUser, createHackathon, updateHackathon, deleteHackathonsByUserLike
  courses.ts        — getCoursesByUser, createCourse, updateCourseStatus, updateCourse, deleteCourse, deleteCoursesByUserLike
  tasks.ts          — getTasksByUser, createTask, updateTaskStatus, updateTask, deleteTask, deleteTasksByUserLike
  reminders.ts      — getRemindersByUser, createReminder
  quick_links.ts    — getQuickLinksByUser, createQuickLink, deleteQuickLink
  tech_opportunities.ts — getAllTechOpportunities
```

Todos los repositorios:
- Usan `import "server-only"`
- Usan `query<T>()` de `lib/db/pool.ts`
- No usan Supabase
- Filtran por `user_id` cuando aplica

---

## Nota sobre auth y UUIDs

Los UUIDs de Supabase Auth (`auth.users.id`) y PostgreSQL propio (`public.users.id`) son los mismos, preservados en la importación de Fase 3B. Esto permite que `getCurrentUserId()` siga usando Supabase Auth como fuente temporal hasta Fase 6 sin inconsistencias de datos.

---

## Variables de entorno Supabase que se pueden eliminar post-Fase 6

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_URL`
