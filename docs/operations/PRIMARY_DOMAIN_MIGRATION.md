# Primary domain migration

This runbook performs the one-time production cutover from
`al-lio.danielcode.dev` to `al-lio.app`. It is deliberately separate from a
routine application release: changing an OAuth origin and a live reverse proxy
requires a blue/green web transition even when the application image does not
change.

## Preconditions

- `al-lio.app` resolves to the production VPS.
- The existing Google OAuth web client contains both new authorized redirect
  URIs:
  - `https://al-lio.app/api/auth/google/callback`
  - `https://al-lio.app/api/google/calendar/callback`
- The previous production callbacks remain registered throughout the cutover.
- Caddy, `al_lio_web`, `al_lio_radar`, and `al_lio_postgres` are healthy.
- The owner has explicitly approved the production cutover.

The current application uses server-side OAuth. A new OAuth client and a new
JavaScript origin are not required by the application code.

## Invariants

- Do not run a database migration.
- Do not stop, restart, recreate, or reconfigure PostgreSQL.
- Do not stop, restart, recreate, or reconfigure Radar.
- Do not run `docker compose up` without an explicit web service name and
  `--no-deps`.
- Keep the previous Caddy configuration, environment files, image name, and
  healthy web container available until the candidate is proven healthy.
- Never print the complete production environment.

Radar currently derives its public delivery base from `BASE_URL` when its
container is created. The compatibility route in `infra/Caddyfile.example`
keeps `/api/radar/*` available on the previous host so this migration does not
need a Radar lifecycle event.

## 1. Capture the live release and rollback evidence

Run read-only discovery first:

```bash
export AL_LIO_DOMAIN_RELEASE_DIR="$(dirname "$(docker inspect al_lio_web \
  --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')")"
test -f "$AL_LIO_DOMAIN_RELEASE_DIR/infra/docker-compose.prod.yml"
test -f "$AL_LIO_DOMAIN_RELEASE_DIR/.env"

docker inspect al_lio_web --format 'web={{.Id}} image={{.Config.Image}} health={{.State.Health.Status}}'
docker inspect al_lio_postgres --format 'postgres={{.Id}} health={{.State.Health.Status}}'
docker inspect al_lio_radar --format 'radar={{.Id}} health={{.State.Health.Status}}'
docker inspect danicode_caddy --format 'caddy={{.Id}} health={{.State.Health.Status}}'
docker network inspect danicode_web --format '{{json .Containers}}'
```

Create private configuration backups; this does not touch database data:

```bash
export AL_LIO_DOMAIN_BACKUP_SUFFIX="$(date -u +%Y%m%dT%H%M%SZ)"
sudo install -m 600 /srv/danicode/infra/caddy/Caddyfile \
  "/srv/danicode/infra/caddy/Caddyfile.pre-al-lio-app-$AL_LIO_DOMAIN_BACKUP_SUFFIX"
sudo install -m 600 /srv/danicode/projects/al-lio/.env \
  "/srv/danicode/projects/al-lio/.env.pre-al-lio-app-$AL_LIO_DOMAIN_BACKUP_SUFFIX"
sudo install -m 600 "$AL_LIO_DOMAIN_RELEASE_DIR/.env" \
  "$AL_LIO_DOMAIN_RELEASE_DIR/.env.pre-al-lio-app-$AL_LIO_DOMAIN_BACKUP_SUFFIX"
```

## 2. Start a web candidate without dependencies

Use the active release configuration and image, overriding only the public
origin values for the candidate:

```bash
docker compose \
  -f "$AL_LIO_DOMAIN_RELEASE_DIR/infra/docker-compose.prod.yml" \
  --env-file "$AL_LIO_DOMAIN_RELEASE_DIR/.env" \
  run -d --no-deps --name al_lio_web_domain_candidate \
  -e BASE_URL=https://al-lio.app \
  -e GOOGLE_IDENTITY_REDIRECT_URI=https://al-lio.app/api/auth/google/callback \
  -e GOOGLE_REDIRECT_URI=https://al-lio.app/api/google/calendar/callback \
  al_lio_web
```

Wait for the container health check, then test it from Caddy's network:

```bash
docker inspect al_lio_web_domain_candidate --format '{{.State.Health.Status}}'
docker exec al_lio_web_domain_candidate wget -qO- http://127.0.0.1:3000/api/health
docker exec al_lio_web_domain_candidate wget -qO- http://127.0.0.1:3000/api/ready
docker exec danicode_caddy wget -qO- http://al_lio_web_domain_candidate:3000/api/ready
```

