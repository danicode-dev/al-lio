# Fase 5B — Ejecución real de despliegue VPS

**Rama:** `feat/al-lio-production-execution-tooling`
**Fecha:** 2026-06-11
**Estado:** Comandos preparados — NO ejecutados todavía

> ⚠️ **NINGUNO de estos comandos se ha ejecutado todavía.**
> Este documento es el runbook de ejecución real para cuando Dani lo decida.

---

## Prerequisitos antes de ejecutar

- [ ] DNS `al-lio.danielcode.dev → IP del VPS` activo y propagado
- [ ] Red Docker `danicode_web` existe en el VPS (`docker network ls`)
- [ ] Export de Supabase validado disponible en VPS (ver Paso 10)
- [ ] `npm run migration:validate:artifacts` pasa localmente

> ℹ️ **Node.js NO necesita estar instalado en el host del VPS.**
> Todos los comandos Node se ejecutan mediante contenedores temporales Docker.

---

## Paso 1 — Crear tar desde main actualizado

> Ejecutar en local, en el directorio del proyecto.

```bash
# Asegurarse de estar en main limpio
git checkout main
git pull origin main
git status  # debe estar limpio salvo _archive/

# Crear tar sin node_modules, .next ni archivos innecesarios
tar \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='_archive' \
  --exclude='migration-artifacts' \
  -czf al-lio.tar.gz \
  -C "$(dirname $(pwd))" \
  "$(basename $(pwd))"

# Verificar tamaño razonable (sin node_modules debe ser <5MB)
ls -lh al-lio.tar.gz
```

---

## Paso 2 — Subir tar al VPS

```bash
# Desde local — sustituir usuario@vps por el acceso real
scp al-lio.tar.gz usuario@vps:/srv/danicode/projects/
```

---

## Paso 3 — Preparar carpeta en VPS

```bash
# En VPS
ssh usuario@vps

mkdir -p /srv/danicode/projects/al-lio
cd /srv/danicode/projects

# Extraer código (--strip-components=1 elimina el directorio raíz del tar)
tar -xzf al-lio.tar.gz -C al-lio --strip-components=1

ls al-lio/  # debe verse infra/, scripts/, docs/, lib/, app/, etc.
```

---

## Paso 4 — Crear .env real en VPS

> ⚠️ **NUNCA subir el .env real por git, scp sin cifrar, ni email.**
> Crearlo manualmente en el VPS a partir del ejemplo.

```bash
# En VPS, dentro de /srv/danicode/projects/al-lio
cp .env.production.example .env
nano .env   # o vim .env

# Rellenar TODOS los REPLACE_ME con valores reales:
#
# DATABASE_URL=postgresql://al_lio:<PASSWORD_REAL>@al_lio_postgres:5432/al_lio
# POSTGRES_PASSWORD=<PASSWORD_REAL>  ← mismo que en DATABASE_URL
# NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key real>
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key real>
# SUPABASE_SERVICE_ROLE_KEY=<service role key real>
# SUPABASE_SECRET_KEY=<secret key real>
# SUPABASE_URL=https://<tu-proyecto>.supabase.co
# SUPABASE_DB_URL=postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres
# TARGET_USER_EMAIL=<email real>
# PROFILES_SHARED_PASSWORD=<contraseña perfiles>
# GOOGLE_CLIENT_ID=<client id real>
# GOOGLE_CLIENT_SECRET=<client secret real>
# GOOGLE_REDIRECT_URI=https://al-lio.danielcode.dev/api/google/calendar/callback
# GOOGLE_TOKEN_ENCRYPTION_KEY=<clave cifrado real>
# BASE_URL=https://al-lio.danielcode.dev
# PORT=3000
# NODE_ENV=production

# Verificar que no queden REPLACE_ME
grep REPLACE_ME .env  # debe devolver vacío
```

---

## Paso 5 — Generar contraseña segura para POSTGRES_PASSWORD

```bash
# Generar contraseña aleatoria de 32 caracteres (sin caracteres problemáticos en URL)
openssl rand -base64 24 | tr -d '/+=' | head -c 32
# Usar el resultado como POSTGRES_PASSWORD y en DATABASE_URL
```

---

