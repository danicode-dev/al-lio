# Despliegue de Aidraft en VPS (aidraft.danielcode.dev)

## Pre-requisitos

- VPS con Docker y Docker Compose instalados.
- Red Docker `danicode_web` creada: `docker network create danicode_web`
- Caddy corriendo en el contenedor `danicode_caddy` en la red `danicode_web`.
- DNS `aidraft.danielcode.dev` apuntando a la IP del VPS.
- Proyecto en Supabase configurado y operativo.

---

## 1. Preparar el entorno en el VPS

```bash
mkdir -p /srv/danicode/projects/aidraft
cd /srv/danicode/projects/aidraft
git clone https://github.com/danicode-dev/d1os.git .
```

## 2. Crear el archivo `.env`

```bash
cp .env.production.example .env
# Editar con los valores reales:
nano .env
```

Variables obligatorias a rellenar:

| Variable | Dónde obtenerla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SECRET_KEY` | Igual que service role key |
| `SUPABASE_URL` | Igual que NEXT_PUBLIC_SUPABASE_URL |
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connection string (Direct) |
| `TARGET_USER_EMAIL` | Email del usuario administrador |
| `PROFILES_SHARED_PASSWORD` | Contraseña interna para los perfiles |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth 2.0 |
| `GOOGLE_REDIRECT_URI` | `https://aidraft.danielcode.dev/api/google/calendar/callback` |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | String aleatorio seguro (32+ chars) |
| `BASE_URL` | `https://aidraft.danielcode.dev` |

## 3. Validar el deploy readiness

```bash
node scripts/validate-deploy-readiness.mjs
```

## 4. Añadir el bloque a Caddyfile

Copiar el contenido de `infra/Caddyfile.example` al Caddyfile real:

```bash
cat infra/Caddyfile.example
# Añadir el bloque al Caddyfile:
nano /srv/danicode/infra/caddy/Caddyfile
```

Recargar Caddy:

```bash
docker exec danicode_caddy caddy reload --config /etc/caddy/Caddyfile
```

## 5. Build y arranque

```bash
cd /srv/danicode/projects/aidraft
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build
```

## 6. Verificar

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml ps
docker logs --tail=80 aidraft_web
curl -I https://aidraft.danielcode.dev/api/health
```

La respuesta esperada de `/api/health`:

```json
{"ok":true,"app":"techlife-control-panel"}
```

---

## Actualizaciones posteriores

```bash
cd /srv/danicode/projects/aidraft
git pull --ff-only origin main
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build
docker compose --env-file .env -f infra/docker-compose.prod.yml ps
docker logs --tail=50 aidraft_web
curl -I https://aidraft.danielcode.dev/api/health
```

---

## Rollback

```bash
git log --oneline -5
git checkout <commit-anterior>
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build
```

---

## Variables de entorno en Google Cloud Console

Para que Google Calendar OAuth funcione en producción, añadir a la lista de URIs de redirección autorizados:

```
https://aidraft.danielcode.dev/api/google/calendar/callback
```
