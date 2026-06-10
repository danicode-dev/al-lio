# Auditoría técnica — Migración Supabase → PostgreSQL propio

**Fecha:** 2026-06-10  
**Repo:** danicode-dev/al-lio  
**Rama:** feat/aidraft-postgres-migration-audit  
**Auditor:** Claude Code

---

## 1. Resumen ejecutivo

Aidraft usa Supabase en dos dimensiones distintas:

1. **Como base de datos** — todas las tablas de negocio (tasks, courses, hackathons, etc.) viven en PostgreSQL a través de la API de Supabase.
2. **Como plataforma de autenticación** — el sistema de login, sesiones, usuarios y Google Calendar OAuth están construidos sobre Supabase Auth.

**Lo que NO usa:**
- Supabase Storage → no hay archivos almacenados.
- Supabase Realtime → no hay canales ni suscripciones.
- Supabase Edge Functions → no aplica.

**Veredicto:** La migración completa a PostgreSQL propio es técnicamente viable. El bloqueador principal no es la base de datos (el SQL es estándar), sino **Supabase Auth**, que requiere reemplazarse por un sistema de autenticación propio. El paquete `pg` ya está instalado como dependencia, lo que reduce la fricción del lado de la capa de acceso a datos.

---

## 2. Variables de entorno actuales

