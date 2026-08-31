# Architecture decision records

Decision records preserve the context and trade-offs behind stable system
boundaries. They do not replace executable configuration or tests.

## Status values

- `Proposed`: under review and not an implementation commitment.
- `Accepted`: current architecture.
- `Superseded`: replaced by a later decision.
- `Rejected`: considered but not adopted.

## Index

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-use-self-hosted-postgresql.md) | Use self-hosted PostgreSQL as the application source of truth | Accepted |
| [0002](0002-separate-radar-from-the-student-application.md) | Separate Radar from the student application | Accepted |
| [0003](0003-require-reviewed-signed-radar-delivery.md) | Require reviewed, signed and idempotent Radar delivery | Accepted |
| [0004](0004-use-english-engineering-and-spanish-product-content.md) | Use English engineering artefacts and Spanish product content | Accepted |
| [0005](0005-use-controlled-single-vps-releases.md) | Use controlled single-VPS releases with explicit migration and rollback | Accepted |
| [0006](0006-trigger-production-deploy-after-main-ci.md) | Trigger production deployment after successful main CI | Accepted |
| [0007](0007-gate-the-app-behind-completed-onboarding.md) | Gate the application behind completed onboarding | Accepted |

## Required sections

Every ADR records status, context, decision, consequences and implementation
evidence. A new ADR supersedes an accepted decision instead of silently
rewriting its history.
