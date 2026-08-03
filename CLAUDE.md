# AL-LÍO Claude Instructions

Read `AGENTS.md` first. It is the source of truth for how this app must be started, verified, and recovered.

## Non-Negotiables

- Run the cheapest relevant verification before saying a change is done.
- Do not mix `next dev` and `next start` on the same `.next` output.
- If a chunk error appears (`Cannot find module './*.js'` from `.next/server/webpack-runtime.js`), stop project Next processes, delete `.next`, rebuild, and restart.
- Do not add `revalidatePath("/dashboard")` to server actions; it breaks input focus and forces unnecessary layout refreshes.
- Do not remove the `StoreProvider` mount guard, Bloc localStorage flush, or news filesystem read-only guards.
- Treat PostgreSQL propio + sesión propia + Google OAuth as the current runtime baseline.

## Delivery Protocol

For code changes, use the cheapest check that proves the change:

1. Documentation-only change: `npm run verify:startup`.
2. TypeScript/refactor change: `npm run typecheck`.
3. UI/import/server-boundary change: `npm run verify:cheap`.
4. Route, middleware, build, startup, or deployment change: `npm run verify:prod`.

If the build fails or the server does not respond, do not say the task is complete. Diagnose and fix first, or report the blocker clearly.

## Commands

- Normal dev: `npm run dev`
- Clean dev: `npm run dev:clean`
- Clean production restart: `npm run restart:prod`
- Cheap check: `npm run verify:cheap`
- Production smoke: `npm run verify:prod`

## Priority

Stability beats new features. Preserve the current design, keep changes scoped, and verify routes after touching routing, middleware, data loading, or startup scripts.
