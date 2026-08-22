# Delivery status

This document records what the repository now provides and what still requires
owner or external-service action before public release and production use.

## Completed in the repository

- Product-first English README and maintained documentation index.
- English architecture catalogue, system diagrams, and decision records.
- Governance, contribution, conduct, security, acknowledgement, and licensing files.
- Separate AL-LIO and Radar ownership boundary with a versioned signed webhook.
- GitHub CI, CodeQL, dependency review, Dependabot, pull-request template, and issue forms.
- Executable security-boundary tests for sessions, Radar HMAC, identifiers, and news sanitization.
- Engineering-language validation for AL-LIO and Radar.
- Operations handbook for monitoring, backup/recovery, release, rollback, and evidence.
- Safe demo and screenshot protocol.
- Ordered final owner review checklist.

## Verified locally

- AL-LIO full `npm run ci`, including production build.
- Radar lint, engineering-language validation, type-check, 180 tests, and build.
- GitHub YAML parsing for workflows, issue forms, and Dependabot configuration.
- Markdown link resolution across both repositories.
- Git whitespace validation.
- Changed-file and reachable-history scans for strong secret signatures.
- Production dependency audits with no reported vulnerabilities.

## Manual release gates

- Review and commit both worktrees through pull requests.
- Push branches and confirm hosted GitHub Actions, CodeQL, and dependency review results.
- Enable branch protection after required checks exist on GitHub.
- Configure external HTTPS, host-capacity, Radar heartbeat, and outbox monitoring.
- Configure encrypted off-host backups, retention, credentials, and a recurring restore exercise.
- Review public screenshots and presentation copy using fictional data.
- Re-run secret and history scanning before changing Radar repository visibility.
- Approve release SHAs, create tags, and deploy through the VPS runbook.

## Deliberate exclusions

- No production service, Docker container, database, VPS, or repository visibility was changed.
- No commit, push, merge, tag, or release was created automatically.
- No monitoring vendor, backup provider, credential, or retention value was guessed.
- Spanish interface copy, curricular labels, source keywords, and realistic editorial test fixtures remain Spanish by design.
