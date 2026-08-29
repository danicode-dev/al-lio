# Verified job catalogue and private applications

AL-LÍO consumes the signed Radar v4 JSON contract for verified vacancies. CSV
remains suitable for a manual audit export, but it is not the runtime boundary:
nested field evidence, nullable facts, target arrays and immutable revisions
need a versioned JSON object to avoid lossy parsing and ambiguous empty values.

## Ownership boundary

`radar_verified_jobs` contains global vacancy facts. It has no `user_id` and no
student workflow data. `radar_job_field_evidence` retains the field-level
source evidence for each immutable revision.

`job_applications` remains private and user-scoped. It can link to the stable
Radar entity and currently selected source occurrence only after an explicit
authenticated action (`save`, `unsave`, `applied` or `dismiss`). Ingesting or
discovering a vacancy never inserts a student application.

Manual and unmatched applications remain valid because both canonical links
are nullable. Closed or expired vacancies leave active recommendations, while
an existing student's history remains queryable in Candidaturas.

## What the student sees

The Work page keeps the existing portal searches and company directory during
the pilot. When `AL_LIO_RADAR_V4_PROJECT_DESTINATIONS` includes `job`, it also
shows:

- one deduplicated row per canonical vacancy entity;
- exact role and employer;
- source verification date and objective active state;
- location and remote/hybrid/on-site mode when stated;
- deadline, contract and salary only when stated by the source;
- cycle/module/skill relevance as AL-LÍO guidance, visually separated from
  employer facts;
- a detail page with the exact application URL, source traceability and a next
  verified vacancy;
- private save, dismiss and applied actions.

The detail page omits unknown salary, education, experience, schedule,
language or deadline values. It never substitutes generic copy such as "check
the official call" for a missing source fact.

## Source inventory and migration decision

| Current path | Current role | Verified-catalogue decision |
| --- | --- | --- |
| LinkedIn/InfoJobs/Indeed/Tecnoempleo/Jooble deep links | User-owned external search | Keep during the pilot; a search page is not a verified vacancy |
| InfoJobs, Adzuna, Jooble and Tecnoempleo integrations | Direct AL-LÍO aggregation | Do not relabel; replace only after Radar records authorized API/feed access and pilot accuracy |
| Fixed company catalogue | Employer discovery | Keep; company pages are not vacancies |
| In-app company-page scraper | Legacy private collection | Keep behind its existing API boundary, remove the visible sync action, and do not migrate scraped rows as verified facts |
| Manual applications | Student-owned history | Preserve unchanged with nullable canonical links |

No named source is authorized by this AL-LÍO change. Authorization is owned by
Radar's per-source access policy. The initial intended pilot is DAW, one
reviewed first-party employer source and one reviewed public employment
service. Expansion to other cycles follows measured precision and coverage,
not a target content quota.

## Activation and rollback

The migration and receiver are safe to deploy before activation. Canonical v4
ingest can retain an accepted job revision, but the Work API and UI remain
disabled unless `AL_LIO_RADAR_V4_PROJECT_DESTINATIONS` explicitly includes
`job`. Radar independently requires schema v4 and `JOB_RADAR_ENABLED=true`.

Activation order:

1. Apply migrations through the versioned migrator.
2. Keep AL-LÍO's destination list without `job` and Radar's job flag disabled.
3. Run the bounded Radar shadow pilot and audit source terms, precision,
   duplicates, field coverage and closure latency.
4. Enable the AL-LÍO `job` projector first so the signed receiver is ready.
5. Enable Radar job delivery for the approved source/cycle subset.
6. Add `job` to Radar's 09:00 autonomous destinations only after delivery and
   UI metrics are healthy.

Rollback is configuration-only: remove `job` from AL-LÍO's projection list or
disable `JOB_RADAR_ENABLED` in Radar. Existing portal links, company discovery,
manual applications and private history remain available. Additive tables do
not need to be dropped.
