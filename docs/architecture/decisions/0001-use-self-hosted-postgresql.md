# ADR-0001: Use self-hosted PostgreSQL

**Status:** Accepted

## Context

AL-LIO needs durable ownership of accounts, profiles, tasks, notes, learning
state and delivered content. Production already runs on a managed VPS boundary
and requires controlled backup, migration and recovery.

## Decision

Use PostgreSQL 17 in the AL-LIO Docker Compose project as the application source
of truth. The web service uses a restricted runtime role. Schema evolution uses
ordered, transactional, checksummed migrations through a separate operational
credential and migrator service.

## Consequences

- User ownership and relational constraints remain server-side.
- Backup, restore, monitoring and capacity are operator responsibilities.
- Normal application startup cannot gain migration privileges.
- Existing databases without verified migration history are rejected until an
  explicit baseline audit and rehearsal succeed.
- Legacy JSON news files are not authoritative production storage.

## Evidence

- `infra/docker-compose.prod.yml`
- `infra/postgres/schema.sql`
- `infra/postgres/migrations/`
- `scripts/postgres/migrate.mjs`
- `scripts/postgres/backup-production.sh`
