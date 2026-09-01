# Product scope and student journeys

## Purpose and report boundary

This document is the working product source for the Aircury technical report.
It reconciles product copy, application routes, persistence boundaries and
automated checks against the code reviewed for issue #297.

It is not intended to be copied wholesale into the PDF. The report should use
the product statement, the supported audience, the strongest user journey and
the concise delivered-scope conclusions. File paths, test names and evidence
IDs remain underneath the report as traceability.

Current frozen delivery release:

- product code and deployed web image:
  `1e516ead8f69d60a263718c20d59b97c9618c97a`;
- automated CI and production deployment: successful;
- public health and readiness observation: successful at the evidence cut-off;
- immutable tag: `aircury-2026-delivery`;
- authenticated owner smoke test: partial under `QAL-002`; core flows pass,
  Calendar is blocked and news fails or is sparse.

The release is frozen for report review. Only flows that passed the owner test
are presented as production-verified; implemented, blocked and limited flows
remain distinguishable.

## Status vocabulary

| State | Meaning in this document |
|---|---|
| Implemented and verified | The user-facing capability and its user-owned persistence or filtering boundary exist in the reviewed code and have relevant automated checks. Final release verification may still be required. |
| Implemented with limitations | The capability exists, but availability depends on an external service, production configuration, feature flag, reviewed content supply or a final manual release check. |
| Excluded | The capability is deliberately outside the delivered product and must not be implied by the report. |
| Planned | Only an explicitly owner-approved future capability. Repository backlog items and ideas are not automatically product commitments. |

## Product statement

AL-LÍO is a private, Spanish-language student workspace for Higher Vocational
Education. It turns scattered planning, curriculum, learning, sector news and
career information into a smaller set of relevant actions for each student's
cycle.

The product is organised around one practical question: **what should the
student do next?** It combines personal organisation with cycle-specific
competencies and reviewed external opportunities, while keeping personal
tasks, notes, progress, saved items and applications scoped to the signed-in
student.

AL-LÍO is not a generic news portal, a learning-management system, an official
academic adviser or an automatic decision-maker. It supports a student's own
decisions; it does not replace the educational centre, official curriculum,
teacher or employer.

## Intended users and supported cycles

The delivered audience is an authenticated student with one active cycle and
one academic year in their profile.

| Code | Canonical product name | Relevance group | Product consequence |
|---|---|---|---|
| `DAW` | Desarrollo de Aplicaciones Web | `DEV` | Exact DAW competencies and cycle-targeted content; shares the development company catalogue with DAM. |
| `DAM` | Desarrollo de Aplicaciones Multiplataforma | `DEV` | Exact DAM competencies and cycle-targeted content; shares the development company catalogue with DAW. |
| `AF` | Administración y Finanzas | `AF` | AF competencies, content, news, jobs and company catalogue. |
| `TSAF` | Acondicionamiento Físico | `TSAF` | TSAF competencies, content, news, jobs and company catalogue. |
| `MP` | Marketing y Publicidad | `MP` | MP competencies, content, news, jobs and company catalogue. |

The names above follow the active database catalogue. The current English
README describes `TSAF` as “Teaching and Socio-Sports Animation”, which does
not match the canonical database name. That wording must be reconciled before
the final report is generated; it must not be repeated in the PDF.

An administrator role exists for protected operational work, but
administration is not part of the ordinary student navigation or the central
report journey.

## How relevance is determined

AL-LÍO does not apply one generic recommendation list to every student. The
selection boundary is explicit and differs by content type:

1. The student selects a cycle and academic year during onboarding. The
   server derives the corresponding cycle group; the browser does not choose
   it independently.
2. Competencies and their order come from the exact cycle-to-skill mapping.
3. Learning resources must match the exact cycle and skill and be active,
   approved, available, in Spanish and safely linked.
4. News must be approved, not withdrawn, not expired, fresh for its content
   type and targeted to the student's exact cycle. Saved content can remain
   accessible as the student's private archive under the authorised rules.
5. Courses and events use exact cycle fit and, where supplied, academic-year
   fit. The verified production boundary additionally requires accepted
   canonical content and a valid current lifecycle or date window.
6. Verified jobs must be open, within any application deadline and targeted
   to the student's exact cycle.
7. Companies are curated by professional family. DAW and DAM therefore share
   the `DEV` company catalogue; the other cycles use their own group.
8. Personal state is always added after the catalogue boundary and scoped to
   the authenticated user. One student's completion, notes, saved items or
   applications do not change the shared catalogue or another student's
   state.

