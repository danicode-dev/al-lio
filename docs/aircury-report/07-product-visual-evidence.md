# Product visual evidence

This catalogue records the four production screenshots explicitly selected by
the owner as the only candidate image pool for the AL-LIO technical report. It
is an evidence catalogue, not a capture plan. Earlier approved, reserve and
operator-captured screenshots have been removed from the repository and must
not be used in the final PDF.

Images live in [`assets/product-evidence/`](assets/product-evidence/). The
technical report will use only the smallest useful subset of these four images;
the catalogue does not require every candidate to appear in the PDF.

## Capture baseline

| Field | Value |
|---|---|
| Source | `https://al-lio.app` (production) |
| Product baseline | Production deployment of the frozen delivery release. Documentation-only commits merged after that release do not change the deployed product baseline. |
| Release tag | `aircury-2026-delivery` |
| AL-LIO commit SHA | `1e516ead8f69d60a263718c20d59b97c9618c97a` |
| Capture date | 2026-08-31 |
| Account and records | Disposable production test account with fictional task, progress and note data. |
| Desktop viewport | Owner-provided desktop capture, 3114 × 1851 px. |
| Mobile viewport | Emulated iPhone 14 Pro Max-class responsive viewport, 1290 × 2796 px; not a physical-device test. |
| Privacy treatment | The owner-provided originals remain unchanged outside the repository. In the two desktop repository copies, only the account-identity footer was blanked to prevent publication of the account address. No product content or demonstrated state was changed. The mobile captures contain no account address. |

## Approved candidate evidence

### VIS-001-01 — Personalised dashboard

| Field | Value |
|---|---|
| Evidence ID | `VIS-001-01` (supports `PRD-006`, `PRD-007`, `PRD-017`) |
| Filename | `assets/product-evidence/ve-03-dashboard-personalised-desktop.png` |
| Caption | Personalised dashboard combining immediate tasks, learning continuity, calendar context and cycle progress. |
| Demonstrated claim | After access, the student receives one consolidated view of pending and completed tasks, the active vocational cycle, the next learning action, calendar context and progress by competency. |
| Product area | Dashboard and next action. |
| Viewport | Desktop, 3114 × 1851 px. |
| Fictional data | Fictional test-account tasks and zero-state learning progress for the DAW cycle. |
| Release | `aircury-2026-delivery`, SHA `1e516ead8f69d60a263718c20d59b97c9618c97a`. |
| Capture date | 2026-08-31. |
| Privacy status | Approved. The account-identity footer was blanked in the repository copy; the product area is unchanged. |
| Intended report section | Product capabilities — dashboard and next action. |
| Interpretation limitation | Demonstrates one fictional account state at the capture date; it is not a usage metric or a user-study result. |

### VIS-001-02 — Learning progress and contextual notes

| Field | Value |
|---|---|
| Evidence ID | `VIS-001-02` (supports `PRD-005`, `PRD-009`, `PRD-010`) |
| Filename | `assets/product-evidence/ve-05-learning-progress-notes-desktop.png` |
| Caption | Reviewed learning resource with automatic progress, contextual notes and completion control. |
| Demonstrated claim | A student can open an approved Spanish learning resource, resume progress, save a fictional note at a video timestamp and mark the resource as completed. The interface explains that saved notes are also available in Bloc de notas. |
| Product area | Competencies, learning resources and Bloc de notas continuity. |
| Viewport | Desktop, 3114 × 1851 px. |
| Fictional data | Fictional note at 0:00: “Nota de prueba (ficticia): repasar los ejemplos de POO y volver a este punto mañana.” |
| Release | `aircury-2026-delivery`, SHA `1e516ead8f69d60a263718c20d59b97c9618c97a`. |
| Capture date | 2026-08-31. |
| Privacy status | Approved. The account-identity footer was blanked in the repository copy; the learning state is unchanged. |
| Intended report section | Product capabilities — competencies and learning. |
| Interpretation limitation | The embedded thumbnail is public third-party source material displayed by the production resource player; the screenshot does not claim ownership of that content. |

### VIS-001-03 — Bloc de notas on mobile

| Field | Value |
|---|---|
| Evidence ID | `VIS-001-03` (supports `PRD-009`, `PRD-017`) |
| Filename | `assets/product-evidence/ve-05b-learning-note-in-bloc-mobile.png` |
| Caption | The learning note remains editable and exportable in Bloc de notas on a mobile-width layout. |
| Demonstrated claim | The note created from the learning resource appears in Bloc de notas with formatting controls, saved status, source context and export actions. The responsive layout preserves the essential editing workflow. |
| Product area | Bloc de notas and responsive continuity. |
| Viewport | Emulated iPhone 14 Pro Max-class viewport, 1290 × 2796 px; not a physical-device test. |
| Fictional data | The same fictional Java learning note used in `VIS-001-02`. |
| Release | `aircury-2026-delivery`, SHA `1e516ead8f69d60a263718c20d59b97c9618c97a`. |
| Capture date | 2026-08-31. |
| Privacy status | Approved. No account address, credential or personal data is visible. |
| Intended report section | Product capabilities — Bloc de notas. |
| Interpretation limitation | Responsive browser evidence only; it is not a physical-device test. |

### VIS-001-04 — Reviewed news on mobile

| Field | Value |
|---|---|
| Evidence ID | `VIS-001-04` (supports `PRD-011`, `PRD-017`) |
| Filename | `assets/product-evidence/ve-07-news-reviewed-mobile.png` |
| Caption | Cycle-scoped reviewed news with visible source, freshness state and mobile actions. |
| Demonstrated claim | For the captured MP cycle, production exposes one reviewed item with source, publication date, category, unread state, save control and detail action. The view also reports the delivery freshness timestamp and cycle-specific counters. |
| Product area | Radar news and responsive discovery. |
| Viewport | Emulated iPhone 14 Pro Max-class viewport, 1290 × 2796 px; not a physical-device test. |
| Fictional data | None. The item is reviewed public-source content; only the read/save state belongs to the test account. |
| Release | `aircury-2026-delivery`, SHA `1e516ead8f69d60a263718c20d59b97c9618c97a`. |
| Capture date | 2026-08-31. |
| Privacy status | Approved. No account address, credential or personal data is visible. |
| Intended report section | Product capabilities — news; content governance. |
| Interpretation limitation | Demonstrates content available for one cycle on the capture date. It does not imply complete or uniform news coverage across every vocational cycle. |

## Final report selection rule

These four files are the complete owner-approved candidate pool. The final PDF
must not use the earlier screenshots removed by this change. To avoid visual
overload, integration must select only images that materially support the nearby
text, combine desktop and mobile evidence, and leave the report narrative
unchanged.
