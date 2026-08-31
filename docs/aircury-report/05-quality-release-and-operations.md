# Quality, release and operations evidence

Report-source material for issue #299. It records how AL-LIO verifies itself,
how a release reaches production, and what operational evidence the final
report needs. It also states, without inventing values, which evidence can
only be produced from the frozen delivery release and which operational facts
the owner still has to supply.

Every automated result in this document was executed against the working
documentation baseline `ccaa3f2` (the tip of the evidence-register branch), not
against the later delivery candidate. Such results remain labelled **working
baseline** and must never be cited as final evidence. Separate final CI,
deployment and public endpoint observations for
`1e516ead8f69d60a263718c20d59b97c9618c97a` are recorded in
[`01-delivery-brief.md`](01-delivery-brief.md) and evidence IDs `QAL-001`,
`OPS-001` and `VER-004`. Owner-operated controls and the authenticated smoke
test remain pending where labelled.

## 0. How this document is organised

| Part | Content |
|---|---|
| 1 | Engineering and operational mechanisms found in the reviewed repository |
| 2 | Reproducible working-baseline checks executed now |
| 3 | Evidence that can only be collected from the final frozen release |
| 4 | Owner-supplied operational information still pending |
| 5 | Known failures, limitations and incomplete controls |
| 6 | Evidence-capture table, release-evidence procedure and timeline |
| 7 | What belongs in the final PDF and what stays internal |

## 1. Mechanisms in the reviewed repository

Source: `package.json`, `.github/workflows/`, `scripts/`, `infra/`,
`docs/operations/`, `docs/architecture/decisions/`.

### 1.1 Continuous integration contract

- Workflow `CI` (`.github/workflows/ci.yml`) runs on pull requests to `main`,
  pushes to `main` and manual dispatch. Job `verify` uses Node 22.x, runs
  `npm ci` and then `npm run ci`.
- `npm run ci` chains, in order:
  `lint` → `test` → `validate:radar` → `validate:production-deploy` →
  `validate:postgres-app-integration` → `validate:migrations` → `build`.
- `npm run test` chains:
  `check:project` → `validate:fp-content` → `validate:learning-competencies` →
  `test:all` → `typecheck`.
- `test:all` chains: `test:taxonomy` then `node --test "tests/**/*.test.mjs"`.
- A separate `dependency-review` job runs on pull requests with
  `fail-on-severity: high`. `CodeQL` is a separate workflow.
- `verify:startup` = `validate:runtime` → `check:project` → `check:boundaries`
  → `validate:engineering-language` → `audit:schema` → `typecheck`.
  `verify:cheap` = `verify:startup` → `lint`.

### 1.2 Test taxonomy

Source: `scripts/check-test-taxonomy.mjs`, `tests/`, `tests/migration-inventory.json`.

- Five explicit layers under `tests/`: `unit`, `contracts`, `integration`,
  `architecture`, `operations`. Every test file must sit under a layer and an
  owner domain.
- Working-baseline file counts (`git ls-files 'tests/<layer>/**/*.test.mjs'`):
  unit 12, contracts 1, integration 17, architecture 2, operations 6 — 38
  focused files. Final counts belong to `ENG-003` at the frozen tag.
- Per-file limits: at most 60 `test(` blocks and 1,200 lines.
- `tests/migration-inventory.json` maps 263 legacy tests migrated for issue
  #274 to their current owner file and name; `check-test-taxonomy.mjs` asserts
  the file's `test(` count and titles match the inventory exactly. A migrated
  test may change its assertions or its name, but the inventory name must be
  updated in the same change.
- Many current tests are source-level string assertions that stand in for a
  Next.js, browser or database boundary the plain Node runner cannot execute;
  the test files declare this rationale.

### 1.3 Validators

- `validate:runtime` (`scripts/validate-runtime-env.mjs`) — required secrets,
  their minimum length, no placeholder values, paired Resend variables, Google
  redirect URI shape. Blocks startup.
- `validate:engineering-language` — English engineering comments and headings
  (ADR-0004); no retired internal Spanish symbols.
- `audit:schema` — schema/code consistency audit.
- `check:project` — repository structure and index consistency.
- `check:boundaries` (`scripts/check-feature-boundaries.mjs`) — feature-oriented
  module direction, public entry points and maximum module size (ADR-0008).
