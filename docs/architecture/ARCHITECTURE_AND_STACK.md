# Architecture and stack

This document is the concise runtime reference. Detailed boundaries, diagrams
and decision records live alongside this file in [`README.md`](README.md) and
[`decisions/`](decisions/README.md).

## Runtime

- Framework: Next.js 15 App Router.
- Language: TypeScript.
- UI: React 19 with local components and Tailwind CSS.
- Database: self-hosted PostgreSQL 17.
- Database access: `pg` with explicit repositories and transactions.
- Authentication: signed application session cookie.
- Login: Google OAuth and password access for provisioned accounts.
- External integration: Google Calendar.
- Curated news: independent AL-LIO Radar service over signed webhook v2.
- Deployment: Docker Compose on a VPS behind Caddy.

Supabase and Vercel are not part of the current runtime.

## Application flow

```text
Browser
  -> Next.js App Router
  -> route handlers / server actions
  -> authentication, repositories and integrations
  -> PostgreSQL
```

## Radar flow

```text
Approved source catalogue
  -> fetch under host and content limits
  -> normalize and deduplicate metadata
  -> deterministic cycle classification
  -> human review
  -> persistent signed outbox
  -> POST /api/radar/v1/ingest
  -> transactional PostgreSQL upsert
  -> server-side profile filtering
```

Radar never receives user sessions and never connects to AL-LIO PostgreSQL.

## Production services

| Service | Responsibility | Persistent state |
|---|---|---|
| `al_lio_web` | Next.js UI, API, authentication and integrations | PostgreSQL only |
| `al_lio_postgres` | Application source of truth | `al_lio_postgres_data` |
| `al_lio_radar` | Scheduled source collection, review queue and delivery | `al_lio_radar_data` |
| `al_lio_migrator` | Explicit operational migration job | None |

`al_lio_web` and PostgreSQL share a private internal network. Radar reaches the
public HTTPS webhook and has no database network membership.

## Health boundaries

- `GET /api/health` confirms the web process is alive.
- `GET /api/ready` confirms the web process can reach PostgreSQL.
- Radar's container healthcheck verifies that its scheduler heartbeat is
  recent.

## Visual token contract