| Variable | Uso | Tipo |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL base del proyecto Supabase | Pública (frontend) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima para cliente browser | Pública (frontend) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Alias de la clave anónima | Pública (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API — bypass RLS | **Secreta** |
| `SUPABASE_SECRET_KEY` | Alias de service role key | **Secreta** |
| `SUPABASE_URL` | Alias de la URL (uso en scripts) | Secreta |
| `SUPABASE_DB_URL` | Conexión directa PostgreSQL a Supabase | **Secreta** |
| `DATABASE_URL` | Alias de SUPABASE_DB_URL en scripts | Secreta |
| `TARGET_USER_EMAIL` | Email del usuario principal | Secreta |
| `PROFILES_SHARED_PASSWORD` | Contraseña compartida para perfiles internos | **Secreta** |
| `GOOGLE_CLIENT_ID` | OAuth Google Calendar | Secreta |
| `GOOGLE_CLIENT_SECRET` | OAuth Google Calendar | **Secreta** |
| `GOOGLE_REDIRECT_URI` | Callback OAuth | Configurable |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Cifrado de tokens Google | **Secreta** |
| `BASE_URL` | URL base de la app (para scripts sync) | Configurable |

**Post-migración:** eliminar todas las variables `SUPABASE_*` y `NEXT_PUBLIC_SUPABASE_*`. Añadir `DATABASE_URL` apuntando al `aidraft_postgres` propio.

---

## 3. Inventario de tablas y migraciones

### 3.1 Tablas detectadas (supabase/schema.sql)

| Tabla | user_id FK | RLS | Descripción |
|---|---|---|---|
| `profiles` | `auth.users(id)` | Sí | Perfil de usuario extendido |
| `sources` | `auth.users(id)` | Sí | Fuentes de empleo configuradas |
| `quick_searches` | `auth.users(id)` | Sí | Búsquedas rápidas guardadas |
| `opportunities` | `auth.users(id)` | Sí | Ofertas de empleo rastreadas |
| `hackathons` | `auth.users(id)` | Sí | Hackathons y eventos |
| `courses` | `auth.users(id)` | Sí | Cursos y formaciones |
| `tasks` | `auth.users(id)` | Sí | Tareas y to-dos |
| `reminders` | `auth.users(id)` | Sí | Recordatorios |
| `quick_links` | `auth.users(id)` | Sí | Links guardados |
| `tech_opportunities` | — (tabla compartida) | Sí (solo select) | Oportunidades tech de referencia, sin user_id |

### 3.2 Migraciones detectadas

| Archivo | Propósito |
|---|---|
| `supabase/schema.sql` | Schema completo — tablas, índices, triggers, RLS |
| `supabase/seed.sql` | Función PL/pgSQL `seed_hackathons_for_current_user()` |
| `supabase/migrations/align_tasks_persistence.sql` | Añade columnas tasks: description, category, completed_at, progress_notes, reminder_at, related_* |
| `supabase/migrations/extend_courses_hackathons.sql` | Añade columnas CSV para cursos y hackathons |
| `supabase/migrations/create_tech_opportunities.sql` | Crea tabla tech_opportunities (referencia compartida) |

### 3.3 Funciones / Triggers

| Nombre | Tipo | Descripción |
|---|---|---|
| `public.set_updated_at()` | Trigger function | Actualiza `updated_at` en cada UPDATE |
| `set_<tabla>_updated_at` | Trigger (x9 tablas) | Aplica set_updated_at a cada tabla |
| `seed_hackathons_for_current_user()` | PL/pgSQL function | Seed de hackathons para el usuario autenticado. Usa `auth.uid()` |

---

## 4. Clasificación de usos de Supabase

### A. Supabase usado como PostgreSQL (capa de datos)

**Archivos:** `lib/db.ts`, `lib/actions.ts`, `lib/data.ts`, `lib/tech-opportunities.ts`, scripts de importación  
**Patrón:** `supabase.from(table).select/insert/update/delete`  
**Dificultad:** BAJA — el `pg` package ya está instalado. El SQL subyacente es estándar.  
**Riesgo:** BAJO — reemplazable mecánicamente.  
**Alternativa:** Queries directas con `pg` (Pool/Client), o un query builder ligero como `postgres.js` o `kysely`.

### B. Supabase Auth — sesiones y login básico

**Archivos:** `lib/actions.ts`, `app/api/auth/login/route.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `middleware.ts`  
**Usos:**
- `supabase.auth.signInWithPassword` — login por email+password
- `supabase.auth.signUp` — registro de nuevos perfiles
- `supabase.auth.signOut` — cierre de sesión
- `supabase.auth.getUser` — verificar sesión activa (en middleware y server actions)

**Dificultad:** MEDIA-ALTA — es el núcleo del sistema de sesiones.  
**Riesgo:** ALTO — un error aquí rompe el acceso a la app.  
**Alternativa:** Tabla `users` propia con `bcrypt` para passwords + cookies httpOnly con JWT firmado o `iron-session`. El flujo de login/register/logout es corto y localizado.

### C. Supabase Auth — Admin API

**Archivos:** `lib/supabase/admin.ts`, `lib/auth/google.ts`, `scripts/setup-users.mjs`  
**Usos:**
- `admin.auth.admin.createUser` — creación de usuarios sin confirmación de email (scripts)
- `admin.auth.admin.generateLink` — genera magic link para autenticar vía Google OAuth
- `supabase.auth.verifyOtp` — verifica el token del magic link

**Dificultad:** ALTA para el flujo de Google Calendar.  
**Riesgo:** MEDIO — es solo para Google Calendar OAuth y setup inicial de usuarios.  
**Alternativa:**
- Para setup de usuarios: insertar directo en tabla `users` con password hasheada.
- Para Google Calendar: almacenar los tokens de Google directamente en la DB sin pasar por Supabase Auth. La sesión del usuario ya existirá por el auth propio.

### D. Supabase Storage

**No usado.** Sin archivos, sin buckets.

### E. Supabase Realtime

**No usado.** Sin canales ni suscripciones.

### F. Supabase RPC/functions

**Archivo:** `lib/actions.ts:318`, `scripts/apply-supabase-sql.mjs:46`  
**Uso:**
- `supabase.rpc("seed_hackathons_for_current_user")` — único RPC real de negocio.
- `scripts/apply-supabase-sql.mjs` — intenta RPC `exec_sql/execute_sql/run_sql` como fallback para aplicar migraciones SQL.

**Dificultad:** BAJA — la función seed puede convertirse en un script Node que hace INSERT directo con `pg`.  
**Riesgo:** BAJO.

### G. RLS Policies (Row Level Security)

**Archivos:** `supabase/schema.sql`, todas las migraciones  
**Uso:** Todas las tablas de usuario tienen políticas RLS que usan `auth.uid()`.  
**Dificultad:** MEDIA — las políticas no son complejas (patrón uniforme `auth.uid() = user_id`), pero no existen en PostgreSQL sin Supabase.  
**Riesgo:** MEDIO — sin RLS, la seguridad a nivel de fila recae completamente en la capa de aplicación.  
**Alternativa:** Reemplazar RLS por `WHERE user_id = $userId` en todas las queries. Al ser una app privada con pocos usuarios y queries controladas desde el backend, esto es seguro y más simple.

### H. Google Calendar OAuth ligado a Supabase Auth

**Archivo:** `lib/auth/google.ts`  
**Uso:** `ensureSupabaseSessionFromGoogle` usa la Admin API para crear un magic link y verificarlo, con el objetivo de vincular una identidad Google a una sesión Supabase.  
**Dificultad:** MEDIA — el flujo de Google OAuth es independiente de Supabase Auth; solo se usa Supabase para crear la sesión.  
**Riesgo:** MEDIO — requiere rediseñar cómo se vincula la identidad Google al usuario propio.  
**Alternativa:** En el callback de Google OAuth, buscar el usuario por email en la tabla `users` propia y crear la sesión directamente. Sin magic links.

### I. Scripts CLI — importación y sincronización

**Archivos:** `scripts/import-tech-opportunities.mjs`, `scripts/import-courses.mjs`, `scripts/import-hackathons.mjs`, `scripts/seed-semanal-tasks.mjs`, `scripts/setup-users.mjs`, `scripts/apply-supabase-sql.mjs`, `scripts/check-supabase-remote.mjs`  
**Uso:** Usan `@supabase/supabase-js` con service role key para operaciones de importación masiva.  
**Dificultad:** BAJA-MEDIA — todos pueden migrarse a `pg` directamente con `DATABASE_URL`.  
**Riesgo:** BAJO — scripts auxiliares, no bloquean la app.

---

## 5. Plan de migración por fases

> **IMPORTANTE:** No ejecutar ninguna fase hasta tener el despliegue base de Aidraft en VPS funcionando (PR #1 mergeada y desplegada).

### Fase 0 — Backup y congelación
- Exportar datos actuales de Supabase (pg_dump desde `SUPABASE_DB_URL`).
- Guardar backup en VPS: `/srv/danicode/backups/aidraft_supabase_export_YYYYMMDD.sql`.
- Congelar cambios de schema en Supabase (no crear tablas nuevas allí).
- Documentar usuarios existentes (emails, UUIDs).

### Fase 1 — Crear aidraft_postgres en VPS
- Añadir servicio `aidraft_postgres` a `infra/docker-compose.prod.yml`.
  - Contenedor: `aidraft_postgres`
  - Base de datos: `aidraft`
  - Usuario: `aidraft`
  - Volumen: `aidraft_postgres_data`
- Verificar conectividad desde `aidraft_web`.

### Fase 2 — Migrar schema
- Adaptar `supabase/schema.sql` para PostgreSQL sin Supabase:
  - Eliminar referencias a `auth.users` → crear tabla propia `users`.
  - Eliminar RLS policies (reemplazadas por control a nivel de app).
  - Mantener triggers `set_updated_at` (son SQL estándar).
  - Mantener índices (son SQL estándar).
  - Adaptar `seed_hackathons_for_current_user` para no usar `auth.uid()`.
- Crear script `scripts/setup-schema.mjs` que aplique el schema contra `DATABASE_URL`.

### Fase 3 — Migrar datos
- Exportar tablas de Supabase como CSV o SQL INSERT con `pg_dump`.
- Mapear UUIDs de `auth.users` a la nueva tabla `users` propia.
- Importar con `psql` o script Node sobre `aidraft_postgres`.
- Verificar recuentos de filas por tabla.

### Fase 4 — Adaptar capa de acceso a datos
- Reemplazar `@supabase/supabase-js` y `@supabase/ssr` por `pg` (ya instalado).
- Reescribir `lib/db.ts` (`insertDb`, `updateDb`, `deleteDb`) usando `pg.Pool`.
- Reescribir `lib/actions.ts` — cambiar `supabase.from()` por queries SQL directas o un query builder.
- Eliminar `lib/supabase/` (admin, client, server, middleware, env, fetch).
- Añadir `lib/db/pool.ts` con el Pool de conexiones `pg`.

### Fase 5 — Migrar scripts de import/sync
- Reemplazar `createClient` de `@supabase/supabase-js` en todos los scripts por `pg.Client` con `DATABASE_URL`.
- Actualizar `scripts/supabase-env.mjs` → `scripts/db-env.mjs`.
- Reescribir `scripts/apply-supabase-sql.mjs` → usa solo `pg` sin fallback a RPC.
- Reescribir `scripts/setup-users.mjs` → INSERT directo en tabla `users` con bcrypt.
- Reescribir `scripts/import-*.mjs` → upsert directo con `pg`.

### Fase 6 — Reemplazar Supabase Auth
Este es el paso más delicado. Opciones:

**Opción recomendada para este proyecto:** Auth personalizado mínimo.
- Crear tabla `users` con: `id uuid`, `email text unique`, `password_hash text`, `display_name text`, `created_at`, `updated_at`.
- Usar `bcryptjs` para hashear contraseñas.
- Sesiones con `iron-session` (cookies httpOnly cifradas) o JWT firmado con `jose`.
- Reescribir `lib/actions.ts` (loginProfile, signUp, signOut) para usar la nueva tabla.
- Reescribir `middleware.ts` para verificar sesión propia en lugar de Supabase SSR.
- Eliminar `@supabase/ssr`.

**Para Google Calendar OAuth:**
- En el callback (`app/api/google/calendar/callback`): buscar usuario por email en tabla `users` propia.
- Crear sesión directamente sin pasar por Supabase.
- Eliminar `lib/auth/google.ts:ensureSupabaseSessionFromGoogle` → reemplazar por lógica simple de lookup por email.

### Fase 7 — Validar en local/staging
- Levantar `aidraft_postgres` en local con Docker.
- Aplicar schema, importar datos de prueba.
- Probar login/logout/register.
- Probar todas las rutas protegidas.
- Probar Google Calendar OAuth.
- Probar scripts de importación.
- Ejecutar `npm run lint && npm run typecheck && npm run build`.

### Fase 8 — Cutover controlado en VPS
- Desplegar nueva versión sobre `aidraft_postgres`.
- Apuntar `DATABASE_URL` en `.env` al nuevo contenedor.
- Eliminar variables Supabase del `.env`.
- Recargar contenedor `aidraft_web`.
- Verificar con `curl -I https://aidraft.danielcode.dev/api/health`.
- Probar login en browser.

### Fase 9 — Rollback plan
- El `.env` anterior (con Supabase) está en backup.
- Si algo falla: restaurar `.env` original y redesplegar imagen anterior.
- Los datos migrados no afectan a Supabase (fue una copia, no una migración destructiva).
- Mantener Supabase activo hasta confirmar que todo funciona en producción (mínimo 2 semanas).

---

## 6. Recomendación técnica

### Evaluación de opciones

| Opción | Descripción | Viabilidad | Riesgo |
|---|---|---|---|
| **A** | Mantener Supabase, solo desplegar en VPS | Alta | Bajo — pero dependencia cloud permanente |
| **B** | Migrar solo datos, mantener Supabase Auth | Media | Medio — arquitectura híbrida compleja |
| **C** | Migrar completamente a PostgreSQL propio | Alta | Medio-alto — requiere reemplazar Auth |
| **D** | Migración híbrida por módulos | Media | Medio — deuda técnica temporal |

### Recomendación: Opción C — Migración completa

**Justificación:**

1. **La app es privada y pequeña** — 3 usuarios conocidos (Dani, Luli, Alberto). No se necesita la infraestructura de Supabase Auth para un caso de uso tan acotado.

2. **`pg` ya está instalado** — la fricción de migrar la capa de datos es mínima. Solo hay que cambiar el cliente.

3. **No hay Storage ni Realtime** — los dos casos de uso que harían la migración realmente costosa no existen aquí.

4. **El SQL es estándar** — schema, índices y triggers son PostgreSQL puro. La única excepción son las políticas RLS con `auth.uid()`, reemplazables por `WHERE user_id = $userId`.

5. **Un solo RPC** — `seed_hackathons_for_current_user` es trivial de convertir en un script Node con inserts directos.

6. **Control total en VPS** — elimina la dependencia de un servicio externo (Supabase puede cambiar precios, políticas o sufrir incidencias).

7. **Consistencia con el ecosistema** — Project OS y Home Engine ya usan PostgreSQL propio. Aidraft quedaría alineado con la misma arquitectura.

**El único trabajo significativo** es reemplazar Supabase Auth (~5 archivos + middleware). Para una app personal, un auth propio mínimo con `bcryptjs` + `iron-session` o JWT es más que suficiente y totalmente mantenible.

**Estimación de esfuerzo:**
- Fase 0-3 (infra + schema + datos): 1-2 sesiones de trabajo.
- Fase 4-5 (capa de datos + scripts): 1-2 sesiones.
- Fase 6 (auth): 2-3 sesiones (la más compleja).
- Fase 7-9 (validación + cutover): 1 sesión.

---

## 7. Riesgos principales

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Pérdida de datos en migración | Baja | Crítico | Backup pre-migración + verificación de recuentos |
| Regresión en auth post-migración | Media | Alto | Tests de login/logout + staging antes de producción |
| Google Calendar OAuth roto | Media | Medio | Probar en staging con cuenta real de Google |
| Scripts de import fallando | Baja | Bajo | Están aislados y son refactorizables sin urgencia |
| Secretos expuestos accidentalmente | Baja | Crítico | Nunca commitear `.env`; usar `.env.production.example` |
| Supabase schema no compatible 100% | Baja | Medio | El schema es SQL estándar — solo eliminar `auth.users` FK |

---

## 8. Checklist antes de migrar

- [ ] Aidraft desplegado y funcionando en `aidraft.danielcode.dev` (Fase de VPS deploy readiness completada).
- [ ] Backup completo de Supabase exportado y verificado.
- [ ] `aidraft_postgres` creado y accesible en VPS.
- [ ] Schema nuevo (sin RLS, con tabla `users` propia) aplicado y revisado.
- [ ] Datos importados y recuentos verificados.
- [ ] Auth propio implementado y probado en local.
- [ ] Google Calendar OAuth probado en local con auth propio.
- [ ] Todos los scripts de import actualizados a `pg`.
- [ ] `npm run lint && npm run typecheck && npm run build` pasan.
- [ ] Staging en VPS probado antes del cutover.
- [ ] `.env` de producción actualizado sin variables Supabase.
- [ ] Plan de rollback documentado y probado.

---

## 9. Rollback plan detallado

Si la migración falla en producción:

```bash
# 1. Restaurar .env con Supabase
cp /srv/danicode/backups/aidraft_env_backup .env

# 2. Hacer build y redespliegue con imagen anterior
git checkout <commit-anterior-a-migración>
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build

# 3. Verificar
curl -I https://aidraft.danielcode.dev/api/health
docker logs --tail=50 aidraft_web
```

Los datos en Supabase no se tocan durante la migración (solo se copian), por lo que el rollback es siempre seguro.

---

## 10. Tareas futuras sugeridas

1. **[Fase 1]** Añadir `aidraft_postgres` al `docker-compose.prod.yml` y crear schema sin Supabase. ✅ COMPLETADO
2. **[Fase 2]** VPS sandbox PostgreSQL validation — validar schema en sandbox aislado, plan de importación dry-run. Sin exportar datos reales, sin tocar Supabase remoto ni VPS de producción.
3. **[Fase 3]** Script de exportación/importación de datos desde Supabase a `aidraft_postgres` (solo tras Fase 2).
4. **[Fase 4]** Reemplazar `lib/supabase/` por `lib/db/pool.ts` con `pg`. ✅ POOL CREADO — pendiente reemplazar lib/supabase/
5. **[Fase 5]** Actualizar scripts de import a `pg` + `DATABASE_URL`.
6. **[Fase 6]** Implementar auth propio: tabla `users` + bcryptjs + iron-session/JWT.
7. **[Fase 6]** Adaptar Google Calendar OAuth para no depender de Supabase Auth.
8. **[Post-migración]** Eliminar dependencias `@supabase/supabase-js` y `@supabase/ssr`.
9. **[Post-migración]** Añadir backup automático de `aidraft_postgres` (mismo patrón que Project OS).

---

## 11. Estado de implementación

### Fase 1 — PostgreSQL self-managed foundation (2026-06-10)

**Estado: COMPLETADO (mergeado en main — PR #2)**

Completado en esta fase:

| Artefacto | Estado |
|---|---|
| `infra/docker-compose.prod.yml` — servicio `aidraft_postgres` + red `aidraft_internal` + volumen | ✅ |
| `infra/postgres/schema.sql` — schema completo sin Supabase Auth, tabla `users` propia, sin RLS | ✅ |
| `lib/db/pool.ts` — pool `pg` con helper `query`, lee `DATABASE_URL` | ✅ |
| `scripts/setup-postgres-schema.mjs` — aplica schema contra `DATABASE_URL` | ✅ |
| `scripts/validate-postgres-migration-readiness.mjs` — validador estático Fase 1 | ✅ |
| `.env.production.example` — añadidas `DATABASE_URL` y `POSTGRES_PASSWORD` | ✅ |
| `docs/POSTGRES_MIGRATION_PHASE_1.md` — documentación de la fase | ✅ |

**Lo que sigue usando Supabase (no tocado en esta fase):**

- `lib/supabase/` — clientes Supabase (server, client, admin, middleware, env)
- `lib/actions.ts` — queries de negocio vía `supabase.from()`
- `lib/db.ts` — insertDb / updateDb / deleteDb vía Supabase
- `lib/auth/google.ts` — sesión Google vinculada a Supabase Auth
- `middleware.ts` — sesiones vía `@supabase/ssr`
- `app/api/auth/login/route.ts` — login/registro vía Supabase Auth
- Scripts de importación — usan `@supabase/supabase-js`

**Próxima fase recomendada:** Fase 2 — ver sección siguiente.

---

### Fase 2 — VPS sandbox PostgreSQL validation (2026-06-10)

**Estado: COMPLETADO (mergeado en main — PR #3)**

Preparado en esta fase (sin tocar datos reales, Supabase remoto, VPS ni producción):

| Artefacto | Estado |
|---|---|
| `infra/docker-compose.postgres-sandbox.yml` — PostgreSQL sandbox aislado en 127.0.0.1:54329 | ✅ |
| `scripts/validate-postgres-schema-sandbox.mjs` — aplica schema + valida tablas, índices, triggers | ✅ |
| `infra/postgres/fixtures/minimal-sandbox-seed.sql` — datos mínimos no sensibles | ✅ |
| `docs/POSTGRES_MIGRATION_PHASE_2.md` — documentación, plan dry-run y checklist Fase 3 | ✅ |
| `package.json` — scripts `postgres:sandbox:up/down/logs/down:volumes` y `postgres:schema:validate-sandbox` | ✅ |
| `scripts/validate-postgres-migration-readiness.mjs` — actualizado con checks de Fase 2 | ✅ |

**No se ha hecho en esta fase:**
- No se exportaron datos reales de Supabase
- No se tocó Supabase remoto
- No se tocó VPS ni `docker-compose.prod.yml`
- No se aplicó schema en producción
- No se eliminó Supabase de la aplicación
- No se desplegó nada

**Próxima fase:** Fase 3 — ver sección siguiente.

---

### Fase 3A — Data migration tooling (2026-06-10)

**Estado: COMPLETADO (mergeado en main — PR #4)**

Preparado en esta fase (no se exportó ni importó nada real):

| Artefacto | Estado |
|---|---|
| `scripts/migration/export-supabase-data.mjs` — export Supabase → JSON con doble guardia | ✅ |
| `scripts/migration/import-sandbox-data.mjs` — import JSON → sandbox con transacción | ✅ |
| `scripts/migration/verify-sandbox-migration.mjs` — verifica recuentos sandbox vs manifest | ✅ |
| `scripts/migration/validate-migration-artifacts.mjs` — validador estático de seguridad | ✅ |
| `migration-artifacts/` en `.gitignore` | ✅ |
| `docs/POSTGRES_MIGRATION_PHASE_3.md` — documentación, variables, checklist Fase 3B | ✅ |
| `package.json` — scripts `migration:export:supabase`, `migration:import:sandbox`, `migration:verify:sandbox`, `migration:validate:artifacts` | ✅ |
| `scripts/validate-postgres-migration-readiness.mjs` — actualizado con checks de Fase 3A | ✅ |

**No se hizo en esta fase:**
- No se exportaron datos reales de Supabase
- No se tocó Supabase remoto
- No se tocó VPS de producción ni `docker-compose.prod.yml`
- No se aplicó schema en producción
- No se eliminó Supabase de la aplicación
- No se desplegó nada

---

### Fase 3B — Sandbox data migration execution (2026-06-11)

**Estado: COMPLETADO — VPS sandbox validado**

Export desde Supabase ejecutado en modo solo lectura. Import al PostgreSQL sandbox
completado. Verificación de recuentos OK. No se tocó producción.

**Resultado real:**

| Tabla | Filas |
|---|---|
| `users` | 1 |
| `profiles` | 1 |
| `sources` | 0 |
| `quick_searches` | 0 |
| `opportunities` | 0 |
| `hackathons` | 21 |
| `courses` | 22 |
| `tasks` | 15 |
| `reminders` | 0 |
| `quick_links` | 0 |
| `tech_opportunities` | 43 |
| **Total** | **103** |

- `auth.users` accesible directamente (no se usó fallback de email placeholder)
- Filas insertadas: 103 — Saltadas: 0
- `migration:verify:sandbox`: 11 tablas OK, recuentos coinciden con manifest
- Artifacts generados solo en VPS, no commiteados

**No se hizo en esta fase:**
- No se tocó producción ni `docker-compose.prod.yml`
- No se tocó Caddy ni DNS
- No se modificó auth ni se eliminaron dependencias Supabase
- No se desplegó nada

**Próxima fase:** Fase 5 — migrar scripts de importación a `pg`.

---

### Fase 4 — PostgreSQL application integration (2026-06-11)

**Estado: COMPLETADO — capa repositorio creada, datos migrados a PostgreSQL**

Capa repositorio creada para las 11 tablas. Todas las lecturas y escrituras de datos
de negocio migradas a PostgreSQL propio. Auth sigue en Supabase (pendiente Fase 6).

| Artefacto | Estado |
|---|---|
| `lib/db/repositories/` (11 archivos) | ✅ |
| `lib/db/types.ts` — tipos PostgreSQL añadidos | ✅ |
| `lib/auth/current-user.ts` — helper userId temporal | ✅ |
| `lib/data.ts` — getGlobalStore usa repositorios | ✅ |
| `lib/actions.ts` — datos via repositorios (auth sigue en Supabase) | ✅ |
| `lib/db.ts` — insertDb/updateDb/deleteDb via PostgreSQL | ✅ |
| `lib/tech-opportunities.ts` — fetch via `/api/tech-opportunities` | ✅ |
| `app/api/seed/route.ts` — usa repositorios PostgreSQL | ✅ |
| `scripts/postgres/set-user-password.mjs` — tooling Fase 6 | ✅ |
| `scripts/validate-postgres-app-integration.mjs` | ✅ |
| `docs/POSTGRES_APP_INTEGRATION_AUDIT.md` | ✅ |
| `docs/POSTGRES_MIGRATION_PHASE_4.md` | ✅ |

**Dependencias Supabase restantes (post-Fase 4 + fix profiles):**
- Auth: `loginProfile`, `signOut`, `middleware.ts`, `lib/auth/google.ts` → Fase 6
- Scripts de importación → Fase 5
- `profile.upsert` en Supabase: **eliminado** — sustituido por `ensurePostgresUserForSupabaseUser` (PostgreSQL)

**No se hizo en esta fase:**
- No se tocó VPS ni producción
- No se modificó auth
- No se eliminaron dependencias `@supabase/ssr` ni `@supabase/supabase-js`
- No se desplegó nada

**Próxima fase:** Fase 5 — migrar scripts de importación a `pg` + `DATABASE_URL`.
