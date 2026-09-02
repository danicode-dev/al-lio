# Project structure

## Application

- `src/app/`: App Router routes, layouts, route handlers and route-level access control.
- `src/features/`: named product features with explicit public entry points.
- `src/shared/`: cross-feature UI composition and utilities with multiple consumers.
- `src/components/`: established shared React components being adopted by features.
- `src/lib/`: shared authentication, database primitives and integrations that
  do not yet have one product owner. Product repositories and actions belong to
  `src/features/<feature>/server/`.
- `src/middleware.ts`: protected-route and session boundary.
- `public/`: static assets served by Next.js; brand-asset ownership and
  canonical variants are mapped in `public/assets/README.md`.
- `tests/`: Node test-runner suites; see `tests/README.md`.

## Data and persistence

- `infra/postgres/schema.sql`: immutable PostgreSQL baseline.
- `infra/postgres/migrations/`: ordered, checksummed database changes.
- `csv/`: reviewed import inputs and editorial working datasets; see
  `csv/fp-content/2026-2027/README.md` and the
  [content source inventory](integrations/CONTENT_SOURCE_INVENTORY.md).
- `data/`: hand-maintained JSON import sources (learning competencies and the
  Work-tab company catalogues); see `data/README.md`. Nothing is written here
  at runtime — delivered content lives in PostgreSQL.
- `docs/audits/`: reproducible, dated review evidence. An audit snapshot is not
  runtime or publication authority; its inputs and retention reason must be
  recorded in the content source inventory.

## Operations

- `infra/Dockerfile`: production Next.js image.
- `infra/docker-compose.prod.yml`: supported VPS topology.
- `infra/Caddyfile.example`: reverse-proxy example.
- `infra/systemd/`: reviewed host-level service and timer units.
- `scripts/deploy-production.sh`: guarded one-command routine VPS release.
- `scripts/`: validation, import, migration, backup and smoke-test commands;
  see `scripts/README.md`.
- `.env.example`: local configuration contract.
- `.env.production.example`: production configuration contract.

## Documentation

- `README.md`: public product and engineering entry point.
- `docs/README.md`: maintained-documentation index.
- `docs/product/`, `docs/architecture/`, `docs/integrations/`, `docs/operations/`:
  maintained product, system-design, external-contract, content-governance and
  production-operations documentation.
- `docs/aircury-report/`: reviewed report source, evidence provenance and the
  final visual-evidence catalogue for the Aircury Summer of Code 2026 delivery.
- `docs/architecture/decisions/`: accepted architecture decision records.
- `.github/`: contribution, security and conduct policies plus issue/PR
  templates and workflows. Notice and licence stay at the repository root.

## Separate Radar repository

AL-LIO Radar is intentionally maintained as a separate repository and
container. Its source catalogue, scraping policy, review queue and SQLite
outbox do not belong inside the web application. The integration contract is
documented in both repositories and versioned in code.

## Files that must not be committed

- `.env` and `.env.local`;
- `.next/` and `node_modules/`;
- database dumps and migration rehearsal artifacts;
- runtime logs and screenshots containing personal data;
- OAuth tokens, webhook secrets, session secrets and deploy keys;
- real student, family or employment-application data;
- private AI-assistant memory or operator credentials.

Local assistant guidance may exist outside Git, but it is not part of the
public project documentation.

## Placement rule

New files must have one clear owner. Runtime code belongs in `src`, deployment
material in `infra`, repeatable operator commands in `scripts`, reviewed import
inputs in `csv` and maintained explanations in `docs`. Generated artifacts do
not belong in the repository unless they are an intentional public asset.

App Router pages compose feature UI through `@/features/<feature>`. When a route
or another feature needs a narrower contract, it may import the explicit public
barrels `@/features/<feature>/client`, `/domain`, `/presentation`, or `/server`.
Client code may import `/server/actions` as the one explicit Next.js Server
Action boundary; repository barrels must never be re-exported through it.
Other concrete files below those barrels remain private. Product code must not
introduce view-string routing shells. ADR-0008 defines the full dependency rule
and `npm run check:boundaries` enforces it.

## Authoritative locations and owners

Every supported file class has one home, one owner, and one drift guard. These
rows are the authoritative reference; the linked inventories carry the per-item
detail and must be updated in the same change that adds, renames or retires an
item.

