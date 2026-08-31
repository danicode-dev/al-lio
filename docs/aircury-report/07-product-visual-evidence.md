# Product visual evidence

This catalogue records the approved production screenshots for the AL-LIO
technical report. It is an evidence catalogue, not a capture plan: it lists only
images that passed technical and privacy review. Editorial approval of
composition, legibility and brand consistency remains with the owner.

Images live in [`assets/product-evidence/`](assets/product-evidence/). The
mandatory capture pool, its classification (`APPROVED` / `RESERVE` / `REJECTED`)
and the reasons are recorded in the local, uncommitted review manifest
(`output/aircury-report/product-evidence/capture-manifest.md`).

## Capture baseline

| Field | Value |
|---|---|
| Source | `https://al-lio.app` (production) |
| Product baseline | Production deployment of the frozen delivery release. Documentation-only commits merged after that release do not change the deployed product baseline. |
| Release tag | `aircury-2026-delivery` |
| AL-LIO commit SHA | `1e516ead8f69d60a263718c20d59b97c9618c97a` |
| Capture date | 2026-08-31 |
| Account | One disposable production test account created for this task. Fictional identity. The owner performed the sign-in; the capture operator never handled the credentials. |
| Desktop viewport | Chrome-compatible desktop viewport. Owner captures are exported at device-pixel-ratio 2 (2880 px wide); operator captures are browser-automation frames down-scaled by the tool to 1568 px wide. |
| Mobile viewport | Emulated responsive viewport (iPhone-class width, DPR ~3). Recorded as an emulated viewport, not a physical-device test. |
| Privacy review | Every approved image was checked for account e-mail, password, token, OAuth content, personal data and internal operational detail. Where the account e-mail would appear in the collapsed-sidebar footer it is out of frame; on `VIS-001-05` it was replaced with a placeholder string in the page DOM before capture and the PNG was not edited afterwards. |

## Approved evidence

### VIS-001-01 — Public landing

| Field | Value |
|---|---|
| Evidence ID | `VIS-001-01` (supports `PRD-001`) |
| Filename | `assets/product-evidence/ve-01a-landing-hero-desktop.png` |
| Caption | AL-LIO public landing: value proposition and primary entry point. |
| Demonstrated claim | The project presents a public Spanish landing page with a clear value proposition ("Enfoca. Actúa. Logra más."), an audience statement ("Plataforma para estudiantes de FP"), a language switch and a sign-in entry point. |
| Flow or product area | Public entry and account access. |
| Viewport | Desktop, 2880 x 1800 px (DPR 2). |
| Fictional data | None. Logged out; no account involved. |
| Release | `aircury-2026-delivery`, SHA `1e516ead8f69d60a263718c20d59b97c9618c97a`. |
| Capture date | 2026-08-31. |
| Privacy status | Clean. No account, credentials or personal data. |
| Intended report section | Product overview / introduction. |
| Interpretation limitation | Hero section only; the full landing is held in reserve. |

### VIS-001-02 — Task completion persists

| Field | Value |
|---|---|
| Evidence ID | `VIS-001-02` (supports `PRD-008`) |
| Filename | `assets/product-evidence/ve-06-task-completed-desktop.png` |
| Caption | A completed personal task persists in the private task list. |
| Demonstrated claim | A student can create a personal task and mark it complete; the completed task persists with its title, note and date under the "Completadas" filter, and the header counters update (Pendientes 1 / Completadas 1 / Totales 2). |
| Flow or product area | Personal planning — private task lifecycle. |
| Viewport | Desktop, 1568 x 726 px. |
| Fictional data | Task "Preparar presentación del proyecto (ficticio)", note "Tarea de prueba para la evidencia visual. Datos ficticios.", due 5 September 2026, created and then completed with the test account. |
| Release | `aircury-2026-delivery`, SHA `1e516ead8f69d60a263718c20d59b97c9618c97a`. |
| Capture date | 2026-08-31. |
| Privacy status | Clean. Sidebar collapsed; no account e-mail in frame. |
| Intended report section | Product / personal planning. |
| Interpretation limitation | Operator frame at 1568 px wide; the layout is sparse but the text is legible. |

### VIS-001-03 — Reviewed-news production limitation

| Field | Value |
|---|---|
| Evidence ID | `VIS-001-03` (supports `PRD-011`) |
| Filename | `assets/product-evidence/ve-07-news-production-limitation-desktop.png` |
| Caption | For this cycle, production news shows no approved content. |
| Demonstrated claim | The reviewed-news surface is present and cycle-scoped, but for the captured cycle production currently exposes no approved content ("Todavía no hay contenido aprobado"; all counters 0). This is shown as a limitation, not as delivered success. |
| Flow or product area | Trustworthy discovery — reviewed cycle news. |
| Viewport | Desktop, 1568 x 726 px. |
| Fictional data | None. This is the empty production state. |
| Release | `aircury-2026-delivery`, SHA `1e516ead8f69d60a263718c20d59b97c9618c97a`. |
| Capture date | 2026-08-31. |
| Privacy status | Clean. Sidebar collapsed. |
| Intended report section | Product / reviewed news — stated as a production-coverage limitation, consistent with `PRD-011` and the open rollout work in issue #235. |
| Interpretation limitation | Coverage is uneven per cycle: other cycles do surface reviewed items. This image must be read as the coverage boundary for one cycle, not as a claim that news never works. |