- `validate:radar` — the Compose fail-closed Radar publication boundary and the
  independently disabled Radar capabilities.
- `validate:production-deploy` (`scripts/validate-production-deploy-readiness.mjs`)
  — reverse-proxy compatibility, Compose safety, no `.env`/dump/archive staged.
- `validate:migrations` — the migration and Docker contract described below.
- `validate:postgres-app-integration` — requires a reachable PostgreSQL.
- `validate:fp-content`, `validate:learning-competencies`,
  `validate:learning-sources`, `validate:fp-competencias` — curated-catalogue
  input validation.

### 1.4 Schema and migration discipline

Source: ADR-0001, `infra/postgres/`, `scripts/postgres/migrate.mjs`,
`docs/operations/DEPLOY_VPS.md`.

- `infra/postgres/schema.sql` is the immutable baseline `0001_initial_schema`.
- Working baseline: 15 ordered forward migrations `0002_*` … `0016_*`, i.e. 16
  ordered units including the baseline. The final applied set belongs to
  `ENG-004` at the frozen tag.
- Migrations are additive, transactional and checksummed; they avoid `DROP`,
  `TRUNCATE` and destructive conversions and are rehearsed against a restored
  production backup first.
- The web service holds only the restricted `DATABASE_URL` role.
  `DATABASE_MIGRATION_URL` is given only to the dedicated `al_lio_migrator`
  service, which runs under the `ops` Compose profile and never during normal
  startup.
- A database without verified migration history is rejected until an explicit
  baseline audit and restore rehearsal succeed
  (`scripts/postgres/audit-baseline.mjs`).
- `npm run postgres:migrate:status` reports the applied/pending state against a
  live database.

### 1.5 Release and deployment control

Source: ADR-0005, ADR-0006, `docs/operations/DEPLOY_VPS.md`,
`docs/operations/GITHUB_PRODUCTION_DEPLOY.md`,
`docs/operations/AUTONOMOUS_PRODUCTION_DEPLOY.md`, `scripts/deploy-production.sh`,
`.github/workflows/deploy-production.yml`.

- Releases deploy reviewed, SHA-tagged Docker images through Docker Compose on
  one VPS. Candidate images are built before healthy services are stopped; the
  previous image references are retained for rollback; only the services in the
  reviewed release unit are replaced (web-only, Radar-only, schema, or
  configuration).
- After `CI` succeeds for a push to `main`, `deploy-production.yml` passes the
  exact `head_sha` over a restricted SSH key whose forced command accepts only
  `deploy <40-char-SHA>` and invokes `scripts/deploy-production.sh` from the
  currently healthy release. A repository variable
  `PRODUCTION_AUTO_DEPLOY_ENABLED` is an explicit on/off switch; a
  concurrency group never cancels an in-flight release.
- Failed, cancelled or skipped CI, and pull-request or fork CI, do not start a
  deployment. Infrastructure, Radar, operator-managed catalogue and
  non-additive migration changes stop and require the manual runbook.
- A failure after web replacement triggers the script's automatic web
  rollback. `workflow_dispatch` and the direct VPS command remain recovery
  paths.
- Release approval gates (`docs/operations/release-and-rollback.md`): reviewed
  SHA, green CI, clean working tree, validated rendered Compose config,
  captured service/volume/migration inventory, a fresh backup that restores in
  isolation, candidate images built first, previous images retained, and a
  named operator owning smoke testing and rollback.
- Rollback triggers: readiness failure after replacement; a regression in
  login, dashboard, tasks, profile or cycle filtering; a material rise in error
  or restart rates; Radar delivering incorrect cycle metadata or unable to
  drain approved batches; a migration rehearsal result differing from
  production.

### 1.6 Health, readiness and container hardening

Source: `src/app/api/health/route.ts`, `src/app/api/ready/route.ts`,
`infra/docker-compose.prod.yml`, `docs/operations/PRODUCTION_READINESS.md`.

- `GET /api/health` returns `200` with `{ ok: true, app: "al-lio" }` and
  confirms only that the web process is alive.
- `GET /api/ready` calls `checkDatabaseConnection()`; it returns `200` with
  `database: "ready"` on success and `503` with `database: "unavailable"` on
  failure, both `Cache-Control: no-store`.
