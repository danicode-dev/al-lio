# Architecture and stack

This document is the concise runtime reference. Detailed boundaries, diagrams
and decision records live alongside this file in [`README.md`](README.md) and
[`decisions/`](decisions/README.md).

## Runtime

- Framework: Next.js 15 App Router.
- Language: TypeScript.
- UI: React 19 with local components and Tailwind CSS.
- Database: self-hosted PostgreSQL 17.
- Database access: `pg` with explicit repositories and transactions.
- Authentication: signed application session cookie.
- Login: Google OAuth and password access for provisioned accounts.
- External integration: Google Calendar.
- Curated news: independent AL-LIO Radar service over signed webhook v2.
- Deployment: Docker Compose on a VPS behind Caddy.

Supabase and Vercel are not part of the current runtime.

## Application flow

```text
Browser
  -> Next.js App Router
  -> route handlers / server actions
  -> authentication, repositories and integrations
  -> PostgreSQL
```

## Radar flow

```text
Approved source catalogue
  -> fetch under host and content limits
  -> normalize and deduplicate metadata
  -> deterministic cycle classification
  -> human review
  -> persistent signed outbox
  -> POST /api/radar/v1/ingest
  -> transactional PostgreSQL upsert
  -> server-side profile filtering
```

Radar never receives user sessions and never connects to AL-LIO PostgreSQL.

## Production services

| Service | Responsibility | Persistent state |
|---|---|---|
| `al_lio_web` | Next.js UI, API, authentication and integrations | PostgreSQL only |
| `al_lio_postgres` | Application source of truth | `al_lio_postgres_data` |
| `al_lio_radar` | Scheduled source collection, review queue and delivery | `al_lio_radar_data` |
| `al_lio_migrator` | Explicit operational migration job | None |

`al_lio_web` and PostgreSQL share a private internal network. Radar reaches the
public HTTPS webhook and has no database network membership.

## Health boundaries

- `GET /api/health` confirms the web process is alive.
- `GET /api/ready` confirms the web process can reach PostgreSQL.
- Radar's container healthcheck verifies that its scheduler heartbeat is
  recent.

## Authoritative sources

- Runtime topology: `infra/docker-compose.prod.yml`.
- PostgreSQL baseline: `infra/postgres/schema.sql`.
- Database evolution: `infra/postgres/migrations/`.
- Radar receiver schema: `src/lib/radar/contract.ts`.
- Radar sender schema: `al-lio-radar/src/domain/item.ts`.
- Environment validation: `scripts/validate-runtime-env.mjs` and Radar's
  `src/config/env.ts`.
