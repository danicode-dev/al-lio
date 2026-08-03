# Despliegue VPS

Esta guía describe el despliegue actual de AL-LÍO en `https://al-lio.danielcode.dev`.

## Requisitos

- VPS con Docker y Docker Compose.
- Red Docker externa `danicode_web`.
- Caddy funcionando en la red `danicode_web`.
- DNS `al-lio.danielcode.dev` apuntando al VPS.
- Archivo `.env` de producción creado desde `.env.production.example`.

## Ruta Recomendada

```bash
mkdir -p /srv/danicode/projects/al-lio
cd /srv/danicode/projects/al-lio
git clone https://github.com/danicode-dev/al-lio.git .
```

## Variables

```bash
cp .env.production.example .env
nano .env
```

Variables mínimas:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión interna a `al_lio_postgres` |
| `POSTGRES_PASSWORD` | Password del contenedor PostgreSQL |
| `SESSION_SECRET` | Firma de la cookie de sesión |
| `TARGET_USER_EMAIL` | Usuario objetivo/admin inicial |
| `GOOGLE_CLIENT_ID` | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `GOOGLE_REDIRECT_URI` | Callback de Google |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Cifrado de tokens Google |
| `BASE_URL` | URL pública |
| `PORT` | Puerto interno Next.js |
| `NODE_ENV` | `production` |

Callback de Google en producción:

```txt
https://al-lio.danielcode.dev/api/google/calendar/callback
```

## Caddy

Añadir al Caddyfile real el bloque de `infra/Caddyfile.example`:

```bash
cat infra/Caddyfile.example
nano /srv/danicode/infra/caddy/Caddyfile
docker exec danicode_caddy caddy reload --config /etc/caddy/Caddyfile
```

## Build y Arranque

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build
```

## Verificación

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml ps
docker logs --tail=80 al_lio_web
docker exec al_lio_web wget -qO- http://127.0.0.1:3000/api/health
curl -I https://al-lio.danielcode.dev/api/health
```

Respuesta esperada de `/api/health`:

```json
{"ok":true,"app":"techlife-control-panel"}
```

## Actualización

```bash
git pull --ff-only origin main
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build
docker compose --env-file .env -f infra/docker-compose.prod.yml ps
docker logs --tail=50 al_lio_web
curl -I https://al-lio.danielcode.dev/api/health
```

## Rollback

```bash
git log --oneline -5
git checkout <commit-anterior>
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build
```

## Notas

- No ejecutar comandos de VPS desde PowerShell local si la ruta empieza por `/srv/...`; esa ruta existe en Linux, no en Windows.
- En PowerShell antiguo, usar `;` o comandos separados en lugar de `&&`.
- Si solo aparece un contenedor local como `aidraft_postgres_sandbox`, no significa que producción esté caída; significa que se está mirando Docker local, no el VPS.