## Paso 6 — Levantar solo PostgreSQL producción

```bash
cd /srv/danicode/projects/al-lio

docker compose -f infra/docker-compose.prod.yml up -d al_lio_postgres

# Verificar que está levantado
docker compose -f infra/docker-compose.prod.yml ps
```

---

## Paso 7 — Esperar healthcheck

```bash
# Esperar hasta que al_lio_postgres esté healthy (~30 segundos)
docker compose -f infra/docker-compose.prod.yml ps al_lio_postgres
# STATUS debe mostrar: healthy

# O forzar espera en bucle:
until docker inspect al_lio_postgres --format='{{.State.Health.Status}}' | grep -q healthy; do
  echo "Esperando healthcheck..."; sleep 5
done
echo "PostgreSQL producción ready."
```

---

## Paso 8 — Aplicar schema con contenedor Node temporal

> ℹ️ Node.js no está instalado en el host. Se usa un contenedor temporal.
> El contenedor accede a al_lio_postgres a través de la red interna Docker.

```bash
cd /srv/danicode/projects/al-lio

# Ver nombre exacto de la red interna creada por compose (puede tener prefijo de directorio)
docker network ls | grep al_lio_internal
# Suele llamarse: al-lio_al_lio_internal

# Aplicar schema con contenedor temporal (sustituir el nombre de red si difiere)
docker run --rm \
  --network al-lio_al_lio_internal \
  --env-file .env \
  -v "$PWD":/app \
  -w /app \
  node:22-alpine \
  sh -c "npm ci && npm run postgres:setup"

# Verificar tablas creadas
docker exec al_lio_postgres psql -U al_lio -d al_lio -c "\dt public.*"
```

---

## Paso 9 — Obtener los migration-artifacts validados

Los artifacts de Fase 3B ya están en el VPS sandbox. Copiar desde allí:

```bash
# En VPS — copiar desde el sandbox al directorio del proyecto
mkdir -p /srv/danicode/projects/al-lio/migration-artifacts

cp -r /srv/danicode/sandboxes/al-lio-phase-3b/migration-artifacts/supabase-export-* \
  /srv/danicode/projects/al-lio/migration-artifacts/

# Verificar que el manifest está presente
ls /srv/danicode/projects/al-lio/migration-artifacts/
# Debe aparecer: supabase-export-YYYYMMDD-HHMMSS/

ls /srv/danicode/projects/al-lio/migration-artifacts/supabase-export-*/manifest.json
# Debe existir
```

> **Alternativa** — si los artifacts no están en el VPS y hay que subirlos desde local:
> ```bash
> scp -r migration-artifacts/supabase-export-YYYYMMDD-HHMMSS \
>     usuario@vps:/srv/danicode/projects/al-lio/migration-artifacts/
> ```

---

## Paso 10 — Importar datos a producción

> ⚠️ El script requiere las 3 guardias explícitas.
> La verificación de recuentos ocurre **dentro de la misma transacción**.
> Si algo no coincide, se ejecuta ROLLBACK automáticamente — ningún dato queda escrito.

```bash
cd /srv/danicode/projects/al-lio

# Sustituir supabase-export-YYYYMMDD-HHMMSS por el nombre real del directorio
docker run --rm \
  --network al-lio_al_lio_internal \
  --env-file .env \
  -e AL_LIO_ALLOW_PRODUCTION_IMPORT=true \
  -e AL_LIO_PRODUCTION_IMPORT_CONFIRMATION=IMPORT_TO_AL_LIO_PRODUCTION_POSTGRES \
  -v "$PWD":/app \
  -w /app \
  node:22-alpine \
  sh -c "npm ci && node scripts/migration/import-production-data.mjs migration-artifacts/supabase-export-YYYYMMDD-HHMMSS"
```

> El script verifica automáticamente los recuentos **antes de hacer COMMIT**.
> Si la verificación falla: ROLLBACK y exit 1.

---

## Paso 11 — Verificación independiente de recuentos

