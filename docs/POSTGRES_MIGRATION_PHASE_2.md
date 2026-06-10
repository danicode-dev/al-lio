# Fase 2 — Validación sandbox del schema PostgreSQL

**Rama:** `feat/aidraft-postgres-phase-2-local-validation`  
**Fecha:** 2026-06-10  
**Estado:** Completado (pendiente merge)

---

## Objetivo

Verificar que `infra/postgres/schema.sql` funciona correctamente en un PostgreSQL sandbox
temporal antes de usarlo en el VPS. Esta fase no toca datos reales, Supabase remoto, VPS de
producción ni producción; la validación se ejecutará en VPS sandbox aislado cuando Dani lo autorice.

**Lo que se hace en esta fase:**
- Levantar un PostgreSQL sandbox con Docker (aislado, puerto vinculado a 127.0.0.1)
- Aplicar el schema limpio (sin Supabase Auth) contra ese sandbox
- Verificar tablas, índices, triggers e integridad referencial
- Insertar y limpiar datos mínimos de prueba
- Preparar el plan de importación (dry-run, sin ejecutarlo)

**Lo que NO se hace en esta fase:**
- No se exportan datos reales de Supabase
- No se toca Supabase remoto
- No se toca el VPS de producción ni `docker-compose.prod.yml`; la validación se ejecutará en VPS sandbox aislado cuando Dani lo autorice
- No se aplica schema en producción
- No se elimina Supabase de la aplicación
- No se despliega nada

---

## Artefactos añadidos en esta fase

| Artefacto | Descripción |
|---|---|
| `infra/docker-compose.postgres-sandbox.yml` | PostgreSQL sandbox temporal, aislado en 127.0.0.1:54329 |
| `scripts/validate-postgres-schema-sandbox.mjs` | Aplica schema y valida tablas/índices/triggers |
| `infra/postgres/fixtures/minimal-sandbox-seed.sql` | Datos mínimos no sensibles para validación |
| `docs/POSTGRES_MIGRATION_PHASE_2.md` | Este documento |

---

## Cómo levantar el sandbox PostgreSQL

```bash
npm run postgres:sandbox:up
```

Arranca `aidraft_postgres_sandbox` (puerto `127.0.0.1:54329`, no expuesto a la red) usando
`infra/docker-compose.postgres-sandbox.yml`. Espera unos segundos a que el healthcheck pase
antes de ejecutar la validación.

Credenciales sandbox (sin valor fuera del entorno de desarrollo):

```
POSTGRES_USER: aidraft_sandbox
POSTGRES_PASSWORD: aidraft_sandbox_password
POSTGRES_DB: aidraft_sandbox
URL: postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox
```

Para ver los logs:

```bash
npm run postgres:sandbox:logs
```

Para apagar (conservando el volumen):

```bash
npm run postgres:sandbox:down
```

Para apagar y eliminar el volumen sandbox:

```bash
npm run postgres:sandbox:down:volumes
```

---

## Cómo aplicar el schema en el sandbox

El script `scripts/setup-postgres-schema.mjs` (Fase 1) puede aplicar el schema pasando
la URL explícitamente:

```bash
DATABASE_URL=postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox \
  npm run postgres:setup
```

O ejecutar directamente la validación completa (no requiere ninguna variable de entorno —
usa `127.0.0.1:54329/aidraft_sandbox` por defecto):

```bash
npm run postgres:schema:validate-sandbox
```

Override si necesitas apuntar a un sandbox alternativo (nunca a producción):

```bash
POSTGRES_SANDBOX_DATABASE_URL=postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox \
  npm run postgres:schema:validate-sandbox
```

El script valida la URL antes de conectar: rechaza cualquier host que no sea
`localhost`/`127.0.0.1`, cualquier puerto distinto de `54329`, cualquier base de datos
distinta de `aidraft_sandbox` y cualquier usuario distinto de `aidraft_sandbox`. No carga
`.env` ni lee `DATABASE_URL`.

---

## Cómo ejecutar la validación completa

```bash
# 1. Levantar el sandbox
npm run postgres:sandbox:up

# 2. Esperar a que esté listo (healthcheck: pg_isready)
# El script detecta ECONNREFUSED y da instrucciones si no está listo.

# 3. Ejecutar validación
npm run postgres:schema:validate-sandbox

# 4. Apagar (opcional — el volumen persiste para reutilizar)
npm run postgres:sandbox:down
```

---

## Qué se valida

El script `scripts/validate-postgres-schema-sandbox.mjs` comprueba:

1. Que la URL de conexión apunta a `127.0.0.1:54329`, base `aidraft_sandbox`, usuario `aidraft_sandbox`
2. Que `infra/postgres/schema.sql` existe y se puede aplicar sin errores
3. Que las 11 tablas esperadas existen: `users`, `profiles`, `sources`, `quick_searches`,
   `opportunities`, `hackathons`, `courses`, `tech_opportunities`, `tasks`, `reminders`,
   `quick_links`
4. Que los índices clave existen: `sources_user_id_idx`, `opportunities_user_status_idx`,
   `tasks_user_due_idx`, `reminders_user_remind_idx`
5. Que la función `set_updated_at` existe
6. Que los triggers `updated_at` están registrados (≥10)
7. Que se puede insertar un usuario de prueba y tablas dependientes (FK OK)
8. Que el trigger `updated_at` se dispara tras un UPDATE
9. Que los datos de prueba se eliminan con CASCADE

El script nunca imprime credenciales ni la URL completa.

---

## Fixtures mínimos

`infra/postgres/fixtures/minimal-sandbox-seed.sql` contiene datos de prueba no sensibles:

- Email: `demo@example.test` (dominio `.test`, nunca real)
- Nombre: `Demo User`
- Una oportunidad, una tarea y una fuente de prueba

Para cargar los fixtures contra el sandbox:

```bash
psql postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox \
  -f infra/postgres/fixtures/minimal-sandbox-seed.sql
```

O con Docker si no tienes `psql` instalado:

```bash
docker exec -i aidraft_postgres_sandbox \
  psql -U aidraft_sandbox -d aidraft_sandbox \
  < infra/postgres/fixtures/minimal-sandbox-seed.sql
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

# Exportar datos (sin auth.* — usaremos nuestra propia tabla users)
pg_dump "$SUPABASE_DB_URL" --data-only --no-owner --no-acl \
  --exclude-table=auth.* \
  -f /tmp/supabase-data-backup.sql
```

### 2. Adaptación de datos (a implementar en Fase 3)

- La tabla `public.users` en Supabase referencia `auth.users` (Supabase gestiona los IDs).
  Hay que mapear `auth.uid` → `public.users.id` en el nuevo schema.
- Los registros de usuario se crearán en la nueva `public.users` con sus emails y
  `password_hash` vacío; se completarán en Fase 6 (auth propio).

### 3. Import al sandbox (a ejecutar en Fase 3, primero en sandbox)

```bash
# Aplicar schema limpio
DATABASE_URL=postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox \
  npm run postgres:setup

# Importar datos adaptados
psql "$POSTGRES_SANDBOX_DATABASE_URL" -f /tmp/data-adaptado.sql
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

- [ ] `npm run postgres:schema:validate-sandbox` pasa sin errores
- [ ] Schema revisado y confirmado correcto (columnas, tipos, constraints)
- [ ] Plan de importación revisado y aprobado
- [ ] Backup de Supabase exportado y guardado en lugar seguro
- [ ] PostgreSQL en VPS levantado y accesible desde la red interna
- [ ] `.env` de VPS actualizado con `DATABASE_URL` y `POSTGRES_PASSWORD` reales
- [ ] Script de importación probado en sandbox con datos de prueba
- [ ] Plan de rollback documentado y probado
- [ ] `npm run lint && npm run typecheck && npm run build` pasan

---

## Rollback

Esta fase no modifica datos ni infraestructura real. Para revertir:

```bash
git revert HEAD  # o git reset si no se ha mergeado
npm run postgres:sandbox:down:volumes  # elimina el sandbox y su volumen
```

El estado de Supabase y del VPS de producción no cambia.

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Schema incompatible con datos reales de Supabase | Validación sandbox en Fase 2; datos dry-run en Fase 3 antes del cutover |
| Pérdida de datos al migrar | Supabase no se toca hasta que import+verify OK; rollback siempre disponible |
| `updated_at` triggers no disparándose | Validados explícitamente en el script sandbox |
| FK violaciones al importar datos | Import ordenado: primero `users`, luego tablas dependientes |
| `password_hash` vacío tras import | Usuarios existentes harán reset de contraseña en Fase 6 |
| Conexión accidental a producción | Script valida host/puerto/db/usuario antes de conectar; no lee `.env` ni `DATABASE_URL` |

---

## Próxima fase

**Fase 3** — Export/import de datos desde Supabase a `aidraft_postgres`. Solo se inicia
tras completar el checklist anterior y obtener confirmación explícita.

Ver [SUPABASE_TO_POSTGRES_AUDIT.md](./SUPABASE_TO_POSTGRES_AUDIT.md) para el inventario
completo de dependencias Supabase.
