# D1OS Agent Notes

This repo is a Next.js 15 App Router personal dashboard with Supabase, Google Calendar, local news cache, courses, hackathons, tasks, and tech opportunities.

## Startup Rules

- Do not mix `next dev` and `next start` on the same `.next` output and assume it is still valid.
- `next dev` rewrites `.next` as a development build.
- `next start` requires a production build created by `next build`.
- If the app shows `Cannot find module './*.js'` from `.next/server/webpack-runtime.js`, the fix is to stop the project Next processes, delete `.next`, rebuild, and restart.

## Preferred Commands

- Normal start for local development:
  - `npm run dev`
  - This runs `verify:startup` automatically first.
- Fast local development from a clean cache:
  - `npm run dev:clean`
- Clean production build:
  - `npm run build:clean`
- Clean production restart:
  - `npm run restart:prod`
- Start an existing production build:
  - `npm run prod:local`

## Verification Ladder

Use the cheapest check that proves the change:

- Before starting the app:
  - `npm run verify:startup`
  - This includes project structure checks, schema/code audit, and TypeScript.
- Pure TypeScript/refactor change:
  - `npm run typecheck`
- UI/import/server-boundary change:
  - `npm run verify:cheap`
- Route, middleware, build, startup, or deployment change:
  - `npm run verify:prod`
- If a server is already running and only routes/CSS need checking:
  - `npm run smoke`

Always run at least one relevant verification command before telling the user the app is OK.

## Current Known Database Note

The CSV importer reads `csv/oportunidades_tech_supabase_combinado.csv` and upserts into `public.tech_opportunities` by `id_slug`.

CSV context docs are archived under `docs/context/`.

Before `npm run import:opportunities` can succeed on the remote Supabase project, apply:

- `supabase/migrations/create_tech_opportunities.sql`

The app is coded to consume `tech_opportunities` when present.