### VIS-001-04 — Verified opportunity detail

| Field | Value |
|---|---|
| Evidence ID | `VIS-001-04` (supports `PRD-012`) |
| Filename | `assets/product-evidence/ve-08-opportunity-verified-detail-desktop.png` |
| Caption | Verified course detail with source entity, dates and entry requirements. |
| Demonstrated claim | A reviewed opportunity has an internal detail page that keeps the source entity, dates, location, modality, entry requirements, accreditation level, price and availability distinct, and offers an "Abrir curso" action and a save action. |
| Flow or product area | Trustworthy discovery — courses catalogue detail. |
| Viewport | Desktop, 1568 x 726 px. |
| Fictional data | None. Real reviewed catalogue content (course "IFCD0005 - PROGRAMADOR JAVA SE PROFESIONAL EN CLOUD", entity CORE NETWORKS SL); no data was entered. |
| Release | `aircury-2026-delivery`, SHA `1e516ead8f69d60a263718c20d59b97c9618c97a`. |
| Capture date | 2026-08-31. |
| Privacy status | Clean. Sidebar collapsed; only public catalogue content. |
| Intended report section | Product / trustworthy discovery. |
| Interpretation limitation | Operator frame at 1568 px wide, fitted with a small zoom-out so the whole detail page fits one frame. |

### VIS-001-05 — Profile and cycle ownership

| Field | Value |
|---|---|
| Evidence ID | `VIS-001-05` (supports `PRD-003`, `PRD-017`) |
| Filename | `assets/product-evidence/ve-09-profile-cycle-fictional-desktop.png` |
| Caption | Student profile: the active cycle and year that drive relevance. |
| Demonstrated claim | The profile page shows and lets the student change the vocational cycle and academic year ("Desarrollo de Aplicaciones Web", "1º curso", "Ciclo activo · DAW"), and surfaces per-cycle progress ("Progreso de competencias 0 %", "Recursos completados 0 / 17") and the saved-content area. |
| Flow or product area | Profile management and continuity. |
| Viewport | Desktop, 1568 x 772 px. |
| Fictional data | Fictional profile of the disposable test account. The account e-mail shown in the profile card and sidebar footer was replaced with the placeholder text "cuenta demo (email oculto)" in the page DOM before the screenshot; the PNG has not been edited. All other values are the live state. |
| Release | `aircury-2026-delivery`, SHA `1e516ead8f69d60a263718c20d59b97c9618c97a`. |
| Capture date | 2026-08-31. |
| Privacy status | Clean. The two e-mail strings show a disclosed placeholder; no other personal data. |
| Intended report section | Product / profile and continuity; Inclusion / per-cycle relevance. |
| Interpretation limitation | Operator frame at 1568 px wide. The placeholder text is a privacy substitution, not a product state. |

### VIS-001-06 — Mobile navigation continuity

| Field | Value |
|---|---|
| Evidence ID | `VIS-001-06` (supports `PRD-017`) |
| Filename | `assets/product-evidence/ve-10-tasks-navigation-mobile.png` |
| Caption | A core feature and the navigation menu in the mobile layout. |
| Demonstrated claim | The mobile layout keeps a usable navigation hierarchy: a mobile header with the menu control, and a core feature (Tareas) with its stat cards and list rendered for a phone-width viewport. |
| Flow or product area | Responsive navigation continuity. |
| Viewport | Emulated mobile viewport, 1320 x 2868 px (DPR ~3). |
| Fictional data | Fictional task list of the test account. |
| Release | `aircury-2026-delivery`, SHA `1e516ead8f69d60a263718c20d59b97c9618c97a`. |
| Capture date | 2026-08-31. |
| Privacy status | Clean. No account e-mail in the mobile layout. |
| Intended report section | Product / profile and continuity — responsive navigation. |
| Interpretation limitation | Emulated responsive viewport, not a physical-device test. Shows the Tareas surface; a mobile dashboard capture is held in reserve. |

## Reserve and outstanding

Held in reserve (legible, real, but secondary or not held to a consistent
fictional cycle): a stitched full-landing capture with the per-cycle model
section, a mobile personalised dashboard, Bloc notes on mobile, the local
calendar view, and a mobile reviewed-news item.

Outstanding for a complete set, to be re-captured with the sidebar collapsed, a
single consistent fictional cycle and empty authentication fields: authentication
entry (empty fields), onboarding cycle and year selection (needs a new
un-onboarded account), personalised dashboard, cycle competency route, and the
learning resource with saved progress and notes.

## Report selection

The technical report should use only the strongest non-redundant subset (roughly
six to eight images across the whole report). The remaining approved and reserve
items stay in this catalogue rather than being added to the PDF as filler. This
catalogue is not integrated into the PDF generator here; that integration is a
separate task.
