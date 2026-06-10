# Fase 1 — PostgreSQL self-managed foundation

**Rama:** `feat/aidraft-postgres-migration-audit`  
**Fecha:** 2026-06-10  
**Estado:** Completado (pendiente deploy)

---

## Qué se ha añadido

### Infraestructura Docker

**`infra/docker-compose.prod.yml`**

- Nuevo servicio `aidraft_postgres` (imagen `postgres:17-alpine`)
- Variables: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- Healthcheck: `pg_isready` antes de que `aidraft_web` arranque
- Red interna `aidraft_internal` — PostgreSQL no expone puerto externo
- `aidraft_web` conectado a `danicode_web` (Caddy) y `aidraft_internal`
- Nuevo volumen `aidraft_postgres_data` para persistencia

### Schema SQL limpio

**`infra/postgres/schema.sql`**

- Sin `auth.users`, sin `auth.uid()`, sin RLS
- Nueva tabla `public.users` con `id`, `email`, `password_hash`, `display_name`, `role`
- FK `user_id → public.users(id)` en las 10 tablas de negocio
- Triggers `updated_at` estándar PostgreSQL
- Todos los índices del schema original preservados
- Usa extensión `pgcrypto` para `gen_random_uuid()`

### Pool de conexión

**`lib/db/pool.ts`**

- `import "server-only"` — no filtrable al cliente
- Lee `DATABASE_URL` del entorno; lanza error claro si falta
- Exporta `pool` (Pool), `query<T>()` helper y `end()`
- Tipado completo con `@types/pg`

### Scripts

**`scripts/setup-postgres-schema.mjs`**

- Lee `.env` si existe, comprueba `DATABASE_URL`
- Rechaza valores `REPLACE_ME` antes de conectar
- Aplica `infra/postgres/schema.sql` con `pg` Client
- Sin dependencias Supabase

**`scripts/validate-postgres-migration-readiness.mjs`**

- Validación estática (sin conexión real)
- Comprueba existencia de archivos, contenido de docker-compose, .env.example, schema y pool
- Sale con código 1 si hay problemas

---

## Variables de entorno necesarias

En `.env` (local) o en el entorno del contenedor VPS:

```
DATABASE_URL=postgresql://aidraft:<password>@aidraft_postgres:5432/aidraft
POSTGRES_PASSWORD=<password>
```

El archivo `.env.production.example` tiene ambas variables con `REPLACE_ME` como placeholder.

Las variables Supabase se mantienen en `.env.production.example` con una nota explicando que se eliminarán cuando la aplicación deje de usarlas.

---

## Lo que NO se ha cambiado

Esta fase es **no destructiva**. Todo lo siguiente sigue funcionando igual que antes:

| Componente | Estado |
|---|---|
| `lib/supabase/` — clientes Supabase | Sin cambios |
| `lib/actions.ts` — queries de negocio vía supabase | Sin cambios |
| `lib/db.ts` — insertDb/updateDb/deleteDb | Sin cambios |
| `lib/auth/google.ts` — OAuth Google via Supabase | Sin cambios |
| `middleware.ts` — sesiones `@supabase/ssr` | Sin cambios |
| `app/api/auth/` — login/registro Supabase Auth | Sin cambios |
| Scripts de importación | Sin cambios |

---

## Rollback

Para revertir completamente esta fase:

```bash
git revert HEAD  # o git reset si no se ha mergeado
```

No hay migración de datos en esta fase, por lo que no hay estado que deshacer en la base de datos.

---

## Uso en VPS (cuando se despliegue)

1. Copiar `.env.production.example` a `.env` y rellenar `POSTGRES_PASSWORD` y `DATABASE_URL`
2. Arrancar el stack: `docker compose -f infra/docker-compose.prod.yml up -d`
3. Aplicar schema: `npm run postgres:setup`
4. Verificar: `npm run validate:postgres-migration`

---

## Próximas fases

- **Fase 3** — Exportar datos de Supabase e importarlos en `aidraft_postgres`
- **Fase 4** — Reemplazar `lib/supabase/` por queries `lib/db/pool.ts`
- **Fase 5** — Actualizar scripts de importación a `pg` + `DATABASE_URL`
- **Fase 6** — Auth propio: `bcryptjs` + `iron-session`/JWT, eliminar Supabase Auth
- **Fase 7** — Validación en staging, cutover, plan de rollback

Ver [SUPABASE_TO_POSTGRES_AUDIT.md](./SUPABASE_TO_POSTGRES_AUDIT.md) para el inventario completo de dependencias Supabase.
