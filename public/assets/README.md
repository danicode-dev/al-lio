# `public/` asset ownership map

Audit of the static assets served from `public/` (issue #359, part of #276).
Every asset family below lists its canonical variant, intended context,
dimensions, owner module, and the concrete consumer that keeps it alive.

Rules this map enforces:

- One canonical asset per supported context. A second variant is kept only
  when a distinct context (opaque vs. transparent, light vs. dark surface)
  genuinely needs it.
- A brand variant is removed only when it has **zero** runtime, metadata,
  manifest, email, documentation, or report consumer **and** a named
  canonical replacement.
- Course, news, event, and empty-state imagery is editorial. It is not
  removed here even when a single file has no current reference; that is a
  separate follow-up.
- `tests/architecture/design-system/brand-assets.test.mjs` fails if a
  canonical file disappears, if an active reference stops resolving, or if a
  reference to a retired variant returns.

## AL-LÍO brand namespace — `public/assets/al_lio_*` + `src/app/icon.png`

This is the scoped family for issue #359. All paths are consumed as static
`/assets/...` URLs unless noted.

| Canonical asset | Context | Dimensions | Owner / consumer |
| --- | --- | --- | --- |
| `public/assets/al_lio_icon_black.png` | App icon — mark on a black rounded square. The one favicon/PWA/OG mark. | 512×512 | `src/app/layout.tsx` (`metadata.icons.icon` + `apple`), `src/app/manifest.ts` (PWA icon), `src/app/favicon.ico/route.ts` (build-time `favicon.ico`), `src/features/marketing/presentation/ecosystem-diagram.tsx` (landing hub mark) |
| `src/app/icon.png` | Next.js App Router file-convention favicon. Byte-identical copy of `al_lio_icon_black.png`; Next auto-emits `<link rel="icon">` from it. | 512×512 | Next.js App Router (file convention). Kept in sync with `al_lio_icon_black.png`. |
| `public/assets/al_lio_logo_horizontal.png` | Horizontal lockup (symbol + wordmark) on an opaque light surface. | 2172×724 | `src/components/app-sidebar.tsx` (expanded rail), `src/components/mobile-header-navigation.tsx` (mobile header). Referenced by `tests/integration/navigation/app-shell.test.mjs`. |
| `public/assets/al_lio_logo_horizontal_transparent.png` | Horizontal lockup with a transparent background, for placement over an illustrated panel. | 615×214 | `src/components/onboarding/onboarding-brand-panel.tsx` |
| `public/assets/al_lio_symbol.png` | Standalone symbol (no wordmark) on an opaque light surface. | 1254×1254 | `src/components/app-sidebar.tsx` (collapsed rail). Referenced by `tests/integration/navigation/app-shell.test.mjs`. |
| `public/assets/al_lio_symbol_transparent.png` | Standalone symbol with a transparent background, for auth screens. | 197×185 | `src/components/auth/auth-page-shell.tsx`, `src/components/auth/login-form.tsx` |
| `public/assets/al_lio_wordmark.png` | Wordmark only ("AL-LÍO"), transparent. Used where the surrounding UI already carries the symbol, and as the transactional-email logo. | 354×96 | `src/components/landing/landing-header.tsx`, `src/components/landing/landing-footer.tsx`, `src/lib/email/templates.ts` (email header logo, via `absolutePublicAssetUrl`). Referenced by `tests/integration/auth/production-auth.test.mjs`. |
| `public/assets/al_lio_kinetic_background_dark.png` | Decorative kinetic texture behind the dark "next step" dashboard card. | 1448×1086 | `src/components/dashboard/dashboard-next-step.tsx` (CSS `background-image`) |

### Retired in this pull request

Removed: zero consumers anywhere in metadata, manifest, CSS, React, email
templates, documentation, the Aircury report generator, or tests, and a
named canonical replacement already covers the context.

| Removed asset | Dimensions | Bytes | Canonical replacement | Notes |
| --- | --- | --- | --- | --- |
| `public/al-lio-logo.png` | 1254×1254 | 618,399 | `public/assets/al_lio_symbol.png` | Pre-namespace original (added in the first rebrand commit `6cde443`); superseded when the `al_lio_*` namespace was introduced. |
| `public/assets/al_lio_favicon_dark_circle_512.png` | 512×512 | 67,198 | `public/assets/al_lio_icon_black.png` | Alternative 512×512 favicon (dark circle) from the branding batch `#21`; the black rounded-square mark became canonical. |
| `public/assets/al_lio_logo_horizontal_white_transparent.png` | 560×115 | 66,226 | `public/assets/al_lio_logo_horizontal_transparent.png` | White knockout of the horizontal lockup; no dark-surface placement consumes it. |
| `public/assets/al_lio_logo_slogan_transparente_1060x360.png` | 1060×360 | 119,993 | `public/assets/al_lio_wordmark.png` | Wordmark-plus-slogan lockup; no surface renders the slogan lockup. |

Scoped-family count/size — before: 13 files, 3,460,692 bytes; after:
9 files, 2,588,876 bytes (−4 files, −871,816 bytes).

## Other brand assets — `public/brand/*` (not in the #359 scoped family)

Four legacy marks added in `fdf4a19` ("restore codex local work — … brand
assets"). None has any consumer in metadata, CSS, React, email,
documentation, the report generator, or tests. They are superseded by the
`public/assets/al_lio_*` family. They are left in place here because they sit
outside the scoped family; retiring them is a focused follow-up.

| Asset | Dimensions | Bytes | Status |
| --- | --- | --- | --- |
| `public/brand/logo-mark.png` | 390×327 | 5,426 | Orphan → follow-up removal candidate (canonical: `public/assets/al_lio_symbol.png`). |
| `public/brand/logo-mark-white.png` | 390×327 | 6,558 | Orphan → follow-up removal candidate. |
| `public/brand/signature.png` | 868×394 | 25,325 | Orphan → follow-up removal candidate (canonical: `public/assets/al_lio_wordmark.png`). |
| `public/brand/signature-white.png` | 868×394 | 27,015 | Orphan → follow-up removal candidate. |

## Editorial imagery (left untouched by #359)

Per issue scope, course/news/event/empty-state imagery is not part of this
brand audit. It is documented here for completeness; a broader editorial
image review is a separate follow-up.

| Family | Path | Owner / consumer | Notes |
| --- | --- | --- | --- |
| Course hero pool | `public/assets/cursos/curso-hero-<family>-<n>.jpg` | `src/features/courses/client/courses-feature.tsx` (`courseHeroImage`, pools: desarrollo 5, administracion 5, marketing 6, deporte 7, generico 6) | All 29 files map to the resolver; do not remove individually. |
| Course archived empty state | `public/assets/cursos/cursos-empty-archivados.png` | No current reference found. | Editorial empty-state; deferred to the editorial-image follow-up, not deleted here. |
| News hero pool + placeholder | `public/assets/noticias/noticia-hero-<family>-<n>.jpg`, `noticia-hero-placeholder.svg` | `src/components/noticias/noticias-view.tsx` (`NEWS_HERO_POOL`, placeholder fallback) | Dynamically selected; keep the whole pool. |
| Event hero + empty states | `public/assets/hackathons/eventos-hero.svg`, `hackathons-empty-sin-datos.png`, `hackathons-empty-sin-activos.png` | `src/features/events/client/events-feature.tsx` | Active. |
| Event modal checklist icon | `public/assets/hackathons/hackathons-modal-checklist-icon.png` | No current reference found. | Editorial; deferred to the editorial-image follow-up, not deleted here. |
| Bloc empty state | `public/assets/bloc/bloc-empty-illustration.png` | `src/features/bloc/client/bloc-notepad.tsx` | Active. |

## Non-`public/` brand copies (for reference only)

The Aircury report PDF generator keeps its own local brand images so the
report build has no dependency on `public/`:

- `docs/aircury-report/generator/wordmark.png`
- `docs/aircury-report/generator/symbol_faint.png`

These are report-delivery evidence with a documented purpose
(`docs/aircury-report/generator/al_lio_memoria.py`) and are out of scope for
this audit.

## Data files

- `public/data/empresas_tech_granada.md` — company catalogue dataset,
  validated by `scripts/check-project.mjs` and consumed by
  `scripts/import-companies.mjs`. Not an image asset.
