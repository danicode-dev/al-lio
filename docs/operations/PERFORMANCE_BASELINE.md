# Critical-route performance baseline and budgets

Issue #331. A reproducible production-build baseline for the routes that matter
most, with small budgets derived from the measurement rather than aspiration,
and a check that blocks a meaningful bundle regression in CI.

This is a measurement document. It does **not** change data access, the
application store, or any UI, and it does not add an analytics provider.

## Measurement environment

| | |
|---|---|
| Node.js | `v24.11.1` (the only version installed; no nvm/fnm) |
| Next.js | `15.5.23` (`output: "standalone"`) |
| Command | `npm run build` (production build), then `npm run perf:budgets` |
| Baseline commit | `1a4edd3` (2026-09-02) |
| Machine | local; the build is deterministic for a given commit + Node + `package-lock.json`, so CI reproduces the same chunk set |

The check reads the build's own manifests (`.next/app-build-manifest.json`,
`.next/build-manifest.json`) — it never rebuilds. CI already runs `npm run
build` immediately before `npm run perf:budgets`.

## Selected critical routes

Two anonymous entry points and the five authenticated surfaces a student uses
daily:

`/` (public landing) · `/login` · `/dashboard` · `/tasks` · `/bloc` ·
`/calendar` · `/profile`

Not in the initial set: catalogue detail routes, `/settings`, `/sources`,
`/roadmap`, the bilingual legal pages, and every `/api/*` handler (no client
JS). They can be added once these seven have budgets that hold.

## Baseline — production build route output

From `npm run build` at `1a4edd3` (Next's own "First Load JS" column, gzipped):

| Route | Route output (Size) | First Load JS |
|---|---:|---:|
| `/` | 133 B | 119 kB |
| `/login` | 5.59 kB | 117 kB |
| `/dashboard` | 10.6 kB | 147 kB |
| `/tasks` | 140 B | 144 kB |
| `/bloc` | 21.3 kB | 163 kB |
| `/calendar` | 4.02 kB | 146 kB |
| `/profile` | 6.35 kB | 177 kB |
| **Shared by all** | — | **103 kB** (`1255…` 46.1 kB + `4bd1b696…` 54.2 kB framework + 2.2 kB) |
| Middleware | — | 34.7 kB |

## Baseline — the metric the check enforces

`scripts/check-route-budgets.mjs` computes, per route,

```
gzip( unique( build-manifest.rootMainFiles  +  app-build-manifest.pages[key],  .js only ) )
```

This tracks Next's "First Load JS" column within ~3–5 kB and is deterministic
for the same build. Recorded in [`docs/audits/route-budgets.json`](../audits/route-budgets.json):

| Route | `baselineKb` (gzip) | `warnKb` (×1.10) | `failKb` (×1.25) |
|---|---:|---:|---:|
| `/` | 115.8 | 127 | 145 |
| `/login` | 113.9 | 125 | 142 |
| `/dashboard` | 143.7 | 158 | 180 |
| `/tasks` | 141.0 | 155 | 176 |
| `/bloc` | 159.2 | 175 | 199 |
| `/calendar` | 142.6 | 157 | 178 |
| `/profile` | 172.4 | 190 | 215 |
| shared | 100.1 | — | — |

- **Warning** (`>= warnKb`, prints `::warning::`, exit 0): investigate before it
  becomes a failure.
- **Failure** (`>= failKb`, non-zero exit, blocks CI): a real regression — trim
  the added client JS, or, if the growth is reviewed and intended, raise the
  budget in `route-budgets.json` **with a reason** in the same PR.
- If a route drops more than 3 kB below its `baselineKb`, the check prints a
  note to lower `baselineKb` and lock the win.

## Core Web Vitals

No field CWV are collected today: AL-LÍO ships no analytics provider and adding
a paid one is out of scope for this issue (and needs owner approval). The
`/api/collect` endpoint exists but is not wired to a Web-Vitals beacon.

Lab CWV, when needed, is an **owner-run** procedure — not automated here, since
this repo's tooling starts no browser:

1. `npm run build && npm run start` (serves the production build on `:3000`).
2. Chrome DevTools → Lighthouse → *Navigation* + *Performance*, mobile preset,
   for each critical route while signed in as a review account.
3. Record LCP, CLS, INP and TBT in the PR that first optimises a route, so the
   before/after is on the record.

A follow-up issue can add a privacy-safe `web-vitals` beacon (no query strings,
no user identifiers) to `/api/collect` if field data becomes worth the weight.

## Server and database timing

No timing instrumentation is added in this issue. The contract for any future
instrumentation:

- Emit **route + a coarse duration bucket only** (e.g. `<50ms / <200ms /
  <1s / slow`). Never the SQL text with bound parameters, never row contents,
  cookies, headers, session objects, tokens, or `DATABASE_URL`.
- The `pg` pool (`src/lib/db/pool.ts`) already caps `statement_timeout`; a slow
  query surfaces there, not through a log of its parameters.

## Prioritised measured bottlenecks

From the baseline, ordered by how far above the 103 kB shared floor each route
sits. These are the candidates for later, separate optimisation issues — **not**
touched here:

1. **`/profile` — 177 kB, +74 over the floor, +21 kB route output.** The
   heaviest authenticated route: `profile-form.tsx` + `saved-hub.tsx` +
   `FieldListbox` + the roadmap overview + a large inline `<style>`. Likely win:
   defer the Saved hub / the progress card.
2. **`/bloc` — 163 kB, +60, +21 kB route output.** The ~1,200-line
   `bloc-notepad.tsx`, the editor toolbar, and `bloc-export.ts` (PDF/Word).
   Likely win: lazy-load the export menu and the toolbar; #370 already owns the
   Bloc decomposition.
3. **`/dashboard` / `/tasks` / `/calendar` — 144–147 kB, ~+42.** All carry the
   shared application store plus several client components. `/calendar`'s
   `app-calendar.tsx` split is #365 part 2.
4. **Shared 103 kB.** `1255…` (46 kB) is app-shared vendor code worth a
   `@next/bundle-analyzer` pass in a follow-up; `4bd1b696…` (54 kB) is
   React/framework and is effectively fixed.
5. `/` and `/login` at 117–119 kB sit close to the shared floor — little
   route-specific weight, no action needed.

## Reproducing / updating the baseline

```bash
npm run build
npm run perf:budgets           # prints the table; exits non-zero on a FAIL
```

When a change deliberately moves a route's first-load JS, update its
`baselineKb` (and `warnKb` / `failKb` if the new size is intended to stay) in
`docs/audits/route-budgets.json` and refresh `generatedFrom` in the same PR.
