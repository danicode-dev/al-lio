# Tests

Automated checks that run on Node's built-in test runner (`node --test`). There
is no test framework dependency; every file uses `node:test` and
`node:assert/strict`.

## Running

```bash
npm run test:unit   # node --test "tests/**/*.test.mjs"
npm test            # check:project + content validators + test:unit + typecheck
npm run ci          # full gate, includes npm test
```

`test:unit` discovers every `*.test.mjs` under `tests/` (recursively). A new
test file is picked up automatically — no package.json change needed.

## Two assertion styles

Both styles appear in this suite on purpose.

- **Behavioural.** Import a pure function from `src/lib/**` and assert on its
  output. Used where the logic is reachable without a browser, a database or a
  running server (`catalog-navigation`, most of `product-tour`,
  `radar-v4-contract`).
- **Source-string assertion.** `readFile()` a source or config file and
  `assert.match(source, /…/)` against it. Used to lock in a structural
  guarantee in a file that a unit test cannot exercise directly — a shell
  script, a GitHub workflow, a wiring decision in a component. These are
  regression guardrails, and they are intentionally strict: renaming or
  reformatting the matched line breaks the test even when behaviour is
  unchanged. When a refactor legitimately moves such a line, update the regex
  in the same change.

## Files

| File | Covers |
|---|---|
| `security-boundaries.test.mjs` | Broad catch-all: session tokens, Radar signature/id checks, news text cleaning, job-radar validation, auth wiring, deploy wiring, doc paths, onboarding, email. Mostly source-string assertions. |
| `catalog-navigation.test.mjs` | `getNextCatalogItem` wrap-around behaviour. |
| `product-tour.test.mjs` | Onboarding tour state machine and step model. |
| `radar-v4-contract.test.mjs` | Radar v4 delivery schema, supported schema versions, fact projection. |
| `deploy-production-script.test.mjs` | `scripts/deploy-production.sh` pins a reviewed forward-only `main` commit. |
| `compose-env-guard.test.mjs` | Routine deploys accept only additive namespaced web/Radar environment passthroughs and reject every material Compose change. |
| `deploy-production-workflow.test.mjs` | `.github/workflows/deploy-production.yml` waits for post-merge CI. |
| `fixtures/radar-v4/` | Sample delivery payloads (v3 strict, v4 complete/partial/conflicting) used by `radar-v4-contract`. |

## Known wart

`security-boundaries.test.mjs` is ~3,700 lines and mixes many unrelated
areas. Splitting it into `tests/<area>/` folders is planned once the in-flight
content branches merge, to avoid conflicting with tests those branches add.
Until then, put a new test in its own focused file rather than growing the
catch-all.
