# Technical report evidence register

This register defines how AL-LIO report claims are collected, classified and
verified. It is deliberately stricter than a list of interesting numbers: a
metric is reportable only when its population, version, time boundary and
collection method are explicit.

## Current collection state

The working documentation branch started from `origin/main` at
`7caebc77756cfb075f852b551c3c279ec04c6b04`. This is a working reference, not
the final report baseline. All release-dependent values remain `planned` until
the final tag and production deployment are frozen.

No production database contents, private user records or screenshots were
collected for this issue.

## Claim classes

Every report claim must use exactly one class.

| Class | Meaning | Permitted wording |
|---|---|---|
| `implemented` | Present in an identified reviewed source baseline; final-release confirmation may still be pending | "The reviewed source implements..." |
| `delivered` | Present in the frozen release and verified in its intended boundary | "The delivered release provides..." |
| `internally validated` | Reproduced by the project team without claiming independent user evidence | "The internal verification recorded..." |
| `measured` | Observed with a documented method, sample and timestamp | "The verification recorded..." |
| `estimated` | Calculated from dated inputs and explicit assumptions rather than directly observed as a complete value | "The projection estimates..." |
| `expected` | Reasoned impact that has not been measured with users | "AL-LIO is intended to..." |
| `planned` | Future work not present in the frozen release | "The roadmap includes..." |
| `historical` | True for an earlier release or development phase only | "Release v0.1.0 recorded..." |

Expected and planned claims must never appear in a results table without their
class. Code volume, commit volume and catalogue size are engineering context,
not evidence of student impact.

## Evidence record schema

| Field | Required content |
|---|---|
| Evidence ID | Stable category prefix and three-digit number |
| Claim class | One value from the claim-class table |
| Claim | Exact sentence or narrowly scoped statement supported |
| Metric or observation | Value with unit, denominator and time boundary |
| Population | What was included and excluded |
| Method | Repeatable command, query, test or review protocol |
| Source | Repository path, release, workflow run, public endpoint or owner decision |
| Version | Tag, SHA, deployment image or environment |
| Collected at | ISO 8601 timestamp with timezone |
| Collector | Person or automated system that produced the result |
| Verifier | Independent reviewer or second source where required |
| Privacy | `public`, `aggregate-only`, `private` or `prohibited` |
| Report section | Intended destination in the technical report |
| Status | `planned`, `collected`, `verified`, `rejected` or `superseded` |
| Notes | Assumptions, caveats and reasons for rejection or supersession |

An evidence ID is never reused. When a value becomes stale, mark it
`superseded` and create a new ID.

## Evidence categories

| Prefix | Category |
|---|---|
| `DEL` | Delivery contract and programme requirements |
| `VER` | Version, release and canonical public references |
| `PRD` | Product scope and user outcomes |
| `DAT` | Curated catalogue and content-governance metrics |
| `ARC` | Runtime architecture and service trust boundaries |
| `SEC` | Authentication, authorisation and integration security |
| `GOV` | Editorial and publication governance |
| `ENG` | Repository and engineering metrics |
| `QAL` | Automated and manual quality verification |
| `OPS` | Deployment, health, backup, recovery and maintenance |
| `IMP` | User validation and social impact |
| `ECO` | Operating cost and economic sustainability |
| `VIS` | Owner-captured product visual evidence |

## Evidence strength

Use the strongest available source for each claim.

1. **Immutable executable evidence:** final tag/SHA, signed release record,
   migration, test, configuration or build output.
2. **Reproducible operational evidence:** aggregate read-only query, public
   endpoint observation, backup/restore record or controlled smoke test.
3. **Reviewed documentary evidence:** maintained specification, architecture
   decision, owner confirmation or approved visual evidence.
4. **Estimate:** calculation with stated inputs and uncertainty. Estimates are
   allowed only when no measured value exists and must be labelled explicitly.

README prose alone does not prove runtime behaviour. A screenshot proves a
visible state, not persistence, authorisation, data provenance or future
availability.