`src/app/globals.css` `:root` is the authoritative semantic palette for
authenticated product UI (issue #362). Shared primitive CSS reads token names;
the Tailwind HSL tokens in the same block are the same roles for utility
classes. `tests/architecture/design-system/tokens.test.mjs` guards it.

Semantic roles: `--al-surface-raised` / `--al-surface-sunken`; text
`--al-text-strong` / `-body` / `-muted` / `-brand-strong`; non-text accents
`--al-text-faint` (glyphs) / `--al-text-brand` (bright terracotta icons and
active marks) / `--al-accent-strong` (sage); `--al-border` / `--al-border-strong`
(decorative hairlines); primary action `bg-primary`; one quiet routine action
`--al-action-soft-*`; `--destructive` / `--destructive-foreground`; a solid
`>=3:1` focus ring - `ring-ring` (`--ring`) on fields and `--al-action-soft-focus`
(also `--ring`) on quiet controls; feedback `--al-success-*` / `--al-warning-*` /
`--al-error-*` / `--al-info-*`; lifecycle `--al-saved-*` / `--al-completed-*` /
`--al-state-neutral-surface`; `--al-disabled-opacity` (the single disabled
source, consumed by name).

**Accessibility:** every `*-text` token meets WCAG AA (>=4.5:1) on the surfaces
it is documented for; `--al-text-brand`, `--al-text-faint`, `--al-accent-strong`
and the focus ring are non-text and meet >=3:1. `tokens.test.mjs` recalculates
these ratios from the canonical values. Terracotta used as text is
`--al-text-brand-strong` (`#a8401b`), not the bright `--al-text-brand`.

### Intentional exclusions

These keep their own brand treatment and are **not** governed by the contract:

- Marketing landing and Legal pages (`src/features/marketing/`,
  `src/features/legal/`): Barlow display type and the landing green palette.
- The login card's standalone green submit (`#1F5B46`, issue #264).
- `--font-barlow`: reserved for marketing and logo display type only.
- Logo and image assets: owned by `public/assets/README.md` (issue #359).

### Migration map for feature-polish child issues

Replace the old value with the token; do not re-pick a colour. Near-equivalent
values were consolidated to one token.

| Old value(s) | Semantic token | Role |
|---|---|---|
| `#111111` | `var(--al-text-strong)` | headings, labels, primary values |
| `#4b4740` | `var(--al-text-body)` | running copy, descriptions |
| `#6b6f72` | `var(--al-text-muted)` | subtitles, secondary meta, inert-state text, placeholders |
| `#9a958a`, `#9a9589`, `#a39d8e` on a **glyph** | `var(--al-text-faint)` | dropdown chevrons and quiet marks (never text) |
| `#e15d2d`, `#c94f21` as **text** | `var(--al-text-brand-strong)` | terracotta used as a word or label (AA) |
| `#e15d2d` on an **icon / active mark** | `var(--al-text-brand)` | bright terracotta glyphs (>=3:1, never text) |
| `#4c7a68` | `var(--al-accent-strong)` | sage accent / icon tone |
| `white` on a raised element | `var(--al-surface-raised)` | cards, panels, menus, fields |
| `#f7f4ee`, `#f7f3ec` | `var(--al-surface-sunken)` | hover fill, quiet inset rows |
| `#e4dfd5`, `#ece7dc` | `var(--al-border)` | decorative hairline (not a control's state indicator) |
| `#d8d1c2` | `var(--al-border-strong)` | hover / emphasis hairline |
| `rgba(225,93,45,0.24-0.5)` edge | `--al-action-soft-border` / `-border-hover` | quiet-action brand edge, open-state glow |
| any focus outline / ring | `--al-action-soft-focus` (= `--ring`, a solid `>=3:1` terracotta) | keyboard focus on fields and quiet controls |
| `#e7f5ee` / `#1f7a4d` as "open/available" | `var(--al-success-surface)` / `-text` | positive, open |
| `#fdf1dd` / `#97620f` (or `#8a5c14`) | `var(--al-warning-surface)` / `-text` / `-border` | attention, pending |
| `#f6e4e0` / `#b23b2e` | `var(--al-error-surface)` / `-text` | failure, discarded |
| `#e6eefc` / `#2f5fac` | `var(--al-info-surface)` / `-text` | in progress, informational |
| `#fbe7dd` tint / `#b94720` terracotta text as "saved/review" | `var(--al-saved-surface)` / `-text` (= `--al-text-brand-strong`) | bookmarked, awaiting review |
| `#e7f5ee` / `#1f7a4d` as "finished/ready" | `var(--al-completed-surface)` / `-text` / `-border` | completed (own token; shares success green today) |
| `#f2ece1` neutral pill fill | `var(--al-state-neutral-surface)` + `var(--al-text-muted)` | paused, read, inert |
| `opacity: 0.5` / `0.6` on a disabled control | `var(--al-disabled-opacity)` | the one disabled treatment |
| light-tint icon badge `#FBE7DD` (Tailwind opacity cannot reproduce it) | keep hardcoded; documented exception | see `tokens.test.mjs` |

Feature `.tsx` files still holding inline hex (`bloc-notepad.tsx`,
`tasks-view.tsx`, `app-calendar.tsx`, `work-feature.tsx`, `events-feature.tsx`,
`noticias-view.tsx`) migrate in their own polish issues using this map.

## Authoritative sources

- Runtime topology: `infra/docker-compose.prod.yml`.
- PostgreSQL baseline: `infra/postgres/schema.sql`.
- Database evolution: `infra/postgres/migrations/`.
- Visual token contract: `src/app/globals.css` `:root`.
- Radar receiver schema: `src/lib/radar/contract.ts`.
- Radar sender schema: `al-lio-radar/src/domain/item.ts`.
- Environment validation: `scripts/validate-runtime-env.mjs` and Radar's
  `src/config/env.ts`.
