# Supabase TODO

Goal: all durable app data must live in Supabase so closing and reopening the app keeps the state.

## Already Stored In Supabase

- Tasks / to-do
- Courses
- Hackathons
- Work opportunities
- Quick links
- Profiles

## Local Or External State

- Bloc notes currently use browser `localStorage`.
- App UI settings currently use browser `localStorage`.
- Google Calendar tokens currently use encrypted cookies.
- News cache currently uses committed JSON files in `data/` for Vercel-safe startup.

## Required Remote Schema Work

Apply these SQL files in Supabase:

1. `supabase/migrations/align_tasks_persistence.sql`
2. `supabase/migrations/extend_courses_hackathons.sql`
3. `supabase/migrations/create_tech_opportunities.sql`

Automatic command if a DB URL is available:

```bash
npm run supabase:apply -- supabase/migrations/align_tasks_persistence.sql
npm run supabase:apply -- supabase/migrations/extend_courses_hackathons.sql
npm run supabase:apply -- supabase/migrations/create_tech_opportunities.sql
```

If the command says SQL cannot be applied automatically, run the SQL in Supabase Dashboard > SQL Editor.

## Verification

```bash
npm run supabase:check
npm run import:courses
npm run import:hackathons
npm run import:opportunities
```

Set `TARGET_USER_EMAIL` in `.env.local` to the Supabase Auth user that should receive imported user-scoped data.

Expected final state:

- `supabase:check` reports required and extended schema available.
- `import:courses` imports with `Extended schema: yes`.
- `import:hackathons` imports with `Extended schema: yes`.
- `import:opportunities` imports 43 records with 0 errors.

## Next Persistence Upgrade

Move these from browser-local storage/cookies to Supabase when desired:

- Bloc notes: add `bloc_notes` table with `user_id`, `label`, `content`, timestamps.
- App settings: add `app_settings` table keyed by `user_id`.
- Optional internal calendar events: add `calendar_events` table if events should exist outside tasks/courses/hackathons/Google.

Keep secrets only in `.env.local`, Vercel environment variables, or Supabase dashboard. Never commit them.