## Privacy rules

| Classification | Handling |
|---|---|
| `public` | May be committed and quoted in the report |
| `aggregate-only` | Only a non-identifying aggregate and method may be committed |
| `private` | May inform an owner decision but remains outside Git and the PDF |
| `prohibited` | Must not be collected for report purposes |

Prohibited evidence includes credentials, OAuth tokens, cookies, environment
files, raw student rows, email addresses, notes, tasks, calendar events, job
applications, signed annexes and identity or banking documents.

Small-group user research must not be broken down into combinations that allow
re-identification. Store only consented aggregate results and anonymised
comments that cannot reasonably identify a participant.

## Verified delivery evidence

These values do not depend on the future release tag.

| ID | Class | Claim or observation | Source | Privacy | Status |
|---|---|---|---|---|---|
| `DEL-001` | delivered | The owner confirmed 31 August 2026 as the report delivery date | Owner decision recorded in issue #295 and `01-delivery-brief.md` | public | verified |
| `DEL-002` | delivered | The deliverable is a PDF with no prescribed page target; completeness and lack of filler govern length | Owner decision recorded in issue #295 and `01-delivery-brief.md` | public | verified |
| `DEL-003` | delivered | No technical appendix, video or presentation is required for the current delivery | Owner decision recorded in issue #295 and `01-delivery-brief.md` | public | verified |
| `DEL-004` | delivered | Legal annexes were delivered separately and remain outside this workflow | Owner decision; no annex contents retained | private | verified |
| `DEL-005` | delivered | The report will be sent through Gmail to the designated Aircury contact | Owner decision; recipient remains outside Git | private | verified |
| `DEL-006` | delivered | AL-LIO is released under the MIT License | `LICENSE` and final release tree | public | verified |
| `DEL-007` | delivered | AL-LIO publicly acknowledges Aircury Summer of Code 2026 | `README.md` and `NOTICE.md` | public | verified |
| `VER-001` | delivered | The canonical public repository is `danielgarciaortega-dev/al-lio` | GitHub repository and owner confirmation | public | verified |
| `VER-002` | delivered | The canonical production URL is `https://al-lio.app` | Owner confirmation; final availability is rechecked under `OPS-001` | public | verified |
| `VER-003` | delivered | The public project contact is `hola@al-lio.app` | README and owner confirmation | public | verified |
| `VER-004` | planned | The report will cite one final immutable AL-LIO and Radar release baseline | `01-delivery-brief.md`; identifiers pending | public | planned |
| `OPS-001` | planned | The final release is live and its database boundary is ready at the evidence cut-off | Final `/api/health` and `/api/ready` observations | public | planned |
| `OPS-002` | delivered | The project carries an operating commitment through at least 31 August 2027 | Supplied programme rules and `NOTICE.md` | public | verified |

## Report evidence catalogue

This table combines reviewed mechanism evidence with values that remain blank
until collected from the frozen release, production or the owner. Each ID has
one meaning throughout documents `03`–`06`.

