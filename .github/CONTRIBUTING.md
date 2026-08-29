# Contributing to AL-LIO

AL-LIO accepts focused contributions that preserve student ownership,
cycle-specific relevance and production safety.

## Before starting

- Use a GitHub issue for non-trivial product or architecture changes.
- Use private security reporting for vulnerabilities.
- Never commit real personal data, credentials, tokens, dumps or production
  evidence.
- Keep the Spanish product experience and the English engineering convention
  separate: UI copy may be Spanish; code, comments and technical documents are
  English.
- Do not weaken Radar review or source restrictions to increase content volume.

## Local setup

```bash
git clone https://github.com/danicode-dev/al-lio.git
cd al-lio
npm ci
cp .env.example .env.local
npm run dev
```

Use fictional or isolated data for development.

## Workflow

1. Branch from the reviewed `main` revision.
2. Keep the change small enough to review and roll back.
3. Update documentation in the same change when behaviour or operations move.
4. Add focused verification for behaviour changes.
5. Run the required local checks.
6. Open a pull request that explains the issue, evidence, risk and out-of-scope
   work.

Suggested branch names use an English type and short description, for example
`fix/radar-idempotency` or `docs/architecture-overview`.

## Verification

Run at least:

```bash
npm run verify:cheap
```

Before a release-affecting merge, run:

```bash
npm run ci
```

Database, Radar or deployment changes also require their dedicated validators
and the relevant rehearsal described in `docs/operations/DEPLOY_VPS.md`.

## Code expectations

- Prefer root-cause fixes over interface-only workarounds.
- Keep server-side ownership and cycle filtering at the data boundary.
- Validate untrusted input with explicit schemas.
- Avoid hidden network calls and fail safely when optional integrations are
  unavailable.
- Do not log secrets, full webhook payloads, OAuth tokens or personal content.
- Preserve compatibility through explicit migrations and versioned contracts.
- Avoid unrelated refactors in a bug fix.

## Pull-request evidence

A pull request should contain:

- the problem and acceptance criteria;
- the implementation boundary;
- verification commands and results;
- migration, security and rollback impact;
- screenshots for visible changes, without personal data;
- explicit out-of-scope items.

Contributions are licensed under the repository's MIT License.