The final report may explain these rules in prose. It should publish only the
final aggregate coverage results from `02-evidence-register.md`, never the raw
queries or private rows.

## Delivered student journey

### 1. Public entry and account access

The visitor can understand the project through the public Spanish landing
page, with a corresponding English public route and legal/contact pages. From
the account surface, a student can:

- create an email/password account and confirm it through a time-limited email
  link;
- sign in with a confirmed password account;
- sign in or create an account with a verified Google identity;
- request a password-reset link without revealing whether an account exists;
- replace the password and revoke previous signed sessions;
- sign out from the authenticated account menu.

All private product routes require a valid signed session. Production uses
individually owned identities; the obsolete passwordless demo-profile boundary
was retired and is not a public access method.

Decision value: the student receives a private workspace with an accountable
identity boundary, so personal planning and progress can persist safely.

Status: **implemented with limitations** (`PRD-002`). The flows and security
boundaries are present and tested in the repository, but final email delivery,
Google OAuth configuration and each production entry path must be verified on
the frozen release.

### 2. Onboarding and cycle selection

A newly authenticated student cannot enter the private application until they
select one of the five active cycles and their academic year. The server
persists the profile and derives the cycle group. A returning student with a
complete profile bypasses this gate.

After onboarding, a short, optional product tour points to Quick Add and the
three navigation groups. It explains the interface without creating content
or navigating on behalf of the student, and its progress can be resumed or
skipped.

Decision value: the product acquires the minimum information required to make
later content relevant and teaches the student where the next actions live.

Status: **implemented and verified** (`PRD-003`, `PRD-004`).

### 3. Dashboard and next actions

The dashboard combines:

- the student's most recent personal tasks;
- the next available competency step and cycle progress;
- dated tasks, courses, events and opportunities in an upcoming feed;
- selected or saved event highlights;
- a calendar summary;
- a clear partial-load warning when one data area fails while the rest remains
  usable.

Quick Add can create a task, personal course or personal event/retos entry
without leaving the current page. Persistence is awaited and failed optimistic
updates are rolled back.

Decision value: instead of visiting every module, the student can see a small
set of current commitments and choose the next useful action.

Status: **implemented and verified** (`PRD-005`).

### 4. Competency route

The Competencias area presents the skills mapped to the student's cycle,
ordered into curriculum modules. It distinguishes cycle-specific and
transversal modules, calculates per-module and overall progress and identifies
the next skill with available learning material.

A competency can be marked complete for the current student even where it has
no linked learning item. This manual competency state is deliberately separate
from observed video-resource completion and from event preparation
requirements.

Decision value: the student sees a structured route rather than an unordered
resource catalogue and can identify gaps before choosing a course or event.

Status: **implemented and verified** (`PRD-006`).

### 5. Learning resources, progress and notes

For a mapped competency, the application exposes only canonical resources
that satisfy the approval, availability, language and cycle rules. The
internal learning player embeds the selected video, records the student's
position and completion state, and persists learning notes. Those notes are
also mirrored to the student's Bloc so that learning context is not trapped in
one screen.

When no approved resource covers a required competency, the interface keeps
an explicit coverage gap instead of substituting an unreviewed candidate.

Decision value: the student can continue a reviewed Spanish resource from the
saved position and retain useful notes without searching the web again.

Status: **implemented with limitations** (`PRD-007`). The capability is
verified in code; usefulness depends on final approved-resource coverage for
each cycle, which will be measured at the release cut-off rather than assumed.

### 6. Personal planning: tasks, calendar and Bloc

Tasks are private, persistent records with title, description, category,
priority, optional due date/time and completion state. The student can create,
inspect, edit, complete, reopen and delete them, and can filter the list by
pending, completed or all.

The local calendar combines dated personal tasks, courses and events into one
view and deep-links each item to its exact detail. The student can also connect
Google Calendar, inspect upcoming Google events, create an event and delete an
event after granting the separate Calendar permission.

Bloc is a private notes workspace with rich-text formatting, recent and
favourite views, a recoverable trash workflow and PDF export. Learning notes
can enter the same workspace automatically.

Decision value: discovery becomes an actionable plan: the student can turn a
resource, deadline or opportunity into personal work and retain the supporting
notes.

Status: tasks and Bloc are **implemented and verified** (`PRD-008`,
`PRD-009`). Local calendar aggregation is **implemented and verified**;
Google Calendar is **implemented with limitations** because it requires the
student's consent, valid provider configuration and a final production smoke
test (`PRD-010`).

### 7. Reviewed, cycle-specific news