| ID | Proposed claim | Population and exclusions | Collection source | Class | Privacy | Status |
|---|---|---|---|---|---|---|
| `PRD-001` | Public project entry and public information | Canonical public and legal routes only | Issue #297 implementation/test map | implemented | public | collected; production route check pending |
| `PRD-002` | Account creation, confirmation, login, reset, Google identity and signed access | Implemented account flows; external-provider checks remain separate | Issue #297 implementation/test map | implemented | public | collected; production mail/OAuth checks pending |
| `PRD-003` | Onboarding, profile updates and product tour | Authenticated profile and tour flow | Issue #297 implementation/test map | implemented | public | collected |
| `PRD-004` | Five-cycle model and relevance boundary | Active `fp_cycles`; exclude disabled cycles | Aggregate query `Q-PRD-004` plus issue #297 | implemented | public | collected; final active-cycle query pending |
| `PRD-005` | Dashboard and Quick Add | Authenticated dashboard boundary | Issue #297 implementation/test map | implemented | public | collected |
| `PRD-006` | Competency roadmap and private cycle progress | Authenticated cycle-scoped route | Issue #297 implementation/test map | implemented | public | collected; final coverage pending |
| `PRD-007` | Approved learning resources, player progress and notes | Approved/available exact-cycle resources and private state | Issue #297 implementation/test map | implemented | public | collected; final resource coverage pending |
| `PRD-008` | Private task lifecycle | Current user's task rows only | Issue #297 implementation/test map | implemented | public | collected; final smoke pending |
| `PRD-009` | Private Bloc notes, recovery and export | Current user's note rows only | Issue #297 implementation/test map | implemented | public | collected; final smoke pending |
| `PRD-010` | Local and optional Google Calendar flows | Local planning plus separately consented provider flow | Issue #297 implementation/test map; `SEC-005` | implemented | public | collected with limitation; provider check pending |
| `PRD-011` | Authorised cycle-news list, detail, read and save boundary | Approved, fresh, non-withdrawn exact-cycle news | Issue #297 implementation/test map | implemented | public | collected; final content query pending |
| `PRD-012` | Courses catalogue, details, completion and favourites | Accepted/current cycle courses | Issue #297 implementation/test map | implemented | public | collected; final content query pending |
| `PRD-013` | Events and challenges catalogue, requirements, details and favourites | Accepted/current cycle events | Issue #297 implementation/test map | implemented | public | collected; final content query pending |
| `PRD-014` | Verified cycle jobs and private actions | Accepted open jobs when the feature boundary is enabled | Issue #297 implementation/test map | implemented | public | collected with limitation; final flag/content check pending |
| `PRD-015` | Portal search, company catalogue and candidature tracker | External search links, curated companies and private applications | Issue #297 implementation/test map | implemented | public | collected |
| `PRD-016` | Consolidated saved-content hub | Supported user-owned saved states | Issue #297 implementation/test map | implemented | public | collected |
| `PRD-017` | Shared desktop/mobile navigation hierarchy | Equivalent core route hierarchy, not pixel identity | Issue #297 implementation/test map | implemented | public | collected; owner mobile smoke pending |
| `PRD-018` | Verified end-to-end student journeys in the final release | Only journeys passing the final acceptance matrix | Issue #297, tests and `QAL-002` | measured | aggregate-only | planned |
| `DAT-001` | Skills mapped to each supported cycle | `fp_cycle_skills` joined to active cycles | Query `Q-DAT-001` | measured | public | planned |
| `DAT-002` | Approved, available Spanish learning resources by cycle | Approved mappings and resources only; exclude candidates, rejected, retired, unavailable and inactive resources | Query `Q-DAT-002` | measured | public | planned |
| `DAT-003` | Learning-resource coverage by cycle | Active cycle skills with at least one approved, available resource | Query `Q-DAT-003` | measured | public | planned |
| `DAT-004` | Approved, non-withdrawn and currently fresh news by cycle | Student-facing news boundary; exclude expired, stale, rejected and withdrawn items | Query `Q-DAT-004` | measured | public | planned |
| `DAT-005` | Accepted, currently publishable courses and events by cycle | Canonical accepted occurrences satisfying current lifecycle/date rules; exclude saved-user exceptions | Query `Q-DAT-005` | measured | public | planned |
| `DAT-006` | Accepted open verified jobs by cycle | Open jobs with an unexpired deadline and current cycle target | Query `Q-DAT-006` | measured | public | planned |
| `DAT-007` | Curated company entries by cycle group | Current `companies` catalogue; label as curated catalogue, not live vacancies | Query `Q-DAT-007` | measured | public | planned |
| `ARC-001` | Service trust boundaries keep PostgreSQL internal and exclude Radar from its network | Reviewed release topology | `infra/docker-compose.prod.yml`; ADR-0002; issue #298 | implemented | public | collected; final topology check pending |
| `ARC-002` | PostgreSQL uses a restricted runtime role and a separate migration credential | Reviewed database and Compose boundary | ADR-0001; `infra/postgres/`; issue #298 | implemented | public | collected; final configuration check pending |
| `SEC-001` | Signed browser session supports database-backed stamp revocation | Reviewed auth implementation | Session source and auth tests; issue #298 | implemented | public | collected |
| `SEC-002` | One onboarding gate protects every private route | Reviewed dashboard route tree | ADR-0007 and onboarding tests; issue #298 | implemented | public | collected |
| `SEC-003` | Product operations derive user ownership on the server | Reviewed server actions and repositories | ADR-0008 and boundary tests; issue #298 | implemented | public | collected |
| `SEC-004` | Radar delivery enforces signature, replay, schema and idempotency controls | Reviewed ingest contract | ADR-0003 and Radar contract/signature tests; issue #298 | implemented | public | collected; frozen schema set pending |
| `SEC-005` | Google identity and Calendar are separate; Calendar credentials remain cookie-scoped rather than fully user-session-bound | Optional integration boundary | Google implementation/tests; issue #298 | implemented | public | collected with documented limitation |
| `GOV-001` | Human approval is required before enabled Radar sources publish | Reviewed source/review configuration | ADR-0003; integration governance; issue #298 | implemented | public | collected; final enabled-source check pending |
| `GOV-002` | Publication governance covers provenance, expiry, withdrawal and server-side cycle filtering | Student-facing publication boundary | Integration governance; `DAT-001`–`DAT-007`; issue #298 | implemented | public | mechanism collected; final counts pending |
| `ENG-001` | Commit count and development date range | Commits reachable from the final tag; exclude later commits and unrelated branches | Commands `C-ENG-001` | historical | public | planned |
| `ENG-002` | Maintained source files and physical lines | Tracked source extensions under `src`; exclude dependencies, generated output, data and assets | Commands `C-ENG-002` | historical | public | planned |
| `ENG-003` | Automated test files and final test result | Tracked `*.test.mjs` files plus the final clean CI execution | Commands `C-ENG-003` and final workflow run | measured | public | planned |
| `ENG-004` | Applied schema migrations represented by the release | Ordered migration files included in final tag; production application status verified separately | Commands `C-ENG-004` plus migration status | measured | public | planned |
| `ENG-005` | App Router pages and route handlers | Tracked `page.tsx` and `route.ts` files under `src/app` | Commands `C-ENG-005` | historical | public | planned |
| `ENG-006` | Merged pull requests included in the release | PR merge commits reachable from the final tag; exclude closed-unmerged and later PRs | Commands `C-ENG-006` | historical | public | planned |
| `QAL-001` | Final release passes the repository CI contract | Clean `npm ci` and `npm run ci` on final tag, matched to workflow evidence | Issue #299 | measured | public | planned |
| `QAL-002` | Final owner smoke test covers all supported cycles | Agreed flow matrix using fictional accounts; no screenshots required for the result | Issue #299 | measured | aggregate-only | planned |
| `QAL-003` | Successful main-branch CI gates the guarded production deployment path | Reviewed workflow and deployment guard | ADR-0006; deployment workflow/scripts; issues #298 and #299 | implemented | public | collected; final execution evidence remains `QAL-001` |
| `OPS-003` | Immutable web, Radar and database image references | Final release record and production inventory | Issue #299 | planned | private-to-public-summary | planned |
| `OPS-004` | Backup, isolated restore and rollback readiness | Dated operational records; publish only status and timestamp | Issue #299 | measured | aggregate-only | planned |
| `OPS-005` | Backup, isolated restore and image-rollback mechanisms are defined as release gates | Reviewed scripts, runbooks and release checks | ADR-0005; operations documentation; issues #298 and #299 | implemented | public | collected; exercised readiness remains `OPS-004` |
| `IMP-001` | Student task completion and perceived relevance | Consented study with sample size, scenarios and limitations | Issue #300 | measured | aggregate-only | planned |
| `IMP-002` | Intended social benefit where no user measurement exists | Explicit reasoning tied to implemented product outcomes | Issue #300 | expected | public | collected |
| `IMP-003` | Mobile, keyboard, focus, reduced-motion and semantic mechanisms exist without a WCAG-conformance claim | Reviewed shared UI and structural tests | Issue #300 | internally validated | public | collected; manual accessibility review pending |
| `IMP-004` | Inclusion and unequal cycle-coverage risks are disclosed instead of hidden by a total | Explicit risk model with per-cycle `DAT-*` evidence | Issue #300 | expected | public | risk model collected; final coverage pending |
| `ECO-001` | Current and projected monthly operating cost through 31 August 2027 | Dated invoices or provider prices plus stated assumptions | Issue #300 | estimated | aggregate-only | planned |
| `ECO-002` | Maintenance responsibilities and provider fallbacks support continued operation | Documented mechanisms plus owner-confirmed operation | Issues #299 and #300 | implemented | public | mechanisms documented; owners/evidence pending |
| `VIS-001` | Final product visual evidence set | Ten owner-captured, privacy-reviewed items from the frozen release | Issue #301 and `07-product-visual-evidence.md` | planned | public | planned |