```bash
cd /srv/danicode/projects/al-lio

docker run --rm \
  --network al-lio_al_lio_internal \
  --env-file .env \
  -e AL_LIO_ALLOW_PRODUCTION_IMPORT=true \
  -e AL_LIO_PRODUCTION_IMPORT_CONFIRMATION=IMPORT_TO_AL_LIO_PRODUCTION_POSTGRES \
  -v "$PWD":/app \
  -w /app \
  node:22-alpine \
  sh -c "npm ci && node scripts/migration/verify-production-migration.mjs migration-artifacts/supabase-export-YYYYMMDD-HHMMSS"

# Resultado esperado:
# RESULTADO: Verificación de producción OK — 11 tablas coinciden con el manifest.
```

---

## Paso 12 — Levantar al_lio_web

```bash
cd /srv/danicode/projects/al-lio

# Build de la imagen Docker (primera vez)
docker compose -f infra/docker-compose.prod.yml build al_lio_web

# Levantar app
docker compose -f infra/docker-compose.prod.yml up -d al_lio_web

# Verificar estado
docker compose -f infra/docker-compose.prod.yml ps
docker compose -f infra/docker-compose.prod.yml logs al_lio_web --tail=50
```

---

## Paso 13 — Verificar health endpoint interno

> ℹ️ El servicio usa `expose`, no `ports` — no está accesible desde el host directamente.
> Usar `docker exec` dentro del contenedor o un contenedor temporal en la red Docker.

```bash
# Opción A — desde dentro del contenedor al_lio_web
docker exec al_lio_web wget -qO- http://localhost:3000/api/health
# Debe responder: {"status":"ok"} o similar

# Opción B — desde contenedor temporal en la red danicode_web
docker run --rm --network danicode_web curlimages/curl:latest \
  http://al_lio_web:3000/api/health
```

---

## Paso 14 — Añadir bloque Caddy al Caddyfile real

```bash
# En VPS — editar el Caddyfile real
nano /srv/danicode/infra/caddy/Caddyfile
```

Añadir el bloque de `infra/Caddyfile.example`:

```caddyfile
al-lio.danielcode.dev {
    encode gzip zstd
    reverse_proxy al_lio_web:3000
}
```

> Verificar que `al_lio_web` está en la red `danicode_web`:
> ```bash
> docker network inspect danicode_web | grep al_lio_web
> ```

---

## Paso 15 — Recargar Caddy

```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
# Caddy obtendrá el certificado TLS automáticamente via Let's Encrypt
```

---

## Paso 16 — Verificar HTTPS

```bash
# Desde el VPS (a través de Caddy)
docker run --rm --network danicode_web curlimages/curl:latest \
  -I http://al_lio_web:3000/api/health

# Desde local (fuera del VPS) — verifica TLS y Caddy
curl -I https://al-lio.danielcode.dev/api/health
# HTTP/2 200 esperado
```

---

## Estado de Supabase en producción

- **Supabase Auth sigue activo.** El login/logout usa Supabase Auth.
- **Supabase NO se elimina** hasta Fase 6.
- Los datos de negocio (tasks, courses, hackathons, etc.) provienen de PostgreSQL propio.
- Los UUID de Supabase Auth coinciden con `public.users.id` (preservados en migración Fase 3B).

---

## Rollback si algo falla

```bash
# Bajar la app (sin tocar Caddy)
docker compose -f infra/docker-compose.prod.yml down al_lio_web

# Quitar bloque del Caddyfile y recargar
# nano /srv/danicode/infra/caddy/Caddyfile  → borrar bloque al-lio.danielcode.dev
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# La base de datos queda intacta — no se pierde nada
# al_lio_postgres puede seguir corriendo para siguiente intento
```

---

## Scripts de migración disponibles

| Script | Comando | Ejecutar en |
|---|---|---|
| Import a producción | `npm run migration:import:production` | VPS, con guardias, vía contenedor |
| Verificar producción | `npm run migration:verify:production` | VPS, con guardias, vía contenedor |
| Import a sandbox | `npm run migration:import:sandbox` | Local, sandbox solo |
| Verificar sandbox | `npm run migration:verify:sandbox` | Local, sandbox solo |

---

## Próxima fase

**Fase 6** — Reemplazar Supabase Auth por auth propia:
- `bcryptjs` + `iron-session`
- Eliminar `@supabase/ssr`, `@supabase/supabase-js`
- Setear `password_hash` con `npm run postgres:user:set-password`
