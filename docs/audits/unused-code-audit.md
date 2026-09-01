# Unused code and dependency audit

Tracking issue: [#333](https://github.com/danielgarciaortega-dev/al-lio/issues/333)  
Repository hygiene parent: [#276](https://github.com/danielgarciaortega-dev/al-lio/issues/276)  
Audited revision: `6bc4509` (`main` at the start of the audit)

## Outcome

Knip 6.34.0 is pinned as the repository-wide static unused-code analyzer. The
initial snapshot contains 101 exact findings. This change records and guards
them; it does not delete, move or de-export application code.

| Finding kind | Count | Classification |
|---|---:|---|
| Unused files | 9 | 8 confirmed removal candidates; 1 compatibility-register candidate |
| Unused runtime dependencies | 4 | Confirmed removal candidates |
| Unused development dependencies | 1 | Retained dynamic tooling reference |
| Unused runtime exports | 60 | Confirmed API-surface review candidates |
| Unused exported types | 27 | Confirmed API-surface review candidates |
| **Total** | **101** | Exact baseline, not a numeric allowance |

The machine-readable inventory is
[`unused-code-baseline.json`](./unused-code-baseline.json). Each group has an
owner, reason, follow-up and exact identifiers. The CI guard compares set
identity in both directions, so a new finding cannot replace an old one while
keeping the same count.

## Tool evaluation

Knip was selected over an ESLint-only or TypeScript-only check because it
builds a project graph across files, exports, types, dependencies, scripts and
framework entry points. The pinned version supports the repository's Node 22
CI runtime and has a Next.js plugin that recognizes App Router pages, layouts,
route handlers and middleware.

The configured boundary includes:

- Next.js application modules under `src/**/*.{ts,tsx}`; the Next.js plugin is
  auto-enabled by the installed framework and configuration;
- operational and import scripts under `scripts/**/*.mjs`;
- Node test suites, Playwright suites, Playwright global setup/teardown and the
  Playwright config;
- root TypeScript and module configuration files.

SQL migrations, CSV/JSON content and public assets are data rather than
JavaScript graph nodes. Their consumers remain visible through the included
scripts and application entry points.

The Playwright plugin is disabled narrowly because loading this repository's
config intentionally fails without the synthetic E2E session secrets created
by the isolated runner. Playwright's config, tests and setup files are instead
declared as static entries. No file, dependency or symbol ignore list is used.

`server-only` is now a direct pinned dependency. Next.js handles the marker at
build time, while declaring it explicitly prevents package-boundary tooling
from reporting every valid `import "server-only"` as an unlisted dependency.

## Initial classification

### Files

Already tracked by the compatibility register:

- `src/lib/tech-opportunities/tech-opportunities.ts` — removal remains gated by
  production access-log evidence in [#376](https://github.com/danielgarciaortega-dev/al-lio/issues/376).

Confirmed candidates with no reachable importer:

- `scripts/setup-postgres-schema.mjs`
- `src/components/ui/separator.tsx`
- `src/components/ui/table.tsx`
- `src/features/resources/server/repository.ts`
- `src/features/work/server/opportunity-repository.ts`
- `src/lib/db/repositories/reminders.ts`
- `src/lib/db/repositories/sources.ts`
- `src/lib/fp/roadmap-overview.ts`

Each candidate will be removed only through a focused child issue of #276.

### Dependencies

The following runtime packages have no reachable code, script, test or config
consumer and are candidates for a focused package cleanup:

- `@dnd-kit/core`
- `@dnd-kit/utilities`
- `class-variance-authority`
- `date-fns`

`eslint-config-next` is not unused. `eslint.config.mjs` loads it through the
string values `next/core-web-vitals` and `next/typescript` passed to
`FlatCompat.extends`, which a static import graph cannot resolve. It remains an
explicitly documented exception in the exact baseline, not a Knip ignore.

### Exports and types

The 60 runtime exports and 27 exported types belong to reachable modules but
have no external consumer. Their exact file-and-symbol identifiers are kept in
the baseline. A later focused issue should decide whether each symbol becomes
module-private or is removed; this audit does not assume that an unused export
means its implementation is unused inside the same file.

## Commands and drift policy

```bash
npm run audit:unused
npm run audit:unused:raw
```

The first command is the local and CI gate. It fails when:

- Knip produces a new unexplained finding;
- a baseline finding disappears but its reviewed entry is left stale;
- a baseline entry is duplicated, uses a wildcard or lacks classification,
  ownership, rationale or follow-up;
- the installed Knip version differs from the pinned baseline version.

The raw command is for investigation only. A baseline update is acceptable
only when the pull request explains the changed evidence and links the focused
owner/follow-up. Broad ignores and count-only thresholds are not acceptable.

## Scope and limitations

Static analysis cannot prove that dynamically loaded modules, operational
entry points or string-referenced tools are unused. That is why configuration,
scripts, tests and registered compatibility evidence are modeled explicitly.
No production access logs, database records or deployment state were queried
by this audit, and no code candidate was deleted.
