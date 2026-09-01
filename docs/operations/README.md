# Operations handbook

This handbook defines the operational evidence required to run AL-LIO safely.
It supplements the executable deployment sequence in [`DEPLOY_VPS.md`](DEPLOY_VPS.md); it does not replace it.

The production release and readiness documents also live in this folder:
[`DEPLOY_VPS.md`](DEPLOY_VPS.md), [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md),
and the per-release evidence under [`release-records/`](release-records/TEMPLATE.md).

## Operating principles

- Treat the web application, PostgreSQL, and Radar as separate release units.
- Deploy only reviewed commit SHAs from clean working trees.
- Build replacements before stopping healthy services.
- Back up and rehearse restoration before a migration or destructive action.
- Keep secrets, dumps, student data, and private operational evidence outside Git.
- Stop whenever a blocking check is missing or produces ambiguous evidence.

## Maintained runbooks

- [`GITHUB_PRODUCTION_DEPLOY.md`](GITHUB_PRODUCTION_DEPLOY.md): automatic post-merge release path and one-time GitHub/VPS configuration.
- [`AUTONOMOUS_PRODUCTION_DEPLOY.md`](AUTONOMOUS_PRODUCTION_DEPLOY.md): routine owner-operated release command and stop conditions.
- [`PRIMARY_DOMAIN_MIGRATION.md`](PRIMARY_DOMAIN_MIGRATION.md): one-time blue/green primary-domain cutover and rollback procedure.
- [`ENVIRONMENT_AND_ACCOUNT_ISOLATION.md`](ENVIRONMENT_AND_ACCOUNT_ISOLATION.md): production, shared-development and local account/data separation, including guarded retirement of the five legacy demo identities.
- [`OPENWEBINARS_NEWS_PILOT.md`](OPENWEBINARS_NEWS_PILOT.md): coordinated, reversible activation of the first source/cycle news pilot.
- [`monitoring.md`](monitoring.md): health signals, alert ownership, and incident triage.
- [`backup-and-recovery.md`](backup-and-recovery.md): backup boundaries and restore evidence.
- [`release-and-rollback.md`](release-and-rollback.md): release approval and recovery decisions.
- [`release-records/TEMPLATE.md`](release-records/TEMPLATE.md): evidence template for every production change.
- [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md): repository capabilities versus per-release gates.

## Repository versus operator responsibilities

The repository provides health endpoints, validation scripts, controlled
migrations, backup/restore commands, resource limits, and rollback procedures.
The operator must still configure an external monitoring provider, an encrypted
off-host backup destination, credentials, notification recipients, retention,
and evidence storage. Those external values must never be guessed or committed.
