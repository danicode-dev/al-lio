# ADR-0005: Use controlled single-VPS releases

**Status:** Accepted

## Context

AL-LIO operates on one VPS with a shared reverse-proxy network. The application
must remain recoverable without introducing a larger orchestration platform or
allowing routine deployments to mutate PostgreSQL implicitly.

## Decision

Deploy reviewed SHA-tagged Docker images through Docker Compose. Build before
replacement, back up and restore-test persistent data, run migrations through
the explicit ops profile, verify health and readiness and retain the previous
image references for rollback. Replace only the services included in the
reviewed release.

## Consequences

- A web-only release does not touch Radar or PostgreSQL.
- Operators must keep current runbook and release evidence.
- Database rollback relies on compatible migrations and verified backups, not
  automatic down migrations during an incident.
- Host-level monitoring, encrypted off-host backup and capacity remain
  operational responsibilities.

## Evidence

- `infra/docker-compose.prod.yml`
- `docs/DEPLOY_VPS.md`
- `docs/PRODUCTION_READINESS.md`
- `scripts/validate-production-deploy-readiness.mjs`