- The Compose web healthcheck probes `/api/ready` internally every 30s.
- Web and Radar containers run non-root, read-only filesystem,
  `no-new-privileges`, all Linux capabilities dropped, with memory, CPU, PID
  and JSON log-rotation limits. `al_lio_web` and `al_lio_postgres` share an
  internal-only Docker network; Radar is excluded from it.

### 1.7 Backup, restore and recovery design

Source: ADR-0005, `docs/operations/backup-and-recovery.md`,
`docs/operations/release-and-rollback.md`.

- Protected stores: PostgreSQL (application and student state) and the Radar
  SQLite volume (source state, review decisions, delivery outbox).
- Minimum policy: automated encrypted off-host backups for both stores, at
  least one copy outside the VPS and hosting-account failure boundary, periodic
  restore verification into an isolated target, and private records of backup
  identifier, checksum, destination and restore result.
- Release-time: fresh PostgreSQL backup → isolated restore → schema/migration
  validation against the restored copy → Radar writer stopped for a consistent
  SQLite copy → both artefacts transferred off-host with recorded checksums,
  before any migration or risky change.
- Recovery decision: image rollback for an application regression without data
  corruption; Radar image rollback (volume preserved) for collector/delivery
  regressions; database restoration only for confirmed integrity loss or an
  unrecoverable migration; never a live down-migration during an incident.
- The repository does not contain off-host storage credentials, encryption
  keys, retention settings or a scheduler credential. Backup automation is an
  operator responsibility and a blocking gate for real-user readiness.

## 2. Working-baseline checks executed now

Executed at `ccaa3f2` on 31 August 2026 in a local Windows checkout. No
production system or database was contacted. Checks that require installed
package dependencies or a live database were not treated as executed. These
are **working baseline**, not final evidence.

| Check | Command | Result |
|---|---|---|
| Whitespace | `git diff --check ccaa3f2` | pass (clean) |
| Engineering language | `node scripts/validate-engineering-language.mjs` | pass |
| Project structure | `node scripts/check-project.mjs` | pass |
| Feature boundaries | `node scripts/check-feature-boundaries.mjs` | pass |
| Test taxonomy | `node scripts/check-test-taxonomy.mjs` | pass — 38 focused files, 263 mapped legacy tests |
| Schema/code audit | `node scripts/audit-schema-code.mjs` | pass |
| Radar integration | `node scripts/validate-radar-integration.mjs` | pass |
| Production-deploy readiness | `node scripts/validate-production-deploy-readiness.mjs` | pass |
| Migration and Docker contract | `node scripts/validate-migrations.mjs` | pass (file-based; no database connected) |
| Runtime env guard | `node scripts/validate-runtime-env.mjs` | not run successfully: this isolated worktree had no `node_modules`, so its `@next/env` dependency was unavailable. A final run requires `npm ci` first; syntactically valid ephemeral local values may be used for a non-production working check. |
| Learning persistence tests | `node --test tests/integration/learning/persistence-and-resources.test.mjs` | 1 failure — see section 5.1 |

Not executed here (require installed dependencies and/or a database; deferred to
CI on the frozen tag): `npm ci`, `validate:runtime`, `lint`, `typecheck`,
`build`, the full `test:all` run, `validate:fp-content`,
`validate:learning-competencies`, `validate:postgres-app-integration`. CI has
historically executed the full
`npm run ci` chain on merged changes (see section 6.3, historical evidence
only).

## 3. Evidence collected from or still required for the delivery candidate

The exact-SHA CI, guarded deployment, web image and public health/readiness
observations have now been collected. The remaining rows require final metric
collection, private production inventory or owner approval and must not be
inferred from the successful deployment alone.