`private-to-public-summary` means the raw infrastructure inventory stays
private while an immutable, non-sensitive image or release identifier may be
published.

## Repository collection commands

Run these commands from a clean checkout of the final tag. Save the command,
stdout, exit code, timestamp and resolved tag SHA in the evidence record.

### C-ENG-001: history boundary

```powershell
$releaseRef = '<final-tag>'
git rev-parse $releaseRef
git rev-list --count $releaseRef
git log --reverse --format='%cI|%H|%s' $releaseRef | Select-Object -First 1
git log -1 --format='%cI|%H|%s' $releaseRef
```

The date range describes repository history, not continuous full-time effort.

### C-ENG-002: maintained source size

```powershell
$sourceFiles = rg --files src -g '*.ts' -g '*.tsx' -g '*.js' -g '*.mjs'
$sourceLines = 0
foreach ($file in $sourceFiles) {
  $sourceLines += (Get-Content -LiteralPath $file | Measure-Object -Line).Lines
}
[pscustomobject]@{
  files = $sourceFiles.Count
  physical_lines = $sourceLines
}
```

This is a size indicator only. It must not appear as evidence of quality,
impact or productivity.

### C-ENG-003: test inventory and result

```powershell
$testFiles = rg --files tests -g '*.test.mjs'
$testFiles.Count
npm ci
npm run ci
```

