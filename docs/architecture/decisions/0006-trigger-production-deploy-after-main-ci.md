# ADR-0006: Trigger production deployment after successful main CI

**Status:** Accepted

## Context

ADR-0005 established a guarded, SHA-pinned release command for the single VPS.
Routine releases still required an owner or coding agent to copy the merge SHA,
open an administrative SSH session and invoke that command. This repeated work
adds delay and operator variance without adding a new approval boundary because
the owner has already reviewed the change and chosen to merge it.

## Decision

Treat `main` as the production release branch. After the `CI` workflow succeeds
for a push to `main`, GitHub Actions deploys that run's immutable `head_sha`
through the existing guarded VPS command.

Use the GitHub `Production` environment for deployment credentials, a repository
variable as an explicit activation switch and a concurrency group that never
cancels an active release. Pin the SSH host identity. Restrict the Actions SSH
key to a forced command that accepts only `deploy <full-SHA>` and invokes the
versioned `scripts/deploy-production.sh` from the currently healthy release.

Keep `workflow_dispatch` and the direct VPS command as recovery paths. Do not
duplicate build, migration, health or rollback logic in the GitHub workflow.

## Consequences

- Merging into `main` means approving the change for automatic production
  release after post-merge CI.
- Routine deployments no longer require an interactive operator or coding
  agent.
- Failed CI and invalid event origins cannot access the production job.
- A compromised deploy key cannot request an interactive shell or arbitrary
  command, although the deploy account and Docker boundary still require normal
  host security and key rotation.
- GitHub availability and the configured SSH credential become dependencies of
  the automatic path; the manual VPS path remains independent.
- Infrastructure and exceptional database changes continue to stop for manual
  review under ADR-0005. A narrowly versioned allowlist may admit additive web
  environment passthroughs without permitting unrelated Compose changes.

## Evidence

- `.github/workflows/deploy-production.yml`
- `scripts/github-actions-deploy-entrypoint.sh`
- `scripts/deploy-production.sh`
- `tests/deploy-production-workflow.test.mjs`
- `docs/GITHUB_PRODUCTION_DEPLOY.md`
- `docs/AUTONOMOUS_PRODUCTION_DEPLOY.md`
