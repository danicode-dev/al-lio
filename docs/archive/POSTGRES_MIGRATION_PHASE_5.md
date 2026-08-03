# Fase 5 — Preparación despliegue VPS producción

**Rama:** `feat/al-lio-vps-production-deploy-readiness`
**Fecha:** 2026-06-11
**Estado:** Preparación completada — listo para ejecutar en VPS cuando Dani lo decida

---

## Objetivo

Preparar todos los artefactos de infra, ejemplo de env y validadores necesarios para
desplegar al-lio en el VPS con PostgreSQL propio en producción real.

No se tocó el VPS ni ningún entorno real.

---

## Nombres finales de producción

| Recurso | Nombre final |
|---|---|
| Contenedor app | `al_lio_web` |
| Contenedor PostgreSQL | `al_lio_postgres` |
| Volumen PostgreSQL | `al_lio_postgres_data` |
| Red interna Docker | `al_lio_internal` |
| Red externa Caddy | `danicode_web` (externa, compartida) |
| Base de datos | `al_lio` |
| Usuario PostgreSQL | `al_lio` |
| Dominio final | `https://al-lio.danielcode.dev` |

---

## Estado de Supabase en esta fase

- **Supabase Auth sigue activo.** No se elimina en esta fase.
- **Supabase no se borra.** Se mantiene hasta Fase 6.
- El flujo de auth (login, registro, sesión, Google OAuth) sigue usando Supabase Auth.
- Los datos de negocio (tasks, courses, hackathons, etc.) ya usan PostgreSQL propio (Fase 4).
- **Fase 6** — implementará auth propia con `bcryptjs` + `iron-session`, eliminará Supabase.

---

## Artefactos creados/modificados en Fase 5

| Artefacto | Cambio |
|---|---|
| `infra/docker-compose.prod.yml` | Nombres finales `al_lio_*` (antes `aidraft_*`) |
| `infra/Caddyfile.example` | Dominio final `al-lio.danielcode.dev`, proxy a `al_lio_web:3000` |
| `.env.production.example` | `BASE_URL` y `GOOGLE_REDIRECT_URI` con dominio final, `DATABASE_URL` con `al_lio_postgres` |
| `scripts/validate-production-deploy-readiness.mjs` | Nuevo validador estático de preparación VPS |
| `docs/POSTGRES_MIGRATION_PHASE_5.md` | Este documento |

---

## Plan de ejecución en VPS

> ⚠️ **NINGUNO de estos comandos se ha ejecutado todavía.**
> Ejecutar solo cuando Dani lo decida explícitamente.
> Requieren acceso SSH al VPS y `.env` real con credenciales.

### Prerequisitos

- Tener el repo en el VPS (o subir el tar):
  ```bash
  # Desde local: crear tar del proyecto (sin node_modules, .next)
  tar --exclude='node_modules' --exclude='.next' --exclude='.git' \
      -czf al-lio.tar.gz -C /ruta/local al-lio/

  # Subir al VPS
  scp al-lio.tar.gz usuario@vps:/srv/danicode/projects/
  ```

- Crear directorio en VPS:
  ```bash
  ssh usuario@vps
  mkdir -p /srv/danicode/projects/al-lio
  cd /srv/danicode/projects/al-lio
  tar -xzf ../al-lio.tar.gz --strip-components=1
  ```

### 1. Crear `.env` real en VPS

```bash
# En VPS — crear .env MANUALMENTE a partir de .env.production.example
# NUNCA subir el .env real por git ni scp sin cifrar
cp .env.production.example .env
nano .env
# Rellenar todos los REPLACE_ME con valores reales
```

### 2. Levantar PostgreSQL producción

```bash
# En VPS, desde /srv/danicode/projects/al-lio
docker compose -f infra/docker-compose.prod.yml up -d al_lio_postgres
docker compose -f infra/docker-compose.prod.yml ps
```

### 3. Aplicar schema en PostgreSQL producción

```bash
# DATABASE_URL ya está en .env del VPS
npm run postgres:setup
```

### 4. Importar datos a producción desde export validado

