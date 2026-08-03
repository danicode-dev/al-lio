# Fase 3 — Data migration tooling & dry-run planning

**Rama:** `feat/aidraft-postgres-phase-3-data-migration-tooling`  
**Fecha:** 2026-06-10  
**Estado:** Fases 3A y 3B completadas — sandbox validado (2026-06-11)

---

## Objetivo

Esta fase tiene dos partes:

- **Fase 3A (esta PR):** Crear las herramientas de migración de datos. No se exporta ni
  importa nada real. Solo se preparan scripts, validadores y documentación.

- **Fase 3B (completada — 2026-06-11):** Export desde Supabase ejecutado en modo solo
  lectura. Import al PostgreSQL sandbox ejecutado correctamente. Verificación de recuentos
  OK. No se tocó producción, Caddy, DNS ni auth.

---

## Lo que se hace en Fase 3A

- Script de export desde Supabase con guardas de doble confirmación
- Script de import al sandbox con validación de URL y transacción
- Script de verificación de recuentos sandbox vs manifest
- Validador estático de seguridad de artifacts
- `migration-artifacts/` añadida a `.gitignore`

## Lo que NO se hace en Fase 3A

- No se exportan datos reales de Supabase
- No se toca Supabase remoto
- No se toca el VPS de producción ni `docker-compose.prod.yml`
- No se aplica schema en producción
- No se importan datos al sandbox todavía
- No se elimina Supabase Auth de la aplicación
- No se despliega nada

---

## Artefactos añadidos en Fase 3A

| Artefacto | Descripción |
|---|---|
| `scripts/migration/export-supabase-data.mjs` | Exporta datos Supabase → JSON locales |
| `scripts/migration/import-sandbox-data.mjs` | Importa JSON → PostgreSQL sandbox |
| `scripts/migration/verify-sandbox-migration.mjs` | Verifica recuentos sandbox vs manifest |
| `scripts/migration/validate-migration-artifacts.mjs` | Validador estático de seguridad |
| `migration-artifacts/` en `.gitignore` | Carpeta de exports locales, nunca commiteada |
| `docs/POSTGRES_MIGRATION_PHASE_3.md` | Este documento |

---

## Variables de entorno necesarias para Fase 3B

### Para export (solo cuando se autorice)

```bash
SUPABASE_DB_URL=postgresql://...         # URL de conexión directa Supabase (no anon key)
AL_LIO_ALLOW_SUPABASE_EXPORT=true        # Primera confirmación (debe ser exactamente "true")
AL_LIO_EXPORT_CONFIRMATION=EXPORT_SUPABASE_TO_LOCAL_JSON  # Segunda confirmación
```

### Para import al sandbox

```bash
# Por defecto usa la URL sandbox estándar. Override si es necesario:
POSTGRES_SANDBOX_DATABASE_URL=postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox

# Opcional — limpiar sandbox antes de importar:
AL_LIO_SANDBOX_IMPORT_RESET=true
```

---

## Cómo exportar datos de Supabase (Fase 3B — completada)

El script usa conexión PostgreSQL directa (`SUPABASE_DB_URL`), no la API REST de Supabase.
Es **solo lectura** en Supabase — no modifica nada.

Dos intentos para obtener usuarios:
1. Leer `auth.users` directamente (requiere permisos de superuser en la DB URL)
2. Fallback: construir tabla `users` desde `DISTINCT user_id` de tablas de negocio,
   con email placeholder `migrated-<uuid>@example.test`

```bash
# Solo ejecutar cuando Dani lo autorice explícitamente
SUPABASE_DB_URL="postgresql://..." \
AL_LIO_ALLOW_SUPABASE_EXPORT=true \
AL_LIO_EXPORT_CONFIRMATION=EXPORT_SUPABASE_TO_LOCAL_JSON \
npm run migration:export:supabase
```

Los archivos se guardan en:

```
migration-artifacts/supabase-export-YYYYMMDD-HHMMSS/
  users.json
  profiles.json
  sources.json
  quick_searches.json
  opportunities.json
  hackathons.json
  courses.json
  tasks.json
  reminders.json
  quick_links.json
  tech_opportunities.json
  manifest.json
```

---

## Cómo importar al sandbox (Fase 3B — completada)

