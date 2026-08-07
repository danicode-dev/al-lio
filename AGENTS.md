# AL-LÍO Agent Notes

This repo is a Next.js 15 App Router dashboard with self-managed PostgreSQL, signed first-party sessions, Google OAuth, Google Calendar, local news cache, courses, hackathons, tasks, links, sources, and opportunities.

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

## Current Database Note

Runtime data lives in self-managed PostgreSQL.

- Main schema: `infra/postgres/schema.sql`.
- Data access: `pg` and local repository/helper modules.
- Local sandbox: `npm run postgres:sandbox:up`.
- Schema setup: `npm run postgres:setup`.

The CSV importer reads `csv/oportunidades_tech_combinado.csv` and upserts into `public.tech_opportunities` by `id_slug`.

## Documentation Rule

Active documentation must not describe Supabase Auth, Supabase Database, Vercel, Aidraft, TechLife, or D1OS as the current product/runtime. Update or remove a document rather than keeping stale history in the repository.
