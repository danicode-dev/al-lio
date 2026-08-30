# Controlled VPS deployment

This runbook updates `https://al-lio.danielcode.dev` without applying database
changes blindly or replacing unrelated healthy services.

## Safety principles

- Deploy an exact reviewed commit or tag, never a moving branch.
- Build candidate images before replacing the active container.
- Create and restore-test a backup before any migration.
- Give `DATABASE_MIGRATION_URL` only to the operational migrator.
- Give the web application only the restricted `DATABASE_URL` role.
- Never run `schema.sql` manually against an existing database.
- Never edit a migration that has already been applied.
- Stop immediately when baseline, backup, migration or smoke evidence fails.
- A web-only release must not rebuild, restart or replace Radar or PostgreSQL.

## Requirements

- Docker Engine and Docker Compose;
- external Docker network `danicode_web`;
- Caddy attached to `danicode_web`;
- working DNS and TLS for `al-lio.danielcode.dev`;
- repositories at `/srv/danicode/projects/al-lio` and
  `/srv/danicode/projects/al-lio-radar`;
- enough free space for the current and candidate images plus restore data;
- a production `.env` outside Git.

## Automated routine release

For an owner-approved commit merged into `main`, the normal path is the
post-merge workflow documented in
[`GITHUB_PRODUCTION_DEPLOY.md`](GITHUB_PRODUCTION_DEPLOY.md). GitHub passes the
exact successful CI SHA to the guarded deployment script.

The direct operator fallback is:

```bash
./scripts/deploy-production.sh <full-40-character-main-commit-sha>
```

The script implements the immutable worktree, candidate build, conditional
backup and migration rehearsal, web-only replacement, health/readiness checks,
private release record and automatic web rollback described below. It refuses
infrastructure, operator-managed catalogue, divergent, downgrade and
non-additive migration cases instead of guessing.

The owner-facing step-by-step instructions are maintained in
[`AUTONOMOUS_PRODUCTION_DEPLOY.md`](AUTONOMOUS_PRODUCTION_DEPLOY.md). The rest of
this runbook remains authoritative for exceptional and manual releases.

## 1. Select exact revisions

```bash
cd /srv/danicode/projects/al-lio
git fetch --tags origin
git status --short
git log --oneline -5 origin/main
```

The working tree must be clean. Select the reviewed application revision:

```bash
export AL_LIO_RELEASE_SHA="<reviewed-sha>"
git checkout --detach "$AL_LIO_RELEASE_SHA"
test "$(git rev-parse HEAD)" = "$AL_LIO_RELEASE_SHA"
```

For a release that also changes Radar, select its reviewed revision separately:

```bash
cd /srv/danicode/projects/al-lio-radar
git fetch --tags origin
git status --short
export AL_LIO_RADAR_RELEASE_SHA="<reviewed-radar-sha>"
git checkout --detach "$AL_LIO_RADAR_RELEASE_SHA"
test "$(git rev-parse HEAD)" = "$AL_LIO_RADAR_RELEASE_SHA"
cd /srv/danicode/projects/al-lio
```

Record the currently running images before changing anything:

```bash
mkdir -p /srv/danicode/backups/al-lio
docker inspect al_lio_web --format '{{.Config.Image}}' \
  > /srv/danicode/backups/al-lio/previous-web-image.txt
docker inspect al_lio_radar --format '{{.Config.Image}}' \
  > /srv/danicode/backups/al-lio/previous-radar-image.txt 2>/dev/null || true
```

## 2. Validate production configuration

Create `.env` from `.env.production.example`. Important values include:

```env
DATABASE_URL=postgresql://al_lio_app:<app-password>@al_lio_postgres:5432/al_lio
DATABASE_MIGRATION_URL=postgresql://al_lio:<admin-password>@al_lio_postgres:5432/al_lio
POSTGRES_PASSWORD=<admin-password>
SESSION_SECRET=<at-least-32-characters>
GOOGLE_TOKEN_ENCRYPTION_KEY=<at-least-32-characters>
BASE_URL=https://al-lio.danielcode.dev
GOOGLE_IDENTITY_REDIRECT_URI=https://al-lio.danielcode.dev/api/auth/google/callback
GOOGLE_REDIRECT_URI=https://al-lio.danielcode.dev/api/google/calendar/callback
RESEND_API_KEY=<resend-api-key>
RESEND_FROM_EMAIL=<verified-sender-address>
AL_LIO_IMAGE_TAG=<reviewed-sha>
AL_LIO_RADAR_IMAGE_TAG=<reviewed-radar-sha>
AL_LIO_RADAR_BUILD_CONTEXT=../../al-lio-radar
AL_LIO_RADAR_WEBHOOK_SECRET=<shared-random-secret-at-least-32-characters>
AL_LIO_RADAR_DELIVERY_SCHEMA_VERSION=3
AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_ENABLED=false
AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_DESTINATIONS=news
AL_LIO_RADAR_AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON={}
AL_LIO_RADAR_DAILY_PUBLICATION_TIMEZONE=Europe/Madrid
AL_LIO_RADAR_DAILY_PUBLICATION_TIME=09:00
AL_LIO_RADAR_WEB_DISCOVERY_ENABLED=false
AL_LIO_RADAR_LEARNING_DISCOVERY_ENABLED=false
AL_LIO_RADAR_YOUTUBE_WATCH_ENABLED=false
AL_LIO_RADAR_LEARNING_DELIVERY_ENABLED=false
AL_LIO_RADAR_YOUTUBE_API_KEY=
AL_LIO_RADAR_JOB_RADAR_ENABLED=false
AL_LIO_DEMO_ACCESS_ENABLED=false
NODE_ENV=production
```

