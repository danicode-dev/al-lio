# Fase 2 — Validación local del schema PostgreSQL

**Rama:** `feat/aidraft-postgres-phase-2-local-validation`  
**Fecha:** 2026-06-10  
**Estado:** Completado (pendiente merge)

---

## Objetivo

Verificar que `infra/postgres/schema.sql` funciona correctamente en un PostgreSQL local y
temporal antes de usarlo en el VPS. Esta fase no toca datos reales, Supabase remoto, VPS ni
producción.

**Lo que se hace en esta fase:**
- Levantar un PostgreSQL local/temporal con Docker
- Aplicar el schema limpio (sin Supabase Auth) contra ese PostgreSQL local
- Verificar tablas, índices, triggers e integridad referencial
- Insertar y limpiar datos mínimos de prueba
- Preparar el plan de importación (dry-run, sin ejecutarlo)

**Lo que NO se hace en esta fase:**
- No se exportan datos reales de Supabase
- No se toca Supabase remoto
- No se toca el VPS ni `docker-compose.prod.yml`
- No se aplica schema en producción
- No se elimina Supabase de la aplicación
- No se despliega nada

---

## Artefactos añadidos en esta fase

| Artefacto | Descripción |
|---|---|
| `infra/docker-compose.postgres-local.yml` | PostgreSQL local/temporal solo para pruebas |
| `scripts/validate-postgres-schema-local.mjs` | Aplica schema y valida tablas/índices/triggers |
| `infra/postgres/fixtures/minimal-local-seed.sql` | Datos mínimos no sensibles para validación |
| `docs/POSTGRES_MIGRATION_PHASE_2.md` | Este documento |

---

## Cómo levantar PostgreSQL local

```bash
npm run postgres:local:up
```

Esto arranca `aidraft_postgres_local` (puerto local `54329`) usando
`infra/docker-compose.postgres-local.yml`. Espera unos segundos a que el healthcheck pase
antes de ejecutar la validación.

Credenciales locales (sin valor fuera de la máquina de desarrollo):

```
POSTGRES_USER: aidraft
POSTGRES_PASSWORD: aidraft_local_password
POSTGRES_DB: aidraft
URL: postgresql://aidraft:aidraft_local_password@localhost:54329/aidraft
```

Para ver los logs:

```bash
npm run postgres:local:logs
```

Para apagar y limpiar:

```bash
npm run postgres:local:down
```

---

## Cómo aplicar el schema local

El script `scripts/setup-postgres-schema.mjs` (añadido en Fase 1) puede usarse contra el
PostgreSQL local pasando la URL explícitamente:

```bash
DATABASE_URL=postgresql://aidraft:aidraft_local_password@localhost:54329/aidraft \
  npm run postgres:setup
```

O ejecutar directamente la validación completa:

```bash
npm run postgres:schema:validate-local
```

---

## Cómo ejecutar la validación completa

```bash
# 1. Levantar PostgreSQL local
npm run postgres:local:up

# 2. Esperar a que esté listo (healthcheck: pg_isready)
# El script detecta ECONNREFUSED y da instrucciones si no está listo.

# 3. Ejecutar validación
npm run postgres:schema:validate-local

# 4. Apagar (opcional — el volumen persiste para reutilizar)
npm run postgres:local:down
```

---

## Qué se valida

El script `scripts/validate-postgres-schema-local.mjs` comprueba:

1. Que `infra/postgres/schema.sql` existe y se puede aplicar sin errores
2. Que las 11 tablas esperadas existen: `users`, `profiles`, `sources`, `quick_searches`,
   `opportunities`, `hackathons`, `courses`, `tech_opportunities`, `tasks`, `reminders`,
   `quick_links`
3. Que los índices clave existen: `sources_user_id_idx`, `opportunities_user_status_idx`,
   `tasks_user_due_idx`, `reminders_user_remind_idx`
4. Que la función `set_updated_at` existe
5. Que los triggers `updated_at` están registrados (≥10)
6. Que se puede insertar un usuario de prueba y tablas dependientes (FK OK)
7. Que el trigger `updated_at` se dispara tras un UPDATE
8. Que los datos de prueba se eliminan con CASCADE

El script nunca imprime `DATABASE_URL` completa ni credenciales.

---

## Fixtures mínimos

`infra/postgres/fixtures/minimal-local-seed.sql` contiene datos de prueba no sensibles:

- Email: `demo@example.test` (dominio `.test`, nunca real)
- Nombre: `Demo User`
- Una oportunidad, una tarea y una fuente de prueba

Para cargar los fixtures contra el PostgreSQL local:

```bash
psql postgresql://aidraft:aidraft_local_password@localhost:54329/aidraft \
  -f infra/postgres/fixtures/minimal-local-seed.sql
```

O con Docker si no tienes `psql` instalado:

```bash
docker exec -i aidraft_postgres_local psql -U aidraft -d aidraft \
  < infra/postgres/fixtures/minimal-local-seed.sql
```

---

## Plan dry-run de export/import (Fase 3 — pendiente)

Este es el plan para Fase 3, documentado aquí pero **no ejecutado**. Nada de lo siguiente
se hace en Fase 2.

### 1. Export desde Supabase (a ejecutar solo en Fase 3)

```bash
# Exportar schema (solo referencia — ya tenemos schema.sql propio)
pg_dump "$SUPABASE_DB_URL" --schema-only --no-owner --no-acl \
  -f /tmp/supabase-schema-backup.sql

# Exportar datos (sin auth.users — usaremos nuestra propia tabla users)
pg_dump "$SUPABASE_DB_URL" --data-only --no-owner --no-acl \
  --exclude-table=auth.* \
  -f /tmp/supabase-data-backup.sql
```

### 2. Adaptación de datos (a implementar en Fase 3)

- La tabla `public.users` en Supabase referencia `auth.users` (Supabase gestiona los IDs).
  Hay que mapear `auth.uid` → `public.users.id` en el nuevo schema.
- Los registros de usuario se crearán en la nueva tabla `public.users` con sus emails y
  `password_hash` vacío (o un hash temporal); se completarán en Fase 6 (auth propio).

### 3. Import al PostgreSQL local (a ejecutar en Fase 3, primero en local)

```bash
# Aplicar schema limpio primero
npm run postgres:setup  # contra PostgreSQL local con DATABASE_URL local

# Importar datos adaptados
psql "$DATABASE_URL" -f /tmp/data-adaptado.sql
```

### 4. Verificación de recuentos (a ejecutar en Fase 3)

```sql
SELECT
  (SELECT COUNT(*) FROM public.opportunities) AS opportunities,
  (SELECT COUNT(*) FROM public.hackathons)    AS hackathons,
  (SELECT COUNT(*) FROM public.courses)       AS courses,
  (SELECT COUNT(*) FROM public.tasks)         AS tasks;
```

---

## Checklist antes de tocar Supabase real

Completar todo esto antes de ejecutar cualquier export/import real:

- [ ] `npm run postgres:schema:validate-local` pasa sin errores
- [ ] Schema revisado y confirmado correcto (columnas, tipos, constraints)
- [ ] Plan de importación revisado y aprobado
- [ ] Backup de Supabase exportado y guardado en lugar seguro
- [ ] PostgreSQL en VPS levantado y accesible desde la red interna
- [ ] `.env` de VPS actualizado con `DATABASE_URL` y `POSTGRES_PASSWORD` reales
- [ ] Script de importación probado en local con datos de prueba
- [ ] Plan de rollback documentado y probado
- [ ] `npm run lint && npm run typecheck && npm run build` pasan

---

## Rollback

Esta fase no modifica datos ni infraestructura real. Para revertir:

```bash
git revert HEAD  # o git reset si no se ha mergeado
docker compose -f infra/docker-compose.postgres-local.yml down -v  # elimina volumen local
```

El estado de Supabase y del VPS no cambia.

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Schema incompatible con datos reales de Supabase | Validación local en Fase 2; datos dry-run en Fase 3 antes del cutover |
| Pérdida de datos al migrar | Supabase no se toca hasta que import+verify OK; rollback siempre disponible |
| `updated_at` triggers no disparándose | Validados explícitamente en este script |
| FK violaciones al importar datos | Import ordenado: primero `users`, luego tablas dependientes |
| `password_hash` vacío tras import | Usuarios existentes deberán hacer reset de contraseña en Fase 6 (o se usa Supabase Auth hasta Fase 6) |

---

## Próxima fase

**Fase 3** — Export/import de datos desde Supabase a `aidraft_postgres`. Solo se inicia
tras completar el checklist anterior y obtener confirmación explícita.

Ver [SUPABASE_TO_POSTGRES_AUDIT.md](./SUPABASE_TO_POSTGRES_AUDIT.md) para el inventario
completo de dependencias Supabase.