```bash
# 1. Levantar sandbox
npm run postgres:sandbox:up

# 2. Aplicar schema limpio
DATABASE_URL=postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox \
  npm run postgres:setup

# 3. Importar (sin reset)
npm run migration:import:sandbox migration-artifacts/supabase-export-YYYYMMDD-HHMMSS

# 3b. Con reset previo (borra todo el sandbox antes)
AL_LIO_SANDBOX_IMPORT_RESET=true \
npm run migration:import:sandbox migration-artifacts/supabase-export-YYYYMMDD-HHMMSS
```

---

## Cómo verificar recuentos

```bash
npm run migration:verify:sandbox migration-artifacts/supabase-export-YYYYMMDD-HHMMSS
```

Compara los recuentos del `manifest.json` con los recuentos reales del sandbox.
Falla si hay discrepancias.

---

## Cómo borrar artifacts locales

```bash
# Eliminar un export concreto
rm -rf migration-artifacts/supabase-export-YYYYMMDD-HHMMSS

# Eliminar todos los exports
rm -rf migration-artifacts/
```

`migration-artifacts/` está en `.gitignore` y nunca se commitea.

---

## Validador estático de seguridad

```bash
npm run migration:validate:artifacts
```

Comprueba (sin conexión real):
- `migration-artifacts/` está en `.gitignore`
- No hay archivos JSON de export staged en git
- No hay `.sql`/`.dump`/`.backup` staged
- No hay `.env` staged
- Los scripts de migración no imprimen connection strings completas
- Los scripts de migración tienen guardas de doble confirmación

---

## Checklist Fase 3B en VPS sandbox — COMPLETADO (2026-06-11)

- [x] `npm run postgres:schema:validate-sandbox` pasa sin errores (sandbox levantado)
- [x] `npm run migration:validate:artifacts` pasa
- [x] `SUPABASE_DB_URL` disponible y comprobada (conexión directa, no anon key)
- [x] Backup de Supabase realizado y guardado fuera del repo
- [x] Dani ha autorizado explícitamente el export
- [x] Export ejecutado y `manifest.json` revisado (recuentos razonables)
- [x] Import al sandbox ejecutado correctamente
- [x] `npm run migration:verify:sandbox` pasa (recuentos coinciden)
- [x] `npm run lint && npm run typecheck && npm run build` pasan

## Resultado real de Fase 3B (2026-06-11)

Export desde Supabase ejecutado en modo solo lectura. `auth.users` accesible directamente.

| Tabla | Filas exportadas / importadas |
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

- Filas insertadas: 103 — Saltadas: 0
- `migration:verify:sandbox`: 11 tablas OK, recuentos coinciden con manifest

**Lo que NO se hizo:**
- No se tocó producción ni `docker-compose.prod.yml`
- No se tocó Caddy ni DNS
- No se modificó auth ni se eliminaron dependencias Supabase
- No se desplegó nada
- Los artifacts (`migration-artifacts/`) se generaron solo en VPS y no están commiteados

---

## Rollback

Fase 3A no modifica datos ni infraestructura real. Para revertir:

```bash
git revert HEAD
```

Fase 3B (import al sandbox) es reversible con:

```bash
AL_LIO_SANDBOX_IMPORT_RESET=true \
npm run migration:import:sandbox <otra-carpeta-o-vacío>
# o simplemente:
npm run postgres:sandbox:down:volumes && npm run postgres:sandbox:up
# relanzar schema:
DATABASE_URL=... npm run postgres:setup
```

El estado de Supabase y del VPS de producción no cambia en ningún caso.

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Export accidental sin autorización | Dos variables de confirmación requeridas; script bloquea si faltan |
| Datos exportados commiteados | `migration-artifacts/` en `.gitignore`; validador `migration:validate:artifacts` lo detecta |
| Conexión accidental a producción desde import | Script valida host/puerto/db/usuario antes de conectar |
| Import sin schema aplicado primero | Falla con FK error — documentado; aplicar `postgres:setup` primero |
| Recuentos incorrectos tras import | `migration:verify:sandbox` compara contra manifest |
| `auth.users` inaccesible (permisos Supabase) | Fallback automático: emails `migrated-<uuid>@example.test` |
| `password_hash` vacío | Previsto — los usuarios harán reset en Fase 6 (auth propio) |

---

## Próxima fase

**Fase 4** — Reemplazar `lib/supabase/` con queries directas usando `lib/db/pool.ts`.

Ver [SUPABASE_TO_POSTGRES_AUDIT.md](./SUPABASE_TO_POSTGRES_AUDIT.md) para el inventario
completo de dependencias Supabase.
