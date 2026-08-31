# Production readiness

This document separates repository capabilities from evidence that must be
re-verified for every production release. A checked box from an old deployment
is not evidence for a new one.

## Implemented repository capabilities

- Standalone, non-root Next.js production image.
- Read-only container filesystem with bounded temporary storage.
- Docker resource, process and log-rotation limits.
- Separate web, PostgreSQL, Radar and migrator service boundaries.
- Liveness and PostgreSQL readiness endpoints.
- Signed sessions and secure production cookie settings.
- Password and demo-access rate limiting.
- Production demo access disabled by default.
- Ordered, transactional and checksummed PostgreSQL migrations.
- Explicit rejection of unaudited legacy databases.
- Restricted application database role and separate migration credentials.
- PostgreSQL backup and isolated restore-verification scripts.
- Radar SQLite persistence and restart-safe delivery outbox.
- HMAC-authenticated Radar webhook with replay protection and idempotency.
- Transactional Radar batch ingestion and server-side cycle filtering.
- Human review required for every currently enabled Radar source.
- Runtime, migration, Radar-integration and deployment validators.

## Per-release blocking gates

Before changing production, the operator must record evidence for every item:

- [ ] The web and Radar release SHAs were reviewed and belong to their expected branches.
- [ ] The working trees are clean and the resolved Docker image tags match those SHAs.
- [ ] Required secrets exist, are not committed and satisfy the minimum length checks.
- [ ] The current containers, volumes, database migration status and external network were inventoried.
- [ ] A fresh PostgreSQL backup completed and restored successfully in isolation.
- [ ] The Radar volume was backed up with its writer stopped.
- [ ] Pending migrations were rehearsed against restored data.
- [ ] The application database role retains only runtime privileges.
- [ ] The candidate images were built before stopping or replacing healthy services.
- [ ] `/api/health` and `/api/ready` succeeded internally and over HTTPS.
- [ ] Login, dashboard, tasks, profile, Calendar boundary and cycle-filtered news were smoke-tested.
- [ ] Radar health, review queue and one controlled approved delivery were verified.
- [ ] The previous application and Radar image references remain available for rollback.
- [ ] Backup evidence exists outside the VPS failure boundary.

Use [`DEPLOY_VPS.md`](DEPLOY_VPS.md) for the exact sequence. Failure of a
blocking gate stops the release; it is not converted into a warning.

## User-data readiness

Before inviting additional real users, verify and retain evidence for:

- external monitoring of `/api/health` and `/api/ready`;
- automated encrypted off-host PostgreSQL and Radar backups;
- regular restore exercises;
- user-to-user authorisation and identifier-tampering tests;
- active-session rotation and revocation policy;
- redacted server error reporting;
- CSP, HSTS and Caddy origin policy;
- documented retention and deletion expectations;
- a tested incident-response and secret-rotation procedure.

## Performance and maintainability backlog

- Replace global dashboard loading with page-specific queries.
- Continue moving established shared infrastructure into explicit feature,
  shared or server owners under ADR-0008.
- Paginate large lists and remove `SELECT *` from hot paths.
- Add explicit caching only for shared catalogues with controlled invalidation.
- Measure slow PostgreSQL queries and route-level Web Vitals.
- Define a JavaScript budget per critical route.
- Add browser end-to-end coverage for login, tasks, Bloc, Calendar, profile and
  mobile navigation.

## Release-ready definition

A release is production-ready only when repository verification passes, every
blocking gate has current evidence, backup restoration succeeds and the
previous application version remains recoverable. A healthy container alone is
not sufficient evidence.
