# AL-LIO product specification

## Product statement

AL-LIO is a private student workspace for planning, vocational-skills
development and career discovery. It reduces the effort required to turn
scattered information into a small set of relevant next actions.

The interface and student-facing content are in Spanish. The product is not a
generic news portal, a learning-management system or an automated academic
advisor.

## Supported users

The current product serves authenticated Higher Vocational Education students
with one of these cycle profiles:

- `DAW`: Web Application Development;
- `DAM`: Multiplatform Application Development;
- `AF`: Administration and Finance;
- `TSAF`: Teaching and Socio-Sports Animation;
- `MP`: Marketing and Advertising.

An administrator role exists for protected operational views. Administration
is not exposed as a normal student navigation item.

## User outcomes

An authenticated student can:

- identify tasks and upcoming commitments;
- follow a competency-based learning path;
- watch an approved Spanish learning resource and retain progress and notes;
- discover courses, hackathons, companies and job-oriented opportunities;
- read news classified for their own cycle;
- connect Google Calendar;
- maintain their profile and cycle selection.

## Main product areas

| Area | Purpose |
|---|---|
| Dashboard | Summarise priorities, progress and next actions. |
| Competencies | Organise required and recommended skills by cycle. |
| Tasks | Persist personal work and completion state. |
| Bloc | Persist student notes. |
| News | Show only approved, non-expired items for the user's cycle. |
| Work | Present companies and employment-oriented links. |
| Courses | Present reviewed training opportunities. |
| Hackathons | Present reviewed challenges, events and calls. |
| Calendar | Combine local planning with optional Google Calendar access. |
| Profile | Persist identity, cycle and student preferences. |

## Authentication and account lifecycle

- Google OAuth can create or update a user and establish an application
  session.
- Email/password login works only for accounts that already have a password
  hash provisioned by an authorised operator.
- Self-service email registration is not implemented; `/register` redirects to
  `/login`.
- Demo profiles are controlled by an environment flag and disabled by default
  in production.
- Protected pages require a valid signed session.

The product must never imply that self-service registration, password recovery
or email verification exists until those flows are implemented and tested.

## Curated content principles

- Relevance is determined by the student's cycle, not by generic popularity.
- News requires deterministic curricular matching and human approval in
  AL-LIO Radar.
- Learning resources require manual review for language, ownership, direct
  teaching value and safety.
- General crime, politics, entertainment, gossip, betting, sensationalism and
  unrelated local news are outside scope.
- Editorial labels describe AL-LIO curation and do not replace official
  curricula or professional accreditation.

## Current functional boundary

Implemented:

- VPS-hosted Next.js application;
- PostgreSQL persistence and versioned migrations;
- signed sessions, Google OAuth and provisioned password access;
- user-scoped tasks, notes, profile and content state;
- Google Calendar integration;
- cycle-specific learning catalogues;
- Radar webhook v2 ingestion and server-side cycle filtering;
- production Docker, health, backup and rollback tooling.

Not yet claimed as complete:

- public self-service email registration;
- password recovery and email verification;
- a comprehensive browser end-to-end suite;
- automatic publication of Radar candidates;
- complete editorial validation of every pending external source.

## Product rule

AL-LIO should help a student decide what to do next. A feature that adds noise,
cannot explain its source or cannot preserve user ownership does not belong in
the product.