Report the final command exit status and workflow URL. Do not infer the number
of assertions from the file count; use the test runner's own final summary.

### C-ENG-004: migration inventory

```powershell
$migrationFiles = Get-ChildItem -LiteralPath 'infra/postgres/migrations' -File -Filter '*.sql' |
  Where-Object { $_.Name -match '^\d{4}_' } |
  Sort-Object Name
$migrationFiles.Name
$migrationFiles.Count
npm run postgres:migrate:status
```

The file count and production migration status are separate observations.

### C-ENG-005: application surface inventory

```powershell
$pages = rg --files src/app -g 'page.tsx'
$routeHandlers = rg --files src/app -g 'route.ts'
[pscustomobject]@{
  pages = $pages.Count
  route_handlers = $routeHandlers.Count
}
```

A route count is engineering context, not a count of distinct user features.

### C-ENG-006: pull requests included in the release

```powershell
$releaseSha = git rev-parse '<final-tag>'
gh pr list --state merged --limit 500 --json number,title,mergedAt,mergeCommit,url
```

For each candidate PR, require its `mergeCommit.oid` to be an ancestor of the
release:

```powershell
git merge-base --is-ancestor '<merge-commit-sha>' $releaseSha
```

Do not use the repository's total closed-issue count as delivered work. Closed
issues may be duplicates, rejected proposals or work outside the release.

## Aggregate production queries

Run these queries through the approved read-only operational path after the
final release is deployed. Record only result aggregates. Never export source
rows or user-owned state.