Noticias loads the current authorised feed and the student's saved archive.
The student can search, filter by source, sort by date or trust tier, move
between recent, today, unread and saved views, and open an internal detail
page. Opening the detail marks the item read; saving is a separate private
action. The detail page explains relevance and evidence where supplied and
offers a validated link to the original source.

Rejected, withdrawn, expired, stale, wrong-destination and cross-cycle items
remain outside the live user boundary. The separate Radar service owns
collection and review; the application does not automatically publish raw
candidates.

Decision value: the student receives a smaller, attributable information feed
connected to their studies instead of a generic stream of headlines.

Status: **implemented with limitations** (`PRD-011`). Authorisation and
filtering are verified in code, while the amount and distribution of fresh,
approved production content must be measured at the final cut-off.

### 8. Courses, events, work and saved opportunities

Courses and Eventos y retos provide cycle-scoped catalogues with search,
filters, lifecycle-aware presentation, internal detail pages, official-source
links and private saved/completion state. Detail pages keep educational
outcomes, taught skills, event requirements, dates, eligibility and source
facts distinct. Saved historical items remain accessible without being counted
as currently publishable opportunities.

Trabajo combines four different tools:

- verified open jobs for the student's cycle when the verified-jobs boundary
  is enabled, with save, apply and dismiss actions;
- guided searches across external job portals using a role and Spanish
  province or remote-work choice, with the last query saved per platform;
- a curated company catalogue for the student's professional family, with
  search and favourites;
- a private candidature tracker with status, notes and manually added
  applications.

The profile's Guardados hub consolidates saved companies, courses and events
from the same live, user-scoped store. It does not create a second source of
truth.

Decision value: the student can compare a reviewed opportunity, inspect its
requirements and dates, retain it, find an employer or vacancy, and follow the
resulting candidature.

Status: courses, events, portal searches, companies, applications and the
saved hub are **implemented and verified** (`PRD-012` to `PRD-016`). Verified
jobs are **implemented with limitations** because the route is deliberately
feature-gated and depends on accepted, current Radar job content
(`PRD-014`). Legacy `tech_opportunities` course/event rows cannot be favourited;
only supported catalogue origins expose that action.

### 9. Profile management and continuity

The profile lets the student change cycle and academic year. The active cycle
then drives later competency, content, news, job and company selection. The
same area shows learning progress, the next competency focus and saved content.

Desktop and mobile use the same navigation hierarchy. The mobile menu replaces
the desktop sidebar without changing the product areas, and the onboarding
tour targets equivalent navigation groups on both layouts.

Decision value: the student can correct the context that controls relevance
and continue the same core journey on a smaller screen.

Status: **implemented and verified** (`PRD-003`, `PRD-016`, `PRD-017`). A
final owner-led mobile smoke test remains part of release validation and is not
replaced by the source-level responsive checks.

## Delivered-scope matrix

| Product capability | State | Evidence | Final-release condition or limitation |
|---|---|---|---|
| Public Spanish/English entry, legal and contact routes | Implemented and verified | `PRD-001` | Confirm canonical production domain and final copy. |
| Email registration, confirmation, login and password reset | Implemented with limitations | `PRD-002` | Verify production mail delivery, links and complete account journey. Historical README/product-spec claims are obsolete. |
| Google identity sign-in | Implemented with limitations | `PRD-002` | Verify production OAuth configuration and callback. |
| Mandatory cycle/year onboarding and optional tour | Implemented and verified | `PRD-003` | Run the final owner smoke test with fictional accounts. |
| Five supported cycles and deterministic relevance rules | Implemented and verified | `PRD-004` | Confirm all five active rows and resolve the TSAF naming conflict. |
| Dashboard, next step, progress and Quick Add | Implemented and verified | `PRD-005` | Confirm final data loads and empty/error states. |
| Cycle competency route and private completion | Implemented and verified | `PRD-006` | Measure final cycle mappings and coverage. |
| Approved Spanish learning player, progress and notes | Implemented with limitations | `PRD-007` | Measure approved available resource coverage per cycle. |
| Private task workflow | Implemented and verified | `PRD-008` | Final persistence smoke test. |
| Private rich-text Bloc, trash and PDF export | Implemented and verified | `PRD-009` | Final export and persistence smoke test. |
| Local calendar aggregation | Implemented and verified | `PRD-010` | Final deep-link and event-detail smoke test. |
| Google Calendar connection and event operations | Implemented with limitations | `PRD-010` | Requires provider consent/configuration and final production verification. |
| Reviewed cycle news, internal detail, read and save | Implemented with limitations | `PRD-011` | Measure fresh approved content; do not claim comprehensive coverage. |
| Cycle courses with detail, status and saved state | Implemented and verified | `PRD-012` | Count only accepted and currently publishable final content. |
| Cycle events/retos with detail, requirements and saved state | Implemented and verified | `PRD-013` | Count only accepted and currently publishable final content. |
| Verified cycle jobs and private job actions | Implemented with limitations | `PRD-014` | Feature flag and accepted open-job supply must be present. |
| External portal search, curated companies and candidature tracking | Implemented and verified | `PRD-015` | Portals remain external; company rows are not vacancies. |
| Consolidated saved-content hub | Implemented and verified | `PRD-016` | Excludes unsupported legacy opportunity origins. |
| Equivalent mobile and desktop navigation hierarchy | Implemented and verified | `PRD-017` | Final owner-led mobile smoke test required. |
| Automatic academic decisions, official accreditation, LMS functions, social networking and unreviewed publication | Excluded | Explicit product boundary | Do not imply or illustrate these capabilities. |
| Additional product capabilities | Planned: none approved for the report | Owner decision required | Backlog items and ideas remain outside the report until explicitly approved. |