> ⚠️ El script de import producción requiere guardias explícitas:
> `AL_LIO_ALLOW_PRODUCTION_IMPORT=true`
> `AL_LIO_PRODUCTION_IMPORT_CONFIRMATION=IMPORT_TO_PRODUCTION_POSTGRES`
>
> Rechaza automáticamente sandbox (127.0.0.1:54329).

```bash
# Copiar artifacts de migración validados al VPS
# (generados en Fase 3B sandbox — ya validados)
# Luego ejecutar el import con guardias:
AL_LIO_ALLOW_PRODUCTION_IMPORT=true \
AL_LIO_PRODUCTION_IMPORT_CONFIRMATION=IMPORT_TO_PRODUCTION_POSTGRES \
node scripts/import-production-data.mjs
```

> ℹ️ El script `scripts/import-production-data.mjs` está pendiente de creación si se decide hacerlo
> o se hace la importación manual tabla a tabla con `psql`.

### 5. Verificar recuentos

```bash
# Verificar que los datos están correctamente importados
docker exec al_lio_postgres psql -U al_lio -d al_lio -c "\dt"
docker exec al_lio_postgres psql -U al_lio -d al_lio -c "SELECT COUNT(*) FROM tasks;"
docker exec al_lio_postgres psql -U al_lio -d al_lio -c "SELECT COUNT(*) FROM courses;"
docker exec al_lio_postgres psql -U al_lio -d al_lio -c "SELECT COUNT(*) FROM hackathons;"
```

### 6. Levantar la app

```bash
docker compose -f infra/docker-compose.prod.yml up -d al_lio_web
docker compose -f infra/docker-compose.prod.yml ps
docker compose -f infra/docker-compose.prod.yml logs al_lio_web --tail=50
```

### 7. Verificar health

```bash
curl http://localhost:3000/api/health
# Debe responder: {"status":"ok"} o similar
```

### 8. Añadir Caddy

En el Caddyfile real del VPS (`/srv/danicode/infra/caddy/Caddyfile`), añadir el bloque de `infra/Caddyfile.example`:

```caddyfile
al-lio.danielcode.dev {
    encode gzip zstd
    reverse_proxy al_lio_web:3000
}
```

### 9. Reload Caddy

```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 10. Verificar HTTPS

```bash
curl https://al-lio.danielcode.dev/api/health
# Debe responder con HTTP 200
```

---

## Lo que NO se hizo en Fase 5

- No se tocó el VPS
- No se desplegó nada
- No se tocó Caddy real
- No se tocó ningún DNS
- No se tocaron `.env` reales ni secretos
- No se borró Supabase
- No se ejecutó ningún export ni import real
- No se ejecutó `postgres:user:set-password`
- No se añadieron `_archive/` ni `migration-artifacts/`

---

## Checklist antes de ejecutar en VPS

- [ ] DNS apunta al VPS: `al-lio.danielcode.dev → IP del VPS`
- [ ] Red Docker `danicode_web` existe en el VPS
- [ ] `.env` real creado en VPS con todos los valores rellenos
- [ ] `npm run validate:production-deploy` pasa localmente
- [ ] `npm run lint && npm run typecheck && npm run build` pasan
- [ ] Schema aplicado en VPS: `npm run postgres:setup`
- [ ] Datos importados y verificados
- [ ] Health check `http://localhost:3000/api/health` responde OK
- [ ] Caddy configurado y recargado
- [ ] HTTPS `https://al-lio.danielcode.dev` responde OK
- [ ] Login funciona (Supabase Auth sigue activo)
- [ ] Test de tasks/courses/hackathons funciona (PostgreSQL)

---

## Próxima fase

**Fase 6** — Reemplazar Supabase Auth por auth propia:
- Tabla `public.users` con `password_hash` (`bcryptjs`)
- Sesiones con `iron-session` o JWT
- Eliminar `@supabase/ssr`, `@supabase/supabase-js`
- Setear `password_hash` con `npm run postgres:user:set-password`

Ver [SUPABASE_TO_POSTGRES_AUDIT.md](./SUPABASE_TO_POSTGRES_AUDIT.md) para inventario completo.