| Evidence | Register ID | What must be recorded |
|---|---|---|
| Final release passes the CI contract | `QAL-001` | A clean `npm ci` and `npm run ci` (or the CI run) executed on the exact final tag SHA, with the workflow run URL, conclusion and timestamp |
| Test files and final test result | `ENG-003` | Tracked `*.test.mjs` count at the tag, plus the runner's own pass/fail summary from the final clean run — not inferred from file count |
| Commit count and development date range | `ENG-001` | `git rev-list --count <tag>` and first/last commit dates reachable from the tag |
| Source files and physical lines | `ENG-002` | Tracked `src` source files and line count at the tag; size indicator only |
| Applied schema migrations | `ENG-004` | Ordered migration files in the tag plus the production `postgres:migrate:status` result |
| App Router pages and route handlers | `ENG-005` | Tracked `page.tsx` and `route.ts` counts under `src/app` at the tag |
| Merged pull requests in the release | `ENG-006` | PR merge commits that are ancestors of the tag SHA |
| Health and readiness at cut-off | `OPS-001` | `/api/health` and `/api/ready` HTTP results observed over HTTPS at the evidence cut-off; owner-performed |
| Immutable image references | `OPS-003` | Final web image SHA, previous web image SHA, Radar image reference, PostgreSQL image — from the release record and production inventory; raw inventory stays private |
| Backup, restore and rollback readiness | `OPS-004` | Dated backup identifier/checksum, isolated restore-rehearsal result, and the rollback reference — publish only status and timestamp |
| Owner smoke test across all cycles | `QAL-002` | See section 3.1 |
| One immutable release baseline | `VER-004` | The aligned tag/SHA, web image, Radar reference, production state, verification record and cut-off from `01-delivery-brief.md` |

### 3.1 Owner-performed authenticated smoke test

Requirement, not an action to perform in this issue. The owner runs it once,
after the release is frozen, using purpose-built fictional accounts.

- One clean fictional account per supported vocational cycle. The working
  baseline shows five cycle codes in the schema (`DAW`, `DAM`, `AF`, `MP`,
  `TSAF`); the exact supported set and labels are confirmed by `Q-PRD-004` /
  `PRD-004` at the frozen release, and the smoke test must cover every cycle
  that query returns.
- For each account, exercise the agreed flow matrix: public entry and
  sign-in; onboarding and cycle selection; dashboard next actions; competency
  route and a learning resource; progress and a note; a task create/complete;
  the Google Calendar boundary behaviour; cycle-specific news showing only that
  cycle's Spanish-audience content; one opportunity flow (course, event,
  company or job); profile and cycle state.
