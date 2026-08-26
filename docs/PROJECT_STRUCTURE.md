# Project structure

## Application

- `src/app/`: App Router routes, layouts and route handlers.
- `src/components/`: React components and product views.
- `src/lib/`: authentication, repositories, domain services and integrations.
- `src/middleware.ts`: protected-route and session boundary.
- `public/`: static assets served by Next.js.

## Data and persistence

- `infra/postgres/schema.sql`: immutable PostgreSQL baseline.
- `infra/postgres/migrations/`: ordered, checksummed database changes.
- `csv/`: reviewed import inputs and editorial working datasets.
- `data/`: legacy news snapshots retained for controlled transition only;
  production news is stored in PostgreSQL.

## Operations

- `infra/Dockerfile`: production Next.js image.
- `infra/docker-compose.prod.yml`: supported VPS topology.
- `infra/Caddyfile.example`: reverse-proxy example.
- `infra/systemd/`: reviewed host-level service and timer units.
- `scripts/deploy-production.sh`: guarded one-command routine VPS release.
- `scripts/`: validation, import, migration, backup and smoke-test commands.
- `.env.example`: local configuration contract.
- `.env.production.example`: production configuration contract.

## Documentation

- `README.md`: public product and engineering entry point.
- `docs/`: maintained project documentation.
- `docs/AUTONOMOUS_PRODUCTION_DEPLOY.md`: owner-facing routine release guide.
- `docs/architecture/decisions/`: accepted architecture decision records.
- Root governance files: contribution, security, conduct, notice and licence.

## Separate Radar repository

AL-LIO Radar is intentionally maintained as a separate repository and
container. Its source catalogue, scraping policy, review queue and SQLite
outbox do not belong inside the web application. The integration contract is
documented in both repositories and versioned in code.

## Files that must not be committed

- `.env` and `.env.local`;
- `.next/` and `node_modules/`;
- database dumps and migration rehearsal artifacts;
- runtime logs and screenshots containing personal data;
- OAuth tokens, webhook secrets, session secrets and deploy keys;
- real student, family or employment-application data;
- private AI-assistant memory or operator credentials.

Local assistant guidance may exist outside Git, but it is not part of the
public project documentation.

## Placement rule

New files must have one clear owner. Runtime code belongs in `src`, deployment
material in `infra`, repeatable operator commands in `scripts`, reviewed import
inputs in `csv` and maintained explanations in `docs`. Generated artifacts do
not belong in the repository unless they are an intentional public asset.
