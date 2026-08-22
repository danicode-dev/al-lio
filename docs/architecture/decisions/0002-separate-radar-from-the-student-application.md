# ADR-0002: Separate Radar from the student application

**Status:** Accepted

## Context

News collection parses untrusted external content and needs scheduler,
editorial and retry behaviour that is unrelated to student sessions. Giving a
scraper direct access to user data or PostgreSQL would expand the impact of a
source or parser defect.

## Decision

Maintain AL-LIO Radar as a separate repository, image, process and persistent
SQLite volume. Radar has no user authentication, no student UI and no direct
AL-LIO database connection. Its only application integration is a versioned
HTTPS webhook.

## Consequences

- External-source risk is isolated from student data.
- Radar and the web application can be released or stopped independently.
- The integration contract must be maintained in both repositories.
- Two persistent stores need separate backup and recovery procedures.
- Radar supports one scheduler replica because its SQLite boundary is
  single-writer.

## Evidence

- `infra/docker-compose.prod.yml`
- `docs/AL_LIO_RADAR_INTEGRATION.md`
- Radar `src/storage/` and `src/delivery/`