Stop if any check fails. The current production container is still serving all
traffic at this point.

## 3. Introduce the new host without breaking old OAuth flows

Add a temporary `al-lio.app` Caddy block that proxies to
`al_lio_web_domain_candidate`. Leave the existing `al-lio.danielcode.dev`
block pointing to `al_lio_web` during the OAuth drain window.

Validate and gracefully reload Caddy:

```bash
docker exec danicode_caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec danicode_caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
curl -fsS https://al-lio.app/api/health
curl -fsS https://al-lio.app/api/ready
```

Keep this split routing for at least ten minutes. Google identity and Calendar
state cookies expire after ten minutes, so the old web instance must remain
available for callbacks that started before the cutover.

## 4. Update the canonical environment files

Update these values in both `/srv/danicode/projects/al-lio/.env` and the active
`$AL_LIO_DOMAIN_RELEASE_DIR/.env`:

```env
APP_URL=https://al-lio.app
NEXT_PUBLIC_APP_URL=https://al-lio.app
BASE_URL=https://al-lio.app
PUBLIC_URL=https://al-lio.app
GOOGLE_IDENTITY_REDIRECT_URI=https://al-lio.app/api/auth/google/callback
GOOGLE_REDIRECT_URI=https://al-lio.app/api/google/calendar/callback
```

The repository checkout did not contain `GOOGLE_IDENTITY_REDIRECT_URI` during
the pre-migration audit; add it instead of silently relying on the active
container's previous environment. Keep both files mode `600` and validate the
active Compose configuration without printing it:

```bash
chmod 600 /srv/danicode/projects/al-lio/.env "$AL_LIO_DOMAIN_RELEASE_DIR/.env"
docker compose \
  -f "$AL_LIO_DOMAIN_RELEASE_DIR/infra/docker-compose.prod.yml" \
  --env-file "$AL_LIO_DOMAIN_RELEASE_DIR/.env" config --quiet
```

## 5. Replace only the canonical web container

After the OAuth drain window, point both hosts to the healthy candidate and
gracefully reload Caddy. Then recreate only the canonical web service:

```bash
docker compose \
  -f "$AL_LIO_DOMAIN_RELEASE_DIR/infra/docker-compose.prod.yml" \
  --env-file "$AL_LIO_DOMAIN_RELEASE_DIR/.env" \
  up -d --no-deps --force-recreate al_lio_web
```

Do not proceed until the replacement passes all internal checks:

```bash
docker inspect al_lio_web --format '{{.State.Health.Status}}'
docker exec al_lio_web wget -qO- http://127.0.0.1:3000/api/health
docker exec al_lio_web wget -qO- http://127.0.0.1:3000/api/ready
```

Install the final Caddy shape from `infra/Caddyfile.example`: `al-lio.app`
proxies to `al_lio_web`, the previous host proxies `/api/radar/*`, and all other
previous-host traffic redirects to the primary domain. Validate and reload
Caddy again before removing the candidate.

```bash
curl -fsS https://al-lio.app/api/health
curl -fsS https://al-lio.app/api/ready
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://al-lio.danielcode.dev/login

docker inspect al_lio_postgres --format '{{.Id}} {{.State.Health.Status}}'
docker inspect al_lio_radar --format '{{.Id}} {{.State.Health.Status}}'
docker rm -f al_lio_web_domain_candidate
```

The final PostgreSQL and Radar IDs must match the values captured before the
cutover.

## User-visible session impact

Application sessions and Google Calendar tokens are stored in host-only
cookies. Browsers cannot share those cookies across two different registrable
domains. The new host therefore requires users to sign in again and reconnect
Google Calendar. This is expected domain isolation, not application downtime,
and it does not require a PostgreSQL change.

## Rollback

Before the canonical web replacement, remove the new Caddy block or point it
back to `al_lio_web`, restore the saved Caddyfile, and reload Caddy. The old
domain and old web container remain unchanged.

After the canonical web replacement, keep Caddy on the healthy candidate,
restore both saved environment files, recreate only `al_lio_web` with
`--no-deps`, verify health/readiness, and then restore the saved Caddyfile. Do
not roll back PostgreSQL or Radar because this procedure never changes them.
