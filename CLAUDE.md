# D1OS / Al-Lio Claude Instructions

Read `AGENTS.md` first. It is the source of truth for how this app must be started, verified, and recovered.

## Non-Negotiables

- Run the cheapest relevant verification before saying a change is done.
- Do not mix `next dev` and `next start` on the same `.next` output.
- If a chunk error appears (`Cannot find module './*.js'` from `.next/server/webpack-runtime.js`), stop project Next processes, delete `.next`, rebuild, and restart.
- Do not add `revalidatePath("/dashboard")` to server actions; it breaks input focus and forces unnecessary layout refreshes.
- Do not remove the `StoreProvider` mount guard, Bloc localStorage flush, or news filesystem read-only guards.
- Keep Supabase data in Supabase; do not hardcode CSV data into frontend components.

## Delivery Protocol — Required Before Saying Any Change Is Done

Every time code changes are made, follow this sequence before reporting success:

1. Stop any running Next.js process on port 3000.
2. Delete `.next` — never assume the cache is valid after a code change.
3. Run `npm run verify:cheap` (typecheck + build). Fix any errors before continuing.
4. Start the dev server: `npm run dev`.
5. Confirm `http://localhost:3000` responds (HTTP 2xx or 3xx redirect to `/dashboard`).
6. Only then report the change as done.

If the build fails or the server does not respond, do not say the task is complete — diagnose and fix first.

## Commands

- Normal dev: `npm run dev`
- Clean dev: `npm run dev:clean`
- Clean production restart: `npm run restart:prod`
- Cheap check: `npm run verify:cheap`
- Production smoke: `npm run verify:prod`

## V1 Priority

Stability beats new features. Preserve the current design, keep changes scoped, and verify routes after touching routing, middleware, data loading, or startup scripts.
