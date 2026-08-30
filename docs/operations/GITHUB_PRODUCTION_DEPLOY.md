# GitHub-triggered production deployment

This guide configures the low-touch production path for AL-LIO. A successful
post-merge `CI` run on `main` starts the guarded VPS deployment automatically.
The release remains pinned to the exact merge SHA and the existing manual
command remains available for recovery.

## Release flow

1. An implementation is reviewed locally and in a pull request.
2. GitHub branch protection requires the pull-request checks to pass.
3. The owner merges the pull request into `main`.
4. `CI` validates the resulting commit on `main`.
5. `.github/workflows/deploy-production.yml` receives the successful CI result
   and passes `workflow_run.head_sha` to the VPS.
6. The restricted SSH key can invoke only `deploy <SHA>`.
7. The forced VPS entrypoint calls `scripts/deploy-production.sh` from the
   currently healthy release.
8. The guarded script builds, audits migrations, replaces only the web service,
   verifies health/readiness and rolls the web service back on failure.

The deployment workflow is serialized with `cancel-in-progress: false`. A
release already changing production is never interrupted by a newer merge. The
VPS script also holds its own filesystem lock as a second line of defence.

## One-time VPS identity

Create an Ed25519 key used only by GitHub Actions. Do not reuse an owner's SSH
key and never commit either half of the key pair.

Install the versioned forced-command entrypoint for the existing non-root deploy
user:

```bash
install -d -m 700 "$HOME/.local/bin"
install -m 755 scripts/github-actions-deploy-entrypoint.sh \
  "$HOME/.local/bin/al-lio-github-deploy"
```

Add the public key to that user's `~/.ssh/authorized_keys` with restrictions:

```text
restrict,command="/home/ubuntu/.local/bin/al-lio-github-deploy" ssh-ed25519 <public-key> al-lio-github-actions
```

The forced command rejects an empty command, a shell command and every argument
except one lowercase 40-character SHA. The deploy user must not be `root`; it
needs access only to the existing Docker deployment boundary and AL-LIO release
directories.

Obtain the SSH host public key through an already trusted administrative
connection. Store the complete `known_hosts` line; do not discover and trust a
new key inside the deployment workflow.

## One-time GitHub configuration

Use the existing GitHub environment named `Production` and restrict its
deployment branches to protected branches. Configure these environment secrets:

| Secret | Value |
|---|---|
| `PRODUCTION_SSH_HOST` | Production hostname or IPv4 address |
| `PRODUCTION_SSH_PORT` | SSH port; leave empty only when it is `22` |
| `PRODUCTION_SSH_USER` | Dedicated non-root deploy user |
| `PRODUCTION_SSH_PRIVATE_KEY` | Complete private Ed25519 key for the restricted public key |
| `PRODUCTION_SSH_KNOWN_HOSTS` | Pinned `known_hosts` entry for the production endpoint |

Create the repository Actions variable below only after the VPS entrypoint and
all environment secrets are ready:

```text
PRODUCTION_AUTO_DEPLOY_ENABLED=true
```

The variable is an operational kill switch. Removing it or changing it to
`false` makes GitHub skip both automatic and manually dispatched deployments;
the direct VPS command remains available.

Do not configure a required reviewer on the `Production` environment when the
intended policy is automatic deployment after merge. Add a required reviewer
only when deliberately changing to a human-approved production gate.

## Normal owner workflow

1. Review the implementation locally.
2. Confirm the pull request points to `main` and all required checks are green.
3. Merge the pull request.
4. Open **Actions > Deploy production** only when observing progress or
   diagnosing a red run.
5. Treat a green `Deploy exact main SHA` job as operational evidence that the
   exact merge commit is healthy in production.
6. Perform the desired owner-facing functional review in production.

No SSH session or coding-agent involvement is required for a healthy routine
release.

## Manual GitHub retry

The workflow supports `workflow_dispatch`. Enter a full SHA already reachable
from `main`. This is useful when CI was successful but a transient SSH or VPS
availability problem prevented deployment.

The VPS rejects a downgrade, a divergent commit and a SHA outside `origin/main`.
Repeatedly dispatching the SHA already running is a safe health-checked no-op.

## Failure behaviour

- Failed, cancelled or skipped CI does not start a deployment.
- Pull-request CI, fork CI and manually dispatched CI do not start a deployment.
- Missing configuration or an invalid SHA fails before opening SSH.
- SSH uses the pinned host key and fails closed if the server identity changes.
- A build failure leaves the current production web container untouched.
- A failure after web replacement invokes the existing automatic rollback.
- Infrastructure, Radar, operator-managed catalogue and non-additive migration
  changes stop and require [`DEPLOY_VPS.md`](DEPLOY_VPS.md). The only Compose
  exception is a strictly additive, namespaced environment passthrough under
  `al_lio_web` or `al_lio_radar`. The guard validates the service, target key,
  host-variable namespace, default syntax, placement and uniqueness. Any removal,
  modification, relocation, duplicate or unrelated edit fails closed.

If a workflow reports `CRITICAL`, disable
`PRODUCTION_AUTO_DEPLOY_ENABLED`, prevent further merges and follow the manual
recovery runbook.

## Manual VPS fallback

The automatic workflow does not replace the operator command. Follow
[`AUTONOMOUS_PRODUCTION_DEPLOY.md`](AUTONOMOUS_PRODUCTION_DEPLOY.md) to connect
through the trusted administrative SSH identity and run:

```bash
./scripts/deploy-production.sh <full-40-character-main-commit-sha>
```

This fallback uses the same deployment engine, checks and rollback behaviour as
GitHub Actions.