All time-sensitive queries use the same captured database timestamp:

```sql
select now() as database_cutoff;
```

### Q-PRD-004: active supported cycles

```sql
select code, group_code, name
from public.fp_cycles
where is_active = true
order by sort_order, code;
```

The supported-cycle count is the number of returned rows. Preserve the codes
so the report cannot hide a missing cycle behind a total.

### Q-DAT-001: cycle skill mappings

```sql
select
  cycle.code as cycle_code,
  count(mapping.skill_id) as cycle_skill_mappings,
  count(distinct mapping.skill_id) as distinct_skills
from public.fp_cycles cycle
left join public.fp_cycle_skills mapping on mapping.cycle_code = cycle.code
where cycle.is_active = true
group by cycle.code, cycle.sort_order
order by cycle.sort_order, cycle.code;
```

### Q-DAT-002: approved and available learning resources

```sql
select
  cycle.code as cycle_code,
  count(distinct case when resource.id is not null then mapping.skill_id end)
    as skills_with_resources,
  count(distinct resource.id) as approved_available_resources
from public.fp_cycles cycle
left join public.fp_skill_learning_resources mapping
  on mapping.cycle_code = cycle.code
  and mapping.publication_state = 'approved'
left join public.fp_learning_resources resource
  on resource.id = mapping.resource_id
  and resource.publication_state = 'approved'
  and resource.availability_state = 'available'
  and resource.is_active = true
  and resource.language = 'es'
where cycle.is_active = true
group by cycle.code, cycle.sort_order
order by cycle.sort_order, cycle.code;
```

### Q-DAT-003: learning-resource coverage

```sql
with covered_skills as (
  select distinct mapping.cycle_code, mapping.skill_id
  from public.fp_skill_learning_resources mapping
  inner join public.fp_learning_resources resource on resource.id = mapping.resource_id
  where mapping.publication_state = 'approved'
    and resource.publication_state = 'approved'
    and resource.availability_state = 'available'
    and resource.is_active = true
    and resource.language = 'es'
)
select
  cycle.code as cycle_code,
  count(skill.skill_id) as total_cycle_skills,
  count(covered.skill_id) as covered_cycle_skills,
  round(100.0 * count(covered.skill_id) / nullif(count(skill.skill_id), 0), 1)
    as coverage_percent
from public.fp_cycles cycle
left join public.fp_cycle_skills skill on skill.cycle_code = cycle.code
left join covered_skills covered
  on covered.cycle_code = skill.cycle_code and covered.skill_id = skill.skill_id
where cycle.is_active = true
group by cycle.code, cycle.sort_order
order by cycle.sort_order, cycle.code;
```

### Q-DAT-004: currently visible news for a fresh user

```sql
select
  cycle.code as cycle_code,
  count(distinct item.id) as visible_news_items,
  count(distinct item.id) filter (where occurrence.id is not null)
    as canonical_accepted_news_items
from public.fp_cycles cycle
left join public.radar_items item
  on cycle.code = any(item.target_cycle_codes)
  and item.destination = 'news'
  and item.kind in ('news', 'legal')
  and item.review_status = 'approved'
  and item.withdrawn_at is null
  and (item.expires_at is null or item.expires_at > now())
  and (
    (item.kind = 'news' and coalesce(item.published_at, item.fetched_at) >= now() - interval '7 days')
    or
    (item.kind = 'legal' and coalesce(item.published_at, item.fetched_at) >= now() - interval '30 days')
  )
left join public.radar_content_occurrences occurrence
  on occurrence.legacy_radar_item_id = item.id
  and occurrence.publication_decision = 'accepted'
where cycle.is_active = true
group by cycle.code, cycle.sort_order
order by cycle.sort_order, cycle.code;
```

Do not describe `visible_news_items` as evidence-backed canonical content. Use
`canonical_accepted_news_items` for that narrower claim. If the two values
differ, the final report must explain the retained legacy boundary or omit the
broader value.

