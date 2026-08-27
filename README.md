# AL-LÍO

AL-LIO is an open-source student workspace that turns scattered academic,
career and training information into clear next actions.

It combines planning, vocational-skills learning, curated opportunities,
cycle-specific news and progress tracking in one Spanish-language product for
Higher Vocational Education students.

[Live application](https://al-lio.danielcode.dev) · [Documentation](docs/README.md) · [VPS runbook](docs/DEPLOY_VPS.md)

> The product interface and educational content are intentionally in Spanish.
> Source code, technical documentation and engineering collaboration use
> English.

## Who AL-LIO serves

The current curriculum model supports five Spanish Higher Vocational
Education programmes:

| Code | Programme |
|---|---|
| `DAW` | Web Application Development |
| `DAM` | Multiplatform Application Development |
| `AF` | Administration and Finance |
| `TSAF` | Teaching and Socio-Sports Animation |
| `MP` | Marketing and Advertising |

Each authenticated user has one cycle profile. News, learning competencies and
recommended resources are filtered on the server for that profile.

## What the product provides

- A private dashboard with weekly priorities and progress.
- Personal tasks, calendar entries and a persistent notes workspace.
- Competency-based learning paths with curated Spanish video resources.
- Courses, hackathons, companies and employment-oriented opportunities.
- Cycle-specific news reviewed through the independent AL-LIO Radar service.
- Google Calendar connection through server-side OAuth.
- Profile and onboarding state persisted in PostgreSQL.

## What makes the news feed different

AL-LIO does not publish a general newspaper feed. The separate AL-LIO Radar
service collects
metadata from a restricted source catalogue, applies deterministic curricular
rules and requires an auditable human approval before delivery.

Radar never writes to AL-LIO PostgreSQL. It delivers approved batches through a
versioned HTTPS webhook protected by HMAC, replay protection and idempotency.
AL-LIO then filters every item by the authenticated student's cycle.

## Current status

The application is deployed on a VPS and currently provides:

- Next.js 15 App Router with React 19 and TypeScript;
- self-hosted PostgreSQL persistence and versioned migrations;
- signed application sessions;
- Google OAuth account creation and Calendar access;
- email/password access for explicitly provisioned accounts;
- production Docker Compose boundaries for web, Radar and PostgreSQL;
- liveness and database-readiness endpoints;
- backup, restore rehearsal and rollback procedures;
- a separate, persistent Radar scheduler and review queue.

Self-service email registration is deliberately unavailable: `/register`
redirects to `/login`. Demo profile access is disabled by default in production
and must never be presented as a public authentication mechanism.

## Architecture

```text
Browser
  -> Caddy / HTTPS
  -> AL-LIO Next.js
       -> PostgreSQL
       -> Google OAuth and Calendar APIs

Approved sources
  -> AL-LIO Radar
       -> deterministic classification
       -> human review
       -> signed webhook v2
  -> AL-LIO Next.js
       -> PostgreSQL
       -> cycle-filtered student feed
```

The full system boundaries, diagrams and decisions are maintained in
[`docs/architecture/`](docs/architecture/README.md).

## Repository layout

```text
src/        Next.js routes, UI, domain services and integrations
infra/      Docker, Caddy, PostgreSQL and operational units
scripts/    validation, imports, migrations and recovery utilities
csv/        reviewed import datasets and editorial working data
data/       legacy news snapshots; not the production source of truth
docs/       maintained product and engineering documentation
```

AL-LIO Radar remains a separate repository and process so that source
collection cannot gain direct access to student data or the application
database. Its application boundary is documented in
[`docs/AL_LIO_RADAR_INTEGRATION.md`](docs/AL_LIO_RADAR_INTEGRATION.md); the
repository link will be published after Radar completes its public-release
safety checklist.

## Requirements

- Git;
- Node.js 22 LTS;
- npm;
- Docker Desktop only when using the local PostgreSQL sandbox.

## Local development

```bash
git clone https://github.com/danicode-dev/al-lio.git
cd al-lio
npm ci
cp .env.example .env.local
npm run dev
```

`npm run dev` executes the startup validation before starting Next.js.
The validation loads the same environment files as Next.js and stops before
the server starts when a required value such as `SESSION_SECRET` is missing.

Git worktrees do not copy ignored environment files. Before starting a new
worktree, copy or securely link the configured local `.env`/`.env.local` files
into it; never commit those files.

Run the same startup validation directly with `npm run verify:startup`.

The minimum required local variables are documented in `.env.example`. Never
commit `.env`, `.env.local`, database dumps, OAuth tokens, session secrets or
real student data.

## Database

The immutable baseline is `infra/postgres/schema.sql`. Later changes are
applied through ordered, checksummed migrations protected by a PostgreSQL
advisory lock.

Start and validate the isolated local sandbox with:

```bash
npm run postgres:sandbox:up
npm run postgres:schema:validate-sandbox
```

Inspect and apply migrations with:

```bash
npm run postgres:migrate:status
npm run postgres:setup
```

An existing database without migration history is rejected. Baseline adoption
is an explicit recovery operation and must only follow a verified backup and a
successful rehearsal. See [`docs/DEPLOY_VPS.md`](docs/DEPLOY_VPS.md).

## Verification

Fast local verification:

```bash
npm run verify:cheap
```

Full repository verification:

```bash
npm run ci
```

Production-boundary validation:

```bash
npm run validate:production-deploy
```

## Production

The supported deployment target is a single VPS running Docker Compose behind
Caddy. Images are identified by reviewed Git commit SHAs. Database changes use
the dedicated migrator profile; normal application startup never applies
migrations implicitly.

Use the controlled procedure in [`docs/DEPLOY_VPS.md`](docs/DEPLOY_VPS.md).
Do not deploy from an uncommitted working tree and do not rebuild Radar or
PostgreSQL for a web-only release.

## Documentation

Start with [`docs/README.md`](docs/README.md). It links the maintained product,
architecture, integration, source-governance and operations documents.

## Security

Please read [`SECURITY.md`](SECURITY.md) before reporting a vulnerability. Do
not disclose secrets, OAuth tokens, personal data or exploitable details in a
public issue.

## Acknowledgement

AL-LIO was developed with mentoring and financial support from **Aircury SL**
through the **Aircury Summer of Code 2026** programme. See [`NOTICE.md`](NOTICE.md).

## License

AL-LIO is released under the [MIT License](LICENSE).