| File class | Authoritative location | Owner | Drift guard |
| --- | --- | --- | --- |
| Runtime feature | `src/features/<feature>/` with an `index.ts` public entry; server code under `server/`, the single Server Action boundary at `server/actions` | the named feature | ADR-0008, `npm run check:boundaries` |
| Shared application code | `src/shared/` (multi-consumer composition), `src/components/` (adopted shared React), `src/lib/` (auth, DB primitives and integrations with no single feature owner) | engineering | `npm run check:boundaries`, `npm run check:project` |
| Canonical editorial input | `csv/` (bulk catalogues) and `data/` (hand-maintained JSON); one importer or build-time consumer each | the import pipeline named in the inventory | [`CONTENT_SOURCE_INVENTORY.md`](integrations/CONTENT_SOURCE_INVENTORY.md) + `tests/operations/importers/content-source-inventory.test.mjs` |
| Raw / candidate source | raw importer shape under `csv/fp-content/<year>/raw`; unapproved material under a sibling `source-*` / `*-candidates` folder, never wired to an importer | the curating pipeline | same inventory (`raw` / `candidate` classes) |
| Test fixture | beside the owning contract or domain under `tests/<layer>/<domain>/`; `tests/support/` only for genuinely cross-domain infrastructure | the owning domain | [`tests/README.md`](../tests/README.md), `npm run test:taxonomy` |
| Generated / reproducible output | not committed. The one exception is an intentional public asset in `public/`. Every generated file names an executable regeneration command | whoever owns the generator | `.gitignore`, the "Files that must not be committed" list above |
| Retained audit / migration / delivery evidence | audits in `docs/audits/`; ordered checksummed migrations in `infra/postgres/migrations/`; per-release evidence in `docs/operations/release-records/`; report provenance in `docs/aircury-report/` | the governing decision or pipeline | inventory retention reason; `npm run validate:migrations` |
| Registered compatibility code | the route, handler or flag file keeps a `// COMPAT-REGISTER: <id>` marker; one matching row in [`COMPATIBILITY_REGISTER.md`](architecture/COMPATIBILITY_REGISTER.md) | the owner domain named in the register | `tests/architecture/repository/compatibility-register.test.mjs` (bijection) |
| Public asset | `public/`, mapped in [`public/assets/README.md`](../public/assets/README.md) with a canonical variant and a named consumer | the consuming module | `tests/architecture/design-system/brand-assets.test.mjs` |

## Retention rules

- **Compatibility code** is retained only with all four of: a named consumer
  (or an explicit "no in-repo caller, kept for persisted links or old
  clients"), an owner domain, an observability or evidence line, and a
  concrete exit condition. Missing any one makes it a `removal-candidate` that
  moves to an exact-path follow-up issue, not an inline deletion.
- **Retained evidence** is kept only with a stated recovery or retrieval
  reason, and, for a dated snapshot, the source revision that reproduces it.
- **Generated files** are kept only with a committed regeneration path; a
  generated file with no regeneration command is drift.
- **Uncertainty is classification work, not deletion evidence.** An unresolved
  case is recorded as an inventory row, a register row, or a baseline group
  and handed to a focused issue; it is never resolved by deleting the file.

## Repository hygiene review

### Unused code and dependencies

One command, one baseline:

```bash
npm run audit:unused        # CI gate: exact bidirectional comparison
npm run audit:unused:raw    # investigation only: Knip's unclassified report
```

`scripts/check-unused-code.mjs` compares Knip's current findings against the
exact set in `docs/audits/unused-code-baseline.json`. It fails on a **new**
finding and on a **stale** baseline entry, so a same-count replacement cannot
pass. Every baseline group carries `classification`, `owner`, `reason`,
`followUp` and exact `kind:path:symbol` identifiers; wildcards and blanket Knip
ignores are rejected.

To classify a finding:

1. Decide whether it is genuinely unreachable, a dynamic or string consumer
   that static analysis cannot see, or a deliberately retained surface.
2. Add or extend a baseline group with a real owner, a one-line reason, a
   follow-up (issue URL or a retain-until condition) and the exact identifier
   — never a wildcard.
3. For a confirmed removal, open a **focused exact-path issue** (child of
   #276) that names the exact file(s) or symbol(s), the consumer search
   performed, the before/after finding count, the excluded siblings, and a
   source-only rollback. That issue does the deletion; this review only
   classifies.

Two baseline artifacts, different jobs:

- `docs/audits/unused-code-baseline.json` is **live**. It is updated in the
  same change that resolves or reclassifies a finding. It currently holds
  exactly **3** classified findings: the compatibility-gated tech-opportunities
  helper (#376), the dynamically loaded `eslint-config-next` dev dependency,
  and `resetProductTourAction` retained for Product Lab #195.
- `docs/audits/unused-code-audit.md` is **frozen**. It is the point-in-time
  snapshot at revision `6bc4509` (101 findings). It is history; never rewrite
  its counts to track the live baseline.

### Periodic review

Run before a hygiene-affecting merge and at each repository-hygiene checkpoint:

```bash
npm run audit:unused
npm run check:project
npm run check:boundaries
npm run test:taxonomy
node --test tests/architecture/repository/
node --test tests/operations/importers/content-source-inventory.test.mjs
```

Expected evidence: `audit:unused` reports the exact classified count with no
new or stale finding; the compatibility register and its source markers stay a
bijection; every inventory path resolves with its class, owner and consumer;
new fixtures sit beside their owner. A finding that survives the review with no
consumer and no retention reason becomes a focused exact-path removal issue.