### Q-DAT-005: currently publishable courses and events

```sql
with current_revisions as (
  select revision.id, revision.occurrence_id
  from public.radar_content_revisions revision
  inner join public.radar_content_occurrences occurrence
    on occurrence.id = revision.occurrence_id
    and occurrence.current_revision = revision.revision
), targeted as (
  select distinct revision.occurrence_id, target.target_value as cycle_code
  from current_revisions revision
  inner join public.radar_content_targets target on target.revision_id = revision.id
  where target.target_type = 'cycle'
)
select
  targeted.cycle_code,
  entity.destination,
  count(distinct occurrence.id) as publishable_occurrences
from public.radar_content_occurrences occurrence
inner join public.radar_content_entities entity on entity.id = occurrence.entity_id
inner join targeted on targeted.occurrence_id = occurrence.id
where occurrence.publication_decision = 'accepted'
  and entity.destination in ('course', 'event')
  and (
    occurrence.source_lifecycle_status in ('announced', 'registration_open', 'ongoing', 'evergreen', 'postponed')
    or (
      entity.destination = 'course'
      and occurrence.source_lifecycle_status is null
      and coalesce(occurrence.registration_deadline, occurrence.ends_at, occurrence.starts_at) >= now()
    )
    or (
      entity.destination = 'event'
      and occurrence.source_lifecycle_status is null
      and occurrence.starts_at is not null
      and coalesce(occurrence.ends_at, occurrence.starts_at) >= now()
      and (occurrence.registration_deadline is null or occurrence.registration_deadline >= now())
    )
  )
  and (
    entity.destination <> 'event'
    or (
      occurrence.starts_at is not null
      and coalesce(occurrence.ends_at, occurrence.starts_at) >= now()
    )
  )
group by targeted.cycle_code, entity.destination
order by targeted.cycle_code, entity.destination;
```

This query measures the verified catalogue boundary for a fresh user. Saved
historical items remain user-accessible by design but are not counted as
currently publishable opportunities.

### Q-DAT-006: accepted open jobs by cycle

```sql
select
  target.target_value as cycle_code,
  count(distinct job.occurrence_id) as open_verified_jobs
from public.radar_verified_jobs job
inner join public.radar_content_occurrences occurrence on occurrence.id = job.occurrence_id
inner join public.radar_content_entities entity on entity.id = occurrence.entity_id
inner join public.radar_content_targets target
  on target.revision_id = job.current_revision_id
  and target.target_type = 'cycle'
where entity.destination = 'job'
  and occurrence.publication_decision = 'accepted'
  and job.lifecycle = 'open'
  and (job.application_deadline is null or job.application_deadline > now())
group by target.target_value
order by target.target_value;
```

### Q-DAT-007: curated companies by cycle group

```sql
select cycle_group, count(*) as curated_companies
from public.companies
group by cycle_group
order by cycle_group;
```

These rows are a curated company catalogue. They must not be described as open
jobs, verified vacancies or active hiring organisations.

## User validation and impact evidence

Issue #300 defines the final protocol. Every measured impact result must record:

- sample size and cycle distribution;
- participant recruitment and consent boundary;
- exact tasks and success criteria;
- device and environment;
- completion count and denominator;
- timing method where time is reported;
- survey scale and question wording;
- study date and facilitator;
- limitations and missing populations.

If no user study is completed, report the social benefit as `expected` and
base it on delivered product outcomes. Do not convert internal opinions into a
measured satisfaction score.

## Rejection rules

Reject or supersede evidence when:

- it was collected from a moving branch after the final cut-off;
- the command or query cannot be reproduced;
- the population mixes published and candidate content;
- a count includes private user-owned rows without a valid aggregate protocol;
- a screenshot or document contains personal or sensitive data;
- the value conflicts with the final release or production boundary;
- the claim implies causation or user impact that the method does not measure;
- an estimate is presented without inputs, date or uncertainty.

Rejected values remain in issue history when useful for audit, but they do not
appear in the report source.