## Explicit exclusions

The final report must not imply that AL-LÍO provides:

- automatic academic, employment or admissions decisions;
- an official curriculum, qualification or professional accreditation;
- teacher-led course delivery, grading, attendance or classroom management;
- automatic publication of Radar candidates or complete coverage of every
  external source;
- a generic national news service;
- public student profiles, social networking or shared student notes;
- public demo credentials in production;
- a student-facing administration console;
- measured learning, employment or social outcomes without a consented study
  and a stated sample;
- uninterrupted availability of Google or external job portals;
- support for cycles beyond the five active catalogue entries.

There are currently no additional product features approved for promotion as
“planned” in the technical report. Future backlog items may be discussed as
possible improvements only after explicit owner approval and must never be
mixed with delivered scope.

## Known limitations and conflicts to resolve before the PDF

1. The owner verified registration, email/password access, Google identity,
   logout and password recovery in production on 31 August 2026 using desktop
   Chrome. This is owner smoke evidence, not a cross-browser E2E suite.
2. The README's English expansion of `TSAF` conflicts with the active database
   catalogue. The final report must use the owner-confirmed canonical Spanish
   programme name.
3. The final quantity and cycle distribution of approved learning resources,
   news, courses, events and jobs are not yet frozen. Until the final aggregate
   queries run, the report may describe the rules but not publish invented
   coverage totals.
4. Verified jobs and verified-only opportunity catalogues depend on production
   flags and accepted canonical Radar content. Code presence alone is not
   evidence that a non-empty catalogue was available at the report cut-off.
5. Google identity works in production, but Calendar authorisation reached
   Google's unverified-application warning. The optional Calendar connection,
   disconnect and post-sign-out flow did not complete. This is a provider
   consent/verification limitation, not evidence that Google login failed.
6. Automated coverage is strong at domain, integration-contract and
   source-boundary level, but it is not a comprehensive browser end-to-end
   suite. Final owner-led release checks must be reported honestly.
7. The owner reported that production news failed or exposed very little/no
   content during the 31 August smoke test. The implementation and automated
   authorisation boundary remain present, but the report must disclose the
   production coverage limitation and must not invent a catalogue total.
   Production rollout and coverage work remains tracked in issue #235.
8. No screenshot is collected by this issue. Visual evidence is coordinated
   separately in issue #301 and captured by the owner only after the final
   release is visually approved.

## Evidence catalogue

These IDs support product claims inside the working documentation. They are
not intended as headings or visible labels in the final PDF.

