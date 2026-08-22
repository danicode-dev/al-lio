# Production release record

Store completed records in the approved private evidence location, not in the
public repository when they contain infrastructure details.

## Scope

- Change summary:
- Release unit: web / Radar / database / configuration
- AL-LIO commit SHA:
- Radar commit SHA, when applicable:
- Operator:
- Reviewer:

## Pre-release evidence

- [ ] CI run link and result recorded.
- [ ] Clean working tree confirmed.
- [ ] Rendered Compose configuration validated.
- [ ] Current services, images, volumes, and migration status inventoried.
- [ ] PostgreSQL backup identifier, checksum, and isolated restore result recorded.
- [ ] Radar backup identifier and checksum recorded when applicable.
- [ ] Previous image references recorded.
- [ ] Migration rehearsal result recorded when applicable.

## Deployment evidence

- Replaced service or applied migration:
- Health endpoint result:
- Readiness endpoint result:
- Container health and restart count:
- Resource observation:

## Functional smoke test

- [ ] Login and logout.
- [ ] New or clean user starts without another user's data.
- [ ] Dashboard loads persisted state.
- [ ] Tasks create, update, and persist.
- [ ] Profile changes persist.
- [ ] Learning progress and notes persist.
- [ ] Google Calendar boundary behaves as expected.
- [ ] News shows only the selected cycle and Spanish-audience content.
- [ ] Radar review and one controlled delivery succeed when Radar changed.

## Decision

- Outcome: approved / rolled back / blocked
- Rollback image or recovery artifact, when used:
- Residual risks:
- Follow-up owner:
