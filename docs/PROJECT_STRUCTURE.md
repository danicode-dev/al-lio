# Project structure

## Application

- `src/app/`: App Router routes, layouts, route handlers and route-level access control.
- `src/features/`: named product features with explicit public entry points.
- `src/shared/`: cross-feature UI composition and utilities with multiple consumers.
- `src/components/`: established shared React components being adopted by features.
- `src/lib/`: shared authentication, database primitives and integrations that
  do not yet have one product owner. Product repositories and actions belong to
  `src/features/<feature>/server/`.
- `src/middleware.ts`: protected-route and session boundary.
- `public/`: static assets served by Next.js.
- `tests/`: Node test-runner suites; see `tests/README.md`.

## Data and persistence

- `infra/postgres/schema.sql`: immutable PostgreSQL baseline.
- `infra/postgres/migrations/`: ordered, checksummed database changes.
- `csv/`: reviewed import inputs and editorial working datasets; see
  `csv/fp-content/2026-2027/README.md` and the
  [content source inventory](integrations/CONTENT_SOURCE_INVENTORY.md).
- `data/`: hand-maintained JSON import sources (learning competencies and the
  Work-tab company catalogues); see `data/README.md`. Nothing is written here
  at runtime — delivered content lives in PostgreSQL.
- `docs/audits/`: reproducible, dated review evidence. An audit snapshot is not
  runtime or publication authority; its inputs and retention reason must be
  recorded in the content source inventory.

## Operations

- `infra/Dockerfile`: production Next.js image.
- `infra/docker-compose.prod.yml`: supported VPS topology.
- `infra/Caddyfile.example`: reverse-proxy example.
- `infra/systemd/`: reviewed host-level service and timer units.
- `scripts/deploy-production.sh`: guarded one-command routine VPS release.
- `scripts/`: validation, import, migration, backup and smoke-test commands;
  see `scripts/README.md`.
- `.env.example`: local configuration contract.
- `.env.production.example`: production configuration contract.

## Documentation

- `README.md`: public product and engineering entry point.
- `docs/README.md`: maintained-documentation index.
- `docs/product/`, `docs/architecture/`, `docs/integrations/`, `docs/operations/`:
  maintained product, system-design, external-contract, content-governance and
  production-operations documentation.
- `docs/aircury-report/`: reviewed report source, evidence provenance and the
  final visual-evidence catalogue for the Aircury Summer of Code 2026 delivery.
- `docs/architecture/decisions/`: accepted architecture decision records.
- `.github/`: contribution, security and conduct policies plus issue/PR
  templates and workflows. Notice and licence stay at the repository root.

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

App Router pages compose feature UI through `@/features/<feature>`. When a route
or another feature needs a narrower contract, it may import the explicit public
barrels `@/features/<feature>/client`, `/domain`, `/presentation`, or `/server`.
Client code may import `/server/actions` as the one explicit Next.js Server
Action boundary; repository barrels must never be re-exported through it.
Other concrete files below those barrels remain private. Product code must not
introduce view-string routing shells. ADR-0008 defines the full dependency rule
and `npm run check:boundaries` enforces it.
