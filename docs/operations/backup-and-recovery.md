# Backup and recovery

## Protected data boundaries

- PostgreSQL contains application and student state.
- Radar SQLite contains source state, review decisions, and the delivery outbox.
- Environment files and provider credentials are secrets, not backup artifacts for Git.
- Docker images are reproducible release artifacts identified by reviewed SHAs.

## Minimum production policy

- Create automated encrypted off-host backups for PostgreSQL and Radar.
- Keep at least one copy outside the VPS and OVH account failure boundary.
- Define retention according to the project's privacy and recovery requirements.
- Verify backup integrity and restore into an isolated target on a recurring schedule.
- Record backup identifier, checksum, storage destination, and restore result privately.
- Stop the Radar writer while copying its SQLite state, as required by the VPS runbook.

## Release-time evidence

Before a database migration or risky production change:

1. Create a fresh PostgreSQL backup using the supported scripts.
2. Restore it into the isolated rehearsal database.
3. Run the schema and migration validation against the restored copy.
4. Stop Radar and create a consistent copy of its persistent state.
5. Confirm both artifacts were transferred to encrypted off-host storage.
6. Record checksums and restoration evidence in the private release record.
7. Resume only after every step succeeds.

Exact commands and service names remain in [`../DEPLOY_VPS.md`](../DEPLOY_VPS.md)
so they are maintained in one place.

## Recovery decision

- Use image rollback for an application regression without data corruption.
- Use Radar image rollback for collector or delivery regressions; preserve its volume.
- Use database restoration only for confirmed integrity loss or an unrecoverable migration.
- Never overwrite the only backup or restore directly over a running database.
- Preserve the failed state long enough for diagnosis when privacy rules allow it.

## Manual configuration gate

The repository does not contain off-host storage credentials, encryption keys,
retention settings, or a scheduler credential. Production backup automation is
therefore not complete until the operator configures and verifies those external
components. This is a blocking gate for real-user readiness.