- Record only aggregate outcomes (`QAL-002`, `aggregate-only`): pass/fail per
  flow and per cycle, the release SHA, the environment and the date. No
  screenshots are required for this result (issue #301 owns visual evidence).
  No personal data, no real accounts, no reusable demo credentials in the
  record.

## 4. Owner-supplied operational information still pending

These are facts only the owner can confirm. They are recorded here as fields,
not guesses. Do not fill them from assumptions.

| Field | Status |
|---|---|
| VPS hosting provider and account ownership | pending owner confirmation |
| `al-lio.app` domain registrar and ownership; DNS control | pending owner confirmation |
| Transactional email sender domain in production (`RESEND_FROM_EMAIL`) | pending owner confirmation of the final verified sender |
| External uptime monitoring provider for `/api/health` and `/api/ready` | pending owner setup and confirmation |
| Host CPU / memory / disk / inode / container-restart alerting | pending owner setup and confirmation |
| Radar heartbeat and delivery-outbox alerting | pending owner setup and confirmation |
| Primary and fallback human alert recipients | pending owner |
| Backup schedule, retention, off-host storage location and encryption | pending owner |
| Isolated restore-rehearsal cadence and last rehearsal date | pending owner |
| Dependency and security-update cadence and responsible person | pending owner |
| Editorial maintenance responsibility (Radar source review) | pending owner |
| Incident-response and rollback owner | pending owner |
| Expected current and projected monthly operating cost through 31 August 2027 | pending owner (economic detail is also owned by issue #300 / `ECO-001`) |
| Final release identifiers (tag, SHAs, image references, cut-off timestamp) | pending frozen release (`VER-004`, `OPS-003`) |

### 4.1 Maintenance commitment through 31 August 2027

`OPS-002` (`verified`) records that the project carries an operating commitment
through at least 31 August 2027, from the supplied programme rules and
`NOTICE.md`. This is a commitment, not evidence that future maintenance has
already happened. The operating plan that backs the commitment — hosting,
monitoring recipients, backup/restore schedule, update cadence, editorial
responsibility, incident/rollback owner and monthly cost — is the set of
pending fields in section 4 and must be completed before the report claims the
commitment is operationally supported.

## 5. Known failures, limitations and incomplete controls

### 5.1 CRLF-sensitive source-text locator (`markCompetencyCompleted`)

- File: `tests/integration/learning/persistence-and-resources.test.mjs`, test
  `"markCompetencyCompleted optimistically completes and rolls back on failure
  (issue #96)"`.
- Reproduced at `ccaa3f2` on a Windows checkout: the test fails at line 79 with
  `AssertionError: could not locate the markCompetencyCompleted action body`.
- Assessment. The test reads
  `src/features/learning/client/use-learning-actions.ts` (which exists at that
  exact path — the action was not moved or removed), finds the start anchor
  `markCompetencyCompleted: (skillId) =>`, then locates the block end with
  `storeSource.indexOf("\n    },\n  };")`. That end pattern uses LF-only
  newlines. On this machine the file is checked out with CRLF line terminators
  (65 CRLF, 0 LF-only; there is no repository `.gitattributes` normalising line
  endings and `core.autocrlf` is `true`), so the LF pattern is not found
  (`indexOf` returns `-1`) and the block cannot be sliced. The CRLF form
  `"\r\n    },\r\n  };"` is present in the file.
- Conclusion: this is a test-harness portability issue in the block-end
  locator, not a product defect. The optimistic-completion-with-rollback
  behaviour it checks is present. On CI (Linux checkout, LF) the pattern
  matches and the test passes, which is consistent with historical green CI
  runs. Per this issue's constraints, the test and the implementation are left
  unchanged here; a fix belongs to a code issue, ideally by adding a
  `.gitattributes` `* text=auto eol=lf` normalisation and/or making the
  locator newline-agnostic.
- Report impact: `QAL-001` must be recorded from the CI run on the frozen tag
  (Linux, LF), not from a local Windows `test:all`.

### 5.2 Operator-owned controls not yet evidenced

From `docs/operations/PRODUCTION_READINESS.md` and
`docs/operations/backup-and-recovery.md`, and consistent with the
"Open operational work" list in `docs/operations/release-records/v0.1.0.md`,
these controls are designed and scripted but require operator configuration
and dated evidence before real-user readiness:

- external HTTPS monitoring of `/api/health` and `/api/ready` from outside the
  hosting failure boundary;
- automated encrypted off-host PostgreSQL and Radar backups;
- a recorded isolated restore rehearsal;
- user-to-user authorisation and identifier-tampering test evidence;
- a tested incident-response and secret-rotation procedure;
- CSP / HSTS / origin-policy confirmation at the proxy.

Their status is `planned` (`OPS-004` and the section 4 fields), not
`delivered`.

### 5.3 Verification-coverage limitations

- Browser end-to-end coverage for login, tasks, Bloc, Calendar, profile and
  mobile navigation is on the backlog
  (`docs/operations/PRODUCTION_READINESS.md`); current automated coverage is
  unit, contract, integration (largely source-level), architecture and
  operations tests plus the owner smoke test.
- Performance items on the backlog: page-specific dashboard queries, list
  pagination, removal of `SELECT *` from hot paths, controlled catalogue
  caching, slow-query and Web-Vitals measurement, a per-route JavaScript
  budget.

### 5.4 Documentation inconsistency to resolve at release time

Older architecture prose names a single Radar webhook schema version (v2 in
`ARCHITECTURE_AND_STACK.md`, v3 in ADR-0003) while the code path supports a set
defined in `src/lib/radar/contract.ts` and Compose defaults to schema version
3 with v4 canonical-content projection present. The exact accepted set for the
frozen release must be confirmed and the report must use one number.

### 5.5 Historical release values are not final

`docs/operations/release-records/v0.1.0.md` contains concrete SHAs, a Radar
image reference, a "180 tests" Radar figure and a completed five-cycle owner
smoke test, all against the **previous** production hostname. These are
`historical` evidence for release v0.1.0 only. Product work continued after
v0.1.0; the final report must not present any v0.1.0 value as the delivery
baseline (`01-delivery-brief.md`).

## 6. Evidence, procedure and timeline

### 6.1 Evidence-capture table

Compact form for the final collection pass. "Baseline" is the release the
evidence is taken from. "Immutable ref" is the durable pointer stored with the
result. Full commands live in `02-evidence-register.md` (`C-ENG-*`) and in the
operations runbooks; they are not repeated in the PDF.

| ID | Command or source | Baseline | Timestamp requirement | Result status | Immutable ref | Publication boundary |
|---|---|---|---|---|---|---|
| `QAL-001` | `npm ci` + `npm run ci`, or the `CI` workflow run | final tag SHA | run start/end, ISO 8601 + tz | planned | workflow run URL + conclusion | public (conclusion + totals only) |
| `QAL-002` | Owner authenticated smoke test, agreed flow matrix | final release in production | test date + tz | planned | release record entry | aggregate-only (pass/fail per cycle) |
| `ENG-001` | `git rev-parse` / `git rev-list --count` / first+last `git log` | final tag | tag date | planned | tag SHA | public |
| `ENG-002` | tracked `src` source files + line count | final tag | collection date | planned | tag SHA | public (size indicator only) |
| `ENG-003` | tracked `*.test.mjs` count + runner summary | final tag + final CI run | run date | planned | tag SHA + run URL | public |
| `ENG-004` | migration files in tag + `postgres:migrate:status` | final tag + production DB | status check date | planned | tag SHA | public (counts + status) |
| `ENG-005` | tracked `page.tsx` + `route.ts` under `src/app` | final tag | collection date | planned | tag SHA | public (context, not feature count) |
| `ENG-006` | `gh pr list --state merged` + ancestor check vs tag SHA | final tag | collection date | planned | tag SHA | public |
| `OPS-001` | `/api/health` + `/api/ready` over HTTPS | production at cut-off | observation time + tz | planned | HTTP status + body summary | public |
| `OPS-003` | release record + production image inventory | final release | release time | planned | image SHAs / references | private inventory, public summary |
| `OPS-004` | backup id/checksum + isolated restore result + rollback ref | dated operational records | each record's date | planned | private evidence store | aggregate-only (status + timestamp) |
| `VER-004` | aligned tag / web image / Radar ref / prod state / verification record | final release | cut-off time | planned | tag SHA + record | public |

### 6.2 Release-evidence procedure (final AL-LIO and Radar)

To be executed once by the owner/operator when freezing the delivery release.
This issue only defines it.

1. Select the reviewed AL-LIO commit on `main` and, if Radar changed, the
   reviewed Radar commit. Confirm clean working trees and that CI is green for
   those exact SHAs.
2. Complete a private release record from
   `docs/operations/release-records/TEMPLATE.md`: change summary, release unit,
   SHAs, operator, reviewer.
3. Capture the current production service, image, volume and migration-status
   inventory before any change.
4. Create a fresh PostgreSQL backup; restore it into the isolated rehearsal
   database; run schema and migration validation against the restored copy. If
   Radar changed, stop its writer and copy its SQLite state. Transfer both
   artefacts off-host and record identifiers and checksums privately.
5. Build candidate images; deploy through the guarded path
   (`scripts/deploy-production.sh` via the post-merge workflow, or the manual
   runbook for an exceptional change); replace only the reviewed release unit.
6. Record `/api/health` and `/api/ready` over HTTPS, container health and
   restart counts, and a short resource observation window.
7. Run the section 3.1 authenticated smoke test across every supported cycle
   with fictional accounts; record aggregate pass/fail.
8. Create the release tag only after the record identifies the exact SHAs, CI
   is green and the deployment is approved.
9. Freeze the evidence cut-off timestamp. Fill `VER-004`, `OPS-001`,
   `OPS-003`, `OPS-004`, `QAL-001`, `QAL-002` and `ENG-001`–`ENG-006` from this
   run. Update `01-delivery-brief.md`'s deferred fields.

### 6.3 Delivery timeline (engineering phases)

Grouped from Git history reachable from `ccaa3f2` (330 commits, first commit
2026-04-24), the architecture decision records and
`docs/operations/release-records/`. Dates are approximate phase boundaries, not
continuous full-time effort. Exact commit counts and the date range are
`ENG-001` at the frozen tag.

| Phase | Approx. period | Summary | Source |
|---|---|---|---|
| 1. Scaffold and foundation | Apr–May 2026 | Next.js App Router + TypeScript + self-hosted PostgreSQL scaffold; first student surfaces | initial scaffold commit; `git log` |
| 2. Product build-out | Jun – mid-Aug 2026 | Tasks, calendar, Bloc notes, learning competencies and resources, courses and events, saved items, profile; first Radar news pipeline | `git log` merge history; `docs/integrations/` |
| 3. Architecture consolidation and release readiness | 22–27 Aug 2026 | ADR-0001…0005 recorded; production authentication with signed sessions, confirmation and rate limiting (issue #132); reviewed signed Radar delivery contract; manual and post-merge automated VPS deploy (ADR-0006); v0.1.0 release record | ADR dates; PRs #132/#139/#146; `release-records/v0.1.0.md` |
| 4. Trustworthy content and catalogue hardening | late Aug 2026 | Radar v4 canonical content; verified news details; trustworthy opportunity catalogue; verified job catalogue; learning-resource readiness gate | migrations `0011`–`0016`; `docs/integrations/`; PRs around #199–#206 |
| 5. Product polish and delivery preparation | 28–31 Aug 2026 | Onboarding tour; mobile navigation; news layout; primary-domain migration preparation (`al-lio.app`); test-suite taxonomy reorganisation (issue #274); feature-oriented architecture (ADR-0008); onboarding gate (ADR-0007); auth/login visual refresh; Aircury report source (issues #295–#296) | ADR-0007/0008 dates; `PRIMARY_DOMAIN_MIGRATION.md`; `git log` |

### 6.4 Known production risks

Owner and status fields are recorded, not assumed.

| Risk | Effect if unmanaged | Owner | Status |
|---|---|---|---|
| External monitoring and alerting not configured | An outage or backup failure is noticed late | pending owner | open |
| Off-host encrypted backups and a recorded restore rehearsal not yet evidenced | Recovery from data loss is unproven | pending owner | open |
| Single VPS, shared reverse proxy, no multi-node redundancy | A host failure is a full outage until restore/rollback | pending owner | accepted design (ADR-0005), needs stated RTO/RPO |
| Radar single scheduler replica (SQLite single-writer) | Collector cannot scale horizontally; a Radar outage pauses new curated content | project | accepted design (ADR-0002) |
| Editorial throughput depends on a human reviewer | Curated content freshness degrades if review lapses | pending owner (editorial responsibility) | open |
| Shared external services (email sender domain, job-source APIs) can change terms | Transactional email or job discovery degrades | pending owner | open, fallback options to document (issue #300) |
| Secret rotation procedure not yet tested | Slower, riskier response to a credential exposure | pending owner | open |
| CRLF-sensitive test locator (section 5.1) | A local Windows `test:all` is not clean; masks or is confused with real regressions | code issue (not #299) | open, CI unaffected |

## 7. Final-PDF extraction

This document is internal engineering evidence. The final report must not copy
it wholesale. Keep exact commands, full test listings, raw results, internal
paths, evidence IDs and step-by-step operational procedures here.

Move into the PDF only:

- one sentence that the final release passes the repository CI contract, with
  the workflow conclusion and date (`QAL-001`);
- the verified totals that matter to a reviewer: supported cycles, test count
  and result, migration count, App Router surface — each labelled with the
  frozen version and as engineering context, not impact (`ENG-001`–`ENG-006`);
- the material controls in plain language: signed sessions and onboarding gate,
  server-side ownership, restricted database role and separate migration
  credential, guarded SHA-pinned releases with automatic web rollback,
  human-reviewed signed content delivery, health/readiness endpoints, and the
  backup/restore/rollback model;
- the operating plan through 31 August 2027 as a short table: hosting, domain,
  monitoring recipients, backup/restore schedule, update cadence, editorial
  responsibility, incident/rollback owner, expected monthly cost — with any
  value still pending shown as pending, not invented;
- the honest limitations: operator-owned controls still to be evidenced,
  browser E2E coverage gap, single-VPS redundancy limit, and that a working
  endpoint on the delivery date is current-operation evidence only;
- the one immutable release reference (`VER-004`) once frozen.

Everything else — command transcripts, the CRLF locator detail, the full risk
table, the capture procedure — stays in this file and the operations runbooks
for auditability.

## Status

Issue #299 remains open for owner review and for the final frozen-release
evidence. No value in this document is presented as final evidence.
