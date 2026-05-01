# Project Structure

Root files are kept for app configuration and agent onboarding only.

## Runtime App

- `app/` - Next.js App Router pages, layouts, route handlers, middleware targets.
- `components/` - Shared React UI and app views.
- `lib/` - Server/client services, Supabase clients, data loading, integrations, news, auth, helpers.
- `public/` - Static public assets served by Next.js.
- `logo/` - Source logo assets imported by the UI.

## Data And Database

- `supabase/schema.sql` - Current full schema snapshot.
- `supabase/migrations/` - Versioned SQL migrations.
- `csv/` - Source CSV files for courses, hackathons, and tech opportunities.
- `data/` - Committed news cache used by `/api/news` on Vercel.

## Operations

- `scripts/` - Deterministic Node scripts for startup, smoke tests, imports, seeds, and cleanup.
- `AGENTS.md` - Primary AI-agent operating guide.
- `CLAUDE.md` - Claude-specific entrypoint; points to `AGENTS.md`.
- `README.md` - Human-facing setup and V1 operation guide.
- `docs/02_AGENT_SKILLS.md` - Compact AI skill/workflow guide.

## Generated Or Ignored

These should not be committed or kept as source:

- `.next/`
- `node_modules/`
- `.playwright-mcp/`
- `*.log`
- `*.tsbuildinfo`
- `desktop.ini`

## V1 Rule

For V1 stabilization, prefer deleting generated clutter and documenting stable workflows over risky component reshuffles. Split large UI files only with focused tests and route smoke checks.