| Evidence ID | Capability supported | Primary implementation evidence | Automated evidence | Current status |
|---|---|---|---|---|
| `PRD-001` | Public project entry and public information | `src/app/page.tsx`, `src/app/en/page.tsx`, `src/features/marketing/`, legal routes | `tests/integration/marketing/public-contact.test.mjs` | Verified in owner desktop smoke test |
| `PRD-002` | Account creation, confirmation, login, reset, Google identity and signed access | `src/app/(auth)/`, `src/app/api/auth/google/`, `src/lib/auth/`, `src/middleware.ts` | `tests/integration/auth/production-auth.test.mjs`, `tests/unit/auth/session-token.test.mjs` | Registration, login, logout, reset and Google identity verified in production |
| `PRD-003` | Onboarding, profile updates and product tour | `src/app/onboarding/`, `src/components/onboarding/`, `src/components/profile/profile-form.tsx` | `tests/integration/onboarding/`, `tests/unit/onboarding/product-tour.test.mjs` | Onboarding, profile and cycle change verified; tour not separately smoked |
| `PRD-004` | Five-cycle model and relevance boundary | `infra/postgres/schema.sql`, `src/lib/profile/onboarding-options.ts`, cycle-scoped repositories | `tests/integration/onboarding/`, learning/news/work integration tests | Collected; final active-cycle query pending |
| `PRD-005` | Dashboard and Quick Add | `src/components/dashboard/`, `src/components/quick-add.tsx`, `src/lib/data.ts` | `tests/integration/dashboard/data-and-layout.test.mjs`, `tests/unit/dashboard/upcoming-feed.test.mjs` | Collected |
| `PRD-006` | Competency roadmap and cycle progress | `src/components/roadmap/`, `src/lib/fp/roadmap.ts`, `src/features/learning/domain/overview.ts` | `tests/integration/learning/persistence-and-resources.test.mjs` | Route and progress verified; final coverage query pending |
| `PRD-007` | Approved learning resources, player progress and notes | `src/components/learning/`, `src/features/learning/`, `src/app/(dashboard)/aprende/` | `tests/integration/learning/persistence-and-resources.test.mjs`, `tests/unit/learning/resource-selection.test.mjs` | Progress and notes verified; final content coverage pending |
| `PRD-008` | Private task lifecycle | `src/features/tasks/` | `tests/integration/tasks/workflows.test.mjs`, `tests/integration/dashboard/data-and-layout.test.mjs` | Collected |
| `PRD-009` | Private Bloc notes, recovery and export | `src/features/bloc/`, `src/lib/bloc/` | `tests/integration/bloc/editor.test.mjs`, `tests/unit/bloc/notes.test.mjs` | Collected |
| `PRD-010` | Local and Google calendar flows | `src/components/calendar/`, `src/features/calendar/`, `src/app/api/google/calendar/` | `tests/integration/navigation/app-shell.test.mjs`, `tests/integration/auth/calendar-ownership.test.mjs` | Local boundary implemented; Google Calendar consent blocked by unverified-app warning |
| `PRD-011` | Authorised cycle-news list/detail/read/save boundary | `src/components/noticias/`, `src/app/api/news/`, `src/lib/db/repositories/radar.ts` | `tests/integration/news/authorised-feed.test.mjs`, `tests/unit/news/text.test.mjs` | Implemented; production smoke failed or returned little/no content; #235 remains open |
| `PRD-012` | Courses catalogue, details, completion and favourites | `src/features/courses/`, `src/app/(dashboard)/courses/` | `tests/integration/courses/` | Collected; final accepted-content query pending |
| `PRD-013` | Events/retos catalogue, requirements, details and favourites | `src/features/events/`, `src/app/(dashboard)/hackathons/` | `tests/integration/events/`, `tests/unit/events/` | Collected; final accepted-content query pending |
| `PRD-014` | Verified cycle jobs and private actions | `src/app/api/verified-jobs/`, `src/app/(dashboard)/work/jobs/`, `src/lib/jobs/` | `tests/contracts/radar/v4.test.mjs` | Collected; feature flag and final open-job query pending |
| `PRD-015` | Portal search, company catalogue and candidature tracker | `src/features/work/`, `src/app/api/job-radar/` | `tests/integration/work/`, `tests/unit/work/`, `tests/operations/importers/company-catalogue.test.mjs` | Collected |
| `PRD-016` | Consolidated saved-content hub | `src/components/profile/saved-hub.tsx` | `tests/integration/profile/saved-hub.test.mjs` | Collected |
| `PRD-017` | Shared desktop/mobile navigation hierarchy | `src/components/app-sidebar.tsx`, `src/components/mobile-header-navigation.tsx` | `tests/integration/navigation/app-shell.test.mjs`, `tests/unit/onboarding/product-tour.test.mjs` | Desktop Chrome verified; owner reports responsive navigation works, but no mobile device/browser was recorded |
| `PRD-018` | Complete final-release student journey matrix | The nine-stage journey in this document | `QAL-002` owner smoke matrix | Partial: core flows pass; Calendar and news prevent a complete result |

## PDF extraction guidance

The technical report should normally use:

- one concise product statement;
- one short paragraph defining the five-cycle audience and relevance model;
- one end-to-end student journey, supported by selected examples from the
  nine stages above;
- a compact table of the principal delivered areas and honest limitations;
- only final, reproducible aggregate content figures;
- selected owner-approved visual evidence from issue #301.

It should not include this evidence catalogue, repository paths, test-file
names, implementation comments or raw collection commands. Those materials
exist to make the final prose defensible, not to turn the report into an audit.
