# Delivery status

This document separates completed repository and production work from the
remaining owner-operated controls for the first tagged AL-LIO release.

## Completed delivery work

- The public repository uses the MIT licence and credits Aircury SL.
- Product, architecture, security, contribution and operations documentation
  is maintained in English.
- Spanish interface copy, curriculum labels and editorial fixtures remain
  localized product content by design.
- Engineering-language validation covers source comments, internal symbols and
  maintained technical-document headings.
- GitHub CI, CodeQL, dependency review and Dependabot are configured.
- AL-LIO and Radar remain separate services with a versioned, HMAC-signed and
  idempotent webhook boundary.
- The final-delivery documentation changes were merged through AL-LIO pull
  request 62 and Radar pull request 2.
- Job Radar authentication, validation and error boundaries were hardened
  through AL-LIO pull request 68.
- The reviewed web runtime was deployed as immutable image
  `al-lio-web:30911b9ba27693cf267d140efd29d6b07bfbf3db`.
- Radar and PostgreSQL retained their existing healthy containers during the
  web-only deployment.
- SSH access uses a registered public key; password authentication remains
  disabled and KVM is reserved for recovery.

## Verification evidence

- AL-LIO `npm run ci` passes from a clean installation.
- Radar `npm run ci` passes with 180 tests across 23 files.
- Production dependency audits report no known vulnerabilities.
- Markdown relative links resolve in both repositories.
- Tracked-file scans find no committed private keys, production databases,
  dumps or strong secret signatures.
- GitHub CI, CodeQL, dependency review and Vercel checks passed for the merged
  delivery pull requests.
- Public `/api/health` and `/api/ready` return HTTP 200.
- Unauthenticated `/api/job-radar` returns HTTP 401 without an internal error.
- The production login was checked on desktop and mobile with no console errors
  or warnings.
- The owner completed an authenticated smoke test with one fictional account
  for each supported cycle.

## Remaining owner-operated controls

These items do not invalidate the deployed application, but they remain open
operational or presentation work:

- Select and approve public presentation screenshots containing fictional data.
- Configure external alerts for web readiness, Radar heartbeat, editorial
  backlog and outbox age.
- Replicate encrypted backups outside the VPS and record an isolated restore
  exercise.
- Assign named alert recipients and an incident escalation route.
- Review pending dependency major upgrades in dedicated compatibility changes;
  do not merge failing or unrelated automated updates into the release.

## Release boundary

The first release tag records the reviewed repository state. The deployed web
runtime SHA, preserved service images, verification evidence and rollback
reference are recorded in
[`release-records/v0.1.0.md`](release-records/v0.1.0.md).

No repository document contains production credentials, reusable demo
passwords, OAuth tokens, webhook secrets or personal student data.