```bash
chmod 600 .env
docker compose -f infra/docker-compose.prod.yml --env-file .env config --quiet
```

`DATABASE_MIGRATION_URL` must never be added to the web service environment.
Demo access remains disabled unless a controlled test explicitly enables it.
The Radar values above are the dormant defaults. Follow
[`OPENWEBINARS_NEWS_PILOT.md`](OPENWEBINARS_NEWS_PILOT.md) for the separate,
owner-approved news activation; never activate another vertical by association.

## 3. Capture a read-only inventory

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env ps
docker inspect al_lio_web --format '{{.Config.Image}} {{.State.Status}}'
docker inspect al_lio_postgres --format '{{.State.Status}}'
docker volume inspect al_lio_postgres_data
docker volume inspect al_lio_radar_data 2>/dev/null || true
df -h
free -h
curl -fsS https://al-lio.danielcode.dev/api/health
```

```bash
docker exec al_lio_postgres psql -U al_lio -d al_lio -v ON_ERROR_STOP=1 -c \
  "select current_database(), current_user, version();"
docker exec al_lio_postgres psql -U al_lio -d al_lio -v ON_ERROR_STOP=1 -c \
  "select schemaname, relname, n_live_tup from pg_stat_user_tables order by relname;"
```

Store the output in the private release record without credentials or personal
data.

## 4. Back up PostgreSQL and Radar

Create a PostgreSQL backup and prove that it restores:

```bash
mkdir -p /srv/danicode/backups/al-lio
bash scripts/postgres/backup-production.sh
export AL_LIO_BACKUP_FILE="$(ls -1t /srv/danicode/backups/al-lio/al_lio_*.dump | head -1)"
bash scripts/postgres/verify-backup-production.sh "$AL_LIO_BACKUP_FILE"
```

If Radar is deployed, stop only its single writer and copy the SQLite volume:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env stop al_lio_radar
docker run --rm \
  -v al_lio_radar_data:/source:ro \
  -v /srv/danicode/backups/al-lio:/backup \
  alpine:3.20 sh -c 'cd /source && tar -czf /backup/radar-data.tgz .'
```

Do not restart Radar until the web application is healthy. If backup creation
or restore verification fails, stop the release.

## 5. Build without stopping production

For a web-only release:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env build --pull al_lio_web
docker image inspect "al-lio-web:${AL_LIO_IMAGE_TAG}" >/dev/null
```

Only when the approved release also changes Radar:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env build --pull al_lio_radar
docker image inspect "al-lio-radar:${AL_LIO_RADAR_IMAGE_TAG}" >/dev/null
```

The existing healthy containers continue serving traffic during the build.

## 6. Rehearse database changes

Before first baseline adoption or any uncertain legacy reconciliation, restore
the backup into an isolated database. This URL must never point to production:

```bash
export AL_LIO_REHEARSAL_DATABASE_URL="postgresql://al_lio:<admin-password>@al_lio_postgres:5432/al_lio_rehearsal"
```

Audit using the same image and private network used by production:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  -e DATABASE_MIGRATION_URL="$AL_LIO_REHEARSAL_DATABASE_URL" \
  al_lio_migrator node scripts/postgres/audit-baseline.mjs
```

If a reviewed legacy database requires additive reconciliation, run it only on
the restored copy:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  -e DATABASE_MIGRATION_URL="$AL_LIO_REHEARSAL_DATABASE_URL" \
  -e AL_LIO_BASELINE_RECONCILIATION=RECONCILE_0001_INITIAL_SCHEMA \
  al_lio_migrator node scripts/postgres/reconcile-baseline.mjs
```

Repeat the audit. Continue only when it is fully clean, then adopt the baseline
and apply migrations in the rehearsal database:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  -e DATABASE_MIGRATION_URL="$AL_LIO_REHEARSAL_DATABASE_URL" \
  -e AL_LIO_BASELINE_CONFIRMATION=ADOPT_0001_INITIAL_SCHEMA \
  al_lio_migrator node scripts/postgres/audit-baseline.mjs --adopt

docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  -e DATABASE_MIGRATION_URL="$AL_LIO_REHEARSAL_DATABASE_URL" \
  al_lio_migrator node scripts/postgres/migrate.mjs
```

Validate the candidate application against the restored data. Do not convert a
schema mismatch into an unreviewed manual production edit.

## 7. Apply reviewed production migrations

Run the read-only audit first:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  al_lio_migrator node scripts/postgres/audit-baseline.mjs
```

Baseline reconciliation and adoption are one-time legacy operations. They are
allowed in production only when the same backup and difference were rehearsed
successfully. A normal release applies pending migrations with:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm al_lio_migrator
```

Update the Spanish competency catalogue transactionally when the release
contains reviewed catalogue changes:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  al_lio_migrator node scripts/import-learning-competencies.mjs
```

Create or reconcile the restricted application role when required:

```bash
AL_LIO_DB_ROLE_CONFIRMATION=CREATE_AL_LIO_APP_ROLE \
docker compose -f infra/docker-compose.prod.yml --env-file .env --profile ops run --rm \
  al_lio_migrator node scripts/postgres/bootstrap-runtime-role.mjs

docker exec al_lio_postgres psql -U al_lio -d al_lio -c \
  "select rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin from pg_roles where rolname='al_lio_app';"
```

## 8. Replace only approved services

Replace the web application:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --no-deps al_lio_web
docker compose -f infra/docker-compose.prod.yml --env-file .env ps
docker logs --tail=100 al_lio_web
docker exec al_lio_web wget -qO- http://127.0.0.1:3000/api/health
docker exec al_lio_web wget -qO- http://127.0.0.1:3000/api/ready
curl -fsS https://al-lio.danielcode.dev/api/health
curl -fsS https://al-lio.danielcode.dev/api/ready
```

Only after both web checks succeed, start or replace Radar if this release
stopped or changed it:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --no-deps al_lio_radar
docker compose -f infra/docker-compose.prod.yml --env-file .env ps
docker logs --tail=100 al_lio_radar
```

Exactly one Radar replica is supported.

## 9. Operate editorial review

Collection and classification are automatic; publication is not:

```bash
docker exec al_lio_radar node dist/cli/reviewStatus.js --json
docker exec al_lio_radar node dist/cli/reviewList.js
docker exec al_lio_radar node dist/cli/reviewApprove.js <id> --actor <reviewer> --reason "<verifiable reason>"
docker exec al_lio_radar node dist/cli/reviewReject.js <id> --actor <reviewer> --reason "<rejection reason>"
```

Review title, summary, canonical URL, cycle assignment, modules and expiry. If
there is doubt, reject. Pending and rejected candidates never reach AL-LIO.

Install the versioned review-queue monitor when it is not already active:

```bash
sudo install -m 0644 infra/systemd/al-lio-radar-review-health.service /etc/systemd/system/
sudo install -m 0644 infra/systemd/al-lio-radar-review-health.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now al-lio-radar-review-health.timer
sudo systemctl start al-lio-radar-review-health.service
systemctl status al-lio-radar-review-health.service --no-pager
```

## 10. Functional smoke test

Verify at minimum:

- password access for a provisioned test account;
- Google OAuth and Calendar connect/disconnect boundary;
- dashboard rendering;
- create, complete and delete a test task;
- create a note and see it after reload;
- profile and cycle persistence;
- no legacy general-news items;
- each cycle sees only its approved Radar items;
- one controlled Radar approval and exactly one recorded delivery;
- repeated delivery remains idempotent;
- Work, Courses, and Events/Challenges;
- persistence after restarting only `al_lio_web`.

Do not enable public demo access merely to simplify a smoke test. Watch redacted
logs through the release observation window.

## Application rollback

Migrations must remain compatible with the previous application image during
the rollback window. Restore the previous `AL_LIO_IMAGE_TAG`, then:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --no-deps al_lio_web
curl -fsS https://al-lio.danielcode.dev/api/ready
```

Do not run automatic down migrations during an incident.

## Radar rollback

Radar can be stopped without removing news already delivered to PostgreSQL:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env stop al_lio_radar
```

Restore the previous Radar SHA and image tag, rebuild only Radar and start only
`al_lio_radar`. Do not revert the additive application news migration during a
Radar incident.

## Database recovery

Restoring a database discards changes made after the selected backup. Confirm
the incident, stop application writes and preserve the damaged state before a
destructive restore. Always exercise the selected dump first with
`verify-backup-production.sh`.

## Release record

Record the application and Radar SHAs, operator, backup identifiers, migration
status, smoke result and rollback references. Keep the previous images until
the observation window closes, retain encrypted backup evidence outside the
VPS and never delete Docker volumes as routine cleanup.
