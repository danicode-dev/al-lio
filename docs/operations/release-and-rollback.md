# Release and rollback

## Release unit selection

Classify each change before deployment:

- **Web only:** replace `al_lio_web`; do not rebuild or restart Radar or PostgreSQL.
- **Radar only:** replace `al_lio_radar`; preserve the Radar volume and AL-LIO database.
- **Schema change:** rehearse and apply migrations through the dedicated migrator before replacing dependent services.
- **Configuration only:** validate the rendered Compose configuration and restart only affected services.

## Approval gates

A release is blocked unless all of the following are true:

- the exact commit SHA has been reviewed;
- CI passes on the proposed branch;
- the working tree is clean;
- production configuration validation passes without exposing secrets;
- current service and volume inventory has been captured;
- fresh backups restore successfully in isolation;
- replacement images build before healthy services are stopped;
- the previous image references remain available;
- a named operator owns smoke testing and rollback.

## Controlled sequence

1. Complete [`release-records/TEMPLATE.md`](release-records/TEMPLATE.md) in a private evidence location.
2. Follow [`../DEPLOY_VPS.md`](../DEPLOY_VPS.md) without skipping steps.
3. Replace only the approved release unit.
4. Verify public health and readiness endpoints.
5. Complete authenticated smoke tests without using real personal data.
6. Observe logs, restart counts, resource use, Radar queue, and outbox.
7. Declare success only after the observation window is complete.

## Rollback triggers

Rollback rather than patching live when:

- readiness fails after replacement;
- login, dashboard, tasks, profile, or cycle filtering regresses;
- error or restart rates increase materially;
- Radar delivers incorrect cycle metadata or cannot drain approved batches;
- a migration rehearsal result differs from production evidence.

Rollback steps and database-recovery constraints are authoritative in
[`../DEPLOY_VPS.md`](../DEPLOY_VPS.md). Never invent a live fix under pressure.

## Versioning and tags

Create a release tag only after the reviewed changes are committed, CI passes,
the deployment is approved, and the release record identifies the exact SHAs.
This worktree is intentionally not tagged or deployed automatically.
