# Social impact, inclusion and economic sustainability

Report-source material for issue #300. This document translates the Aircury
assessment criteria into claims that AL-LIO can support with product evidence,
an explicit validation method and dated operating-cost inputs. It is an
internal source for the final technical report, not a user study result or an
economic audit.

The reviewed source baseline is commit `7caebc7`; the evidence-documentation
parent is `ccaa3f2`. The final delivery release is not frozen. Values that
depend on participants, production content, invoices, provider prices or
owner-operated controls remain `planned` until collected and approved.

## 1. Programme criteria and claim discipline

The supplied Aircury rules value social impact, innovation, inclusion,
positive community benefit, economic viability and execution capacity. They
also require the project to remain operational through at least 31 August
2027. These are evaluation criteria, not evidence that AL-LIO has already
produced a measured social outcome.

This section uses the evidence classes defined in
[`02-evidence-register.md`](02-evidence-register.md):

- **Delivered:** an implemented product or operating mechanism.
- **Internally validated:** a result reproduced by the project team, without
  presenting it as independent user research.
- **Measured:** a dated observation collected with a defined population and
  method.
- **Expected:** a reasoned benefit that has not been measured with users.
- **Planned:** evidence still to be collected from the frozen release, users,
  owner or providers.

Internal implementation checks can support a usability or inclusion mechanism;
they cannot prove student satisfaction, time saved, social causation or WCAG
conformance.

## 2. Problem, intervention and intended outcome

AL-LIO addresses a practical information-fragmentation problem for Higher
Vocational Education students. Tasks, notes, competency preparation, training,
events, employment-oriented information and sector news commonly arrive
through separate tools and sources. The student must decide what applies to
their qualification, whether it is current and what action to take next.

AL-LIO's intervention is a private Spanish-language workspace that combines
personal organisation with reviewed, cycle-specific discovery. Onboarding
records one vocational cycle and academic year; server-side rules then use that
profile to select competencies and eligible content. The product does not claim
to replace teaching staff, official curricula, accreditation, an LMS or an
automatic academic adviser.

### Impact model

| Student problem | Delivered intervention | Immediate product outcome | Expected social contribution | Final evidence needed |
|---|---|---|---|---|
| Relevant information is dispersed across unrelated tools and sources | Dashboard, tasks, Calendar and Bloc bring private planning into one workspace | The student can record commitments and return to persisted context | Lower coordination effort and a clearer next action | `IMP-001` task completion, timing and perceived clarity |
| Generic catalogues do not explain relevance to a qualification | Mandatory cycle/year onboarding and server-side cycle filtering | Competencies and eligible content are narrowed to the selected cycle | Less irrelevant searching and better visibility of applicable resources | `IMP-001` relevance score plus final `DAT-*` coverage by cycle |
| External opportunities can be stale, ambiguous or difficult to trust | Reviewed content, source context, lifecycle rules and withdrawal controls | The student sees the official source and a bounded current catalogue | Better-informed discovery without presenting AL-LIO as the official authority | `IMP-001` source-understanding task and final governance evidence |
| Learning activity and preparation progress are easy to lose between sessions | Competency route, approved resources, private progress and notes | The student can resume a learning step and preserve their own state | Greater continuity in self-directed preparation | `IMP-001` resume/progress scenario; no learning-effect claim without a separate study |
| Mobile access can lose navigation or information hierarchy | Device-width layout and equivalent mobile navigation | Core destinations remain reachable on a phone-sized interface | More practical access for students who do not work only from a desktop | Owner mobile smoke evidence and participant observation |

The first four columns explain a plausible causal path. Only the immediate
product outcomes are supported by the delivered implementation. The social
contributions remain `expected` until the validation protocol produces usable
evidence.

## 3. Audience and relevance boundary

The reviewed catalogue supports five active cycle codes: `DAW`, `DAM`, `AF`,
`TSAF` and `MP`. They span application development, administration and finance,
marketing and advertising, and physical-activity-related study. `DAW` and
`DAM` share a development company group but retain separate competency and
exact-cycle content mappings.

This breadth is relevant to inclusion because the product is not restricted to
software students. It is not evidence of equal usefulness. Final content
counts and learning-resource coverage must be reported per cycle using
`DAT-001`–`DAT-007`; a single overall total could conceal an underserved cycle.
Support for any qualification outside the five active codes is excluded.

The repository currently contains conflicting long-form labels for `TSAF`.
Until the product source and report terminology are reconciled, this document
uses the stable code and does not infer a public expansion.

## 4. Inclusion and accessibility assessment

### 4.1 Implemented considerations

| Dimension | Evidence in the reviewed source | Defensible statement | Residual validation |
|---|---|---|---|
| Vocational breadth | Five active cycle codes, exact cycle-to-skill mappings and grouped company catalogues | AL-LIO implements distinct relevance paths for five supported cycles | Measure final catalogue and resource coverage separately for every cycle |
| Language and context | Spanish student interface and Spanish-audience content rules | The primary experience is designed for Spanish-speaking vocational students | Assess clarity with users; do not claim plain-language conformance without review |
| Mobile access | Device-width viewport, mobile navigation and responsive layout contracts | The reviewed source provides mobile-specific navigation and responsive structures | Owner smoke test and user observation on representative phone dimensions |
| Keyboard and focus | Focus-visible controls, labelled menus/dialogues, keyboard handling and focus return in key navigation components | Important shared controls include keyboard and focus mechanisms | Manual keyboard journey and assistive-technology review across complete flows |
| Reduced motion | Reduced-motion handling in navigation, onboarding and animated marketing/dashboard elements | Several motion-heavy surfaces respect the system preference | Audit remaining transitions; do not generalise to every component without testing |
| Semantic labelling | Headings, `aria` labels/states, listbox, toolbar, menu and dialog roles in shared and feature components | The implementation contains screen-reader-oriented semantics in important controls | Screen-reader testing is still required |
| Feedback channel | Public accessibility statement and support contact | Users have a published route for reporting barriers | Confirm ownership and response process through issue #299 |

The project targets WCAG 2.1 level AA, but no complete independent or
end-to-end accessibility audit has been recorded for the final release.
Therefore the report may describe implemented considerations and known gaps;
it must not claim WCAG conformance.

### 4.2 Exclusion and bias risks

| Risk | Consequence | Current mitigation | Evidence or action still required |
|---|---|---|---|
| Uneven external-source coverage across cycles | Some students may receive fewer learning resources, news or opportunities | Cycle-specific queries make the gap observable rather than substituting unrelated content | Publish per-cycle `DAT-*` coverage and disclose gaps |
| Source-selection bias | Reviewed sources may overrepresent particular sectors, organisations or locations | Approved-source boundary, provenance, human review and withdrawal | Periodic source-diversity review with date, reviewer and underserved cycles |
| Human-review bias | Editorial judgement can reject or classify content inconsistently | Reviewer identity/reason and auditable candidate lifecycle | Sample review decisions and document correction/escalation practice without personal data |
| Dependence on external services | Calendar, email or source outages can reduce optional capabilities | AL-LIO-owned data remains separate; optional integrations fail without invalidating private product state | Provider fallback and incident ownership from issues #299 and `ECO-002` |
| Digital-access constraints | A web product still requires a suitable device and connectivity | Responsive interface and no mandatory Calendar connection | Test on constrained mobile conditions; do not claim offline support |
| Accessibility defects outside shared controls | A component-level mechanism may not produce an accessible full journey | Public feedback channel and several structural tests | Manual keyboard, zoom, contrast and screen-reader audit |
| Profile-based filtering | A wrong or outdated cycle selection can hide useful content | Profile allows the student to change cycle/year; server applies one consistent boundary | Validate that users understand the active profile and its effect |
| Small or convenient study sample | Positive feedback may not generalise to the supported population | Report recruitment, cycle distribution and missing populations | Keep findings descriptive; do not claim representativeness or causation |

## 5. Privacy-safe user-validation protocol

This protocol may be run after the candidate release is stable. It is optional:
if no valid study is completed, `IMP-001` remains `planned` and the report uses
only the expected-impact reasoning in `IMP-002`.

### 5.1 Study record

Before starting, create a private dated study record containing:

- candidate release tag and commit SHA;
- study date, environment and facilitator;
- recruitment method, consent wording and inclusion/exclusion criteria;
- participant count and distribution across the five cycle codes;
- device category and relevant accessibility needs, recorded only at a safe
  aggregate level;
- exact task wording, success criteria, timing rule and survey scale;
- missing cycle groups or other limitations.

Do not set a target that is later presented as statistically representative.
Recruitment should seek coverage across the five supported cycles; any missing
cycle is a limitation, not a zero-result cohort.

### 5.2 Task scenarios and success criteria

| Scenario | Participant instruction | Completion rule | Observation |
|---|---|---|---|
| Personalisation and next action | Select the supplied fictional cycle/year profile, enter the workspace and identify the next relevant action | Correct profile saved and one relevant next action identified without facilitator intervention | Completion, time, wrong turns, understanding of active cycle |
| Competency preparation | Find a named competency for that fictional cycle, open an approved resource and preserve fictional progress or a note | Correct cycle competency/resource reached and state remains available on return | Completion, time, source/relevance comprehension, navigation barriers |
| Trustworthy discovery | Find one current news item or opportunity relevant to the fictional profile and identify its source and intended action | Correct item and official source/action identified without crossing into another cycle | Completion, time, confidence explanation, stale/ambiguous labels |
| Personal planning | Create a fictional task with a date, mark it complete and locate the resulting state | The same fictional record persists through the defined journey | Completion, time, form and status clarity |
| Mobile continuity | Repeat one assigned core scenario at the agreed mobile viewport or device | Core destination and action remain reachable with no blocked interaction | Navigation, zoom, target size, keyboard/focus and layout observations |

Use purpose-built fictional accounts and records. Calendar consent is not
required for the study; if tested, use a dedicated non-personal Google account
and record it only as an optional integration scenario.

### 5.3 Metrics and questions

- **Task completion rate:** completed scenarios divided by attempted scenarios,
  always accompanied by both numerator and denominator.
- **Time to find:** elapsed time from the task instruction to the defined
  completion event. Report median and range only when the sample supports them;
  never interpret speed alone as learning or social impact.
- **Perceived relevance:** “The information shown was relevant to the supplied
  vocational-cycle profile”, on a declared five-point agreement scale.
- **Clarity:** “I understood why this information or action appeared”, using
  the same scale.
- **Ease of use:** “I could complete the task without unnecessary steps”, using
  the same scale.
- **Open feedback:** one barrier, one useful element and one suggested
  improvement, with explicit permission before any anonymised paraphrase is
  published.

Record accessibility or mobile observations as observed barriers, not medical
or diagnostic information. Never infer disability status.

### 5.4 Privacy and reporting boundary

- Assign study codes; do not place names, email addresses, account identifiers,
  recordings or raw responses in Git or the public report.
- Obtain explicit consent for participation and for any anonymised quotation or
  paraphrase. Declining publication must not prevent participation.
- Keep the mapping between a person and a study code outside the project
  repository, access-restricted and only as long as necessary.
- Publish aggregate results only. Suppress or combine breakdowns that could
  identify a participant, especially a cycle represented by very few people.
- Report withdrawals, failed tasks, missing data and facilitator assistance;
  do not silently remove them to improve the result.

### 5.5 Result record to complete later

| Field | Required value | Current status |
|---|---|---|
| Release and environment | Immutable AL-LIO release; production-like or production boundary stated | Planned |
| Date and facilitator | Exact date and responsible person | Planned |
| Sample | Count, recruitment and cycle distribution | Planned |
| Task results | Completed/attempted and timing method per scenario | Planned |
| Perception results | Exact questions, scale, response count and aggregate | Planned |
| Mobile/accessibility observations | Anonymised barriers and tested environment | Planned |
| Limitations | Missing populations, assistance, environment and sample constraints | Planned |
| Consent/privacy review | Confirmation that public outputs contain no personal data | Planned |

## 6. Innovation without unsupported uniqueness claims

The defensible innovation claim is the combination of:

1. one private workflow connecting planning, competency preparation and
   reviewed opportunity discovery;
2. deterministic relevance derived from a vocational-cycle profile rather
   than generic popularity or an opaque recommendation score;
3. a separate Radar collection/review boundary that cannot read student data;
4. human approval, source context, lifecycle and withdrawal controls before
   external content reaches the student experience;
5. preservation of private student progress independently from changes to the
   shared catalogue.

This describes AL-LIO's product and governance model. It does not claim that no
other product uses similar functions, that AL-LIO is unique in the market or
that the model is more effective without comparative evidence.

## 7. Economic sustainability through 31 August 2027

AL-LIO uses a single-VPS architecture with Docker Compose, PostgreSQL and a
separate Radar process. The repository defines health, deployment, backup,
restore and rollback mechanisms, but it does not contain invoices, subscription
prices, an off-host-storage contract or the owner's allocation of shared VPS
costs. Those values must come from dated owner/provider evidence.

### 7.1 Cost inventory

| Cost component | Current technical boundary | Evidence required | Current monthly cost | Projection through 31 August 2027 | Variability or fallback |
|---|---|---|---|---|---|
| VPS compute | Shared single VPS running the web, PostgreSQL and Radar containers | Dated invoice and documented AL-LIO allocation method if the host is shared | Pending owner input | Pending | Resource monitoring; resize or migrate using the documented container boundary |
| Primary domain (`al-lio.app`) | Canonical public domain | Registrar invoice, renewal date and tax treatment | Pending owner input | Pending | Transfer to another registrar or preserve a documented replacement domain |
| Transactional email | Provider-backed registration/recovery messages when configured | Current plan, included quota, actual usage and overage terms | Pending owner input | Pending | Change provider behind the mail boundary; preserve generic failure behaviour |
| External monitoring | Must observe health/readiness outside the VPS failure boundary | Provider plan and configured probe/alert evidence | Pending owner input | Pending | Alternative probe provider or owner-operated external monitor |
| Encrypted off-host backup | PostgreSQL and Radar copies outside the VPS/provider failure boundary | Storage invoice, retention, estimated volume and restore/egress assumptions | Pending owner input | Pending | Compatible object/file storage with verified restore rehearsal |
| Google identity and optional Calendar | External OAuth/API dependency | Dated provider terms and any applicable quota/billing configuration | Pending verification | Pending | Password access for eligible accounts; local planning remains independent of Calendar |
| Source access and other external services | Approved public sources used by Radar | Provider terms and any paid-access commitment | Pending verification | Pending | Disable affected source; retain reviewed catalogue and add an approved replacement |

Do not label a service “free” because the repository contains no payment key or
because current usage is below a quota. Record a zero value only when dated
provider evidence and the applicable usage assumptions support it.

### 7.2 Calculation method

For `ECO-001`, record all values in EUR and state whether VAT is included.
Separate:

- recurring monthly charges;
- annual charges and their renewal dates (show both the cash payment and a
  monthly equivalent for comparison);
- usage-based estimates with volume and unit-price assumptions;
- one-off costs, which must not be disguised as monthly recurring costs;
- shared-infrastructure allocation, including the allocation rule;
- maintenance effort in hours, reported separately from cash expenditure
  unless an explicit hourly valuation is approved.

The projection must cover the period from the final delivery cut-off through
31 August 2027. For each month, use the price known at the evidence date and
identify renewal, promotional-price expiry, tax, exchange-rate or usage risk.
The total is an estimate, not a guarantee.

### 7.3 Maintenance and fallback ownership

| Responsibility | Minimum sustainable activity | Owner | Evidence/status |
|---|---|---|---|
| Hosting and domain | Renew services, monitor capacity and keep canonical DNS/TLS operational | Pending owner confirmation | Issue #299 operational plan |
| Monitoring and incidents | Receive external alerts, triage impact, record resolution and escalate repeated failures | Pending owner confirmation | Provider/recipient configuration pending |
| Backup and recovery | Run scheduled encrypted off-host backups and recurring isolated restore rehearsals | Pending owner confirmation | Final dated evidence owned by #299 |
| Dependency and security maintenance | Review supported updates and security advisories on an agreed cadence; validate before release | Pending owner confirmation | Cadence and maintenance log pending |
| Editorial maintenance | Review sources/candidates, withdrawals, expiry and per-cycle coverage | Pending owner confirmation | Review/outbox records and coverage checks |
| Release and rollback | Approve releases, retain immutable references and choose rollback versus restore | Pending owner confirmation | Final release record owned by #299 |
| User and accessibility feedback | Receive support/accessibility reports, prioritise barriers and document material fixes | Pending owner confirmation | Public contact exists; response target pending |

Execution capacity is supported by the repository's modular application,
automated checks, versioned migrations, container deployment and documented
recovery paths. Continued operation still depends on named human ownership,
funded services and exercised controls; a runbook alone is not proof that those
responsibilities are active.

## 8. Evidence catalogue

These IDs are stable within the report source. The final integration task must
add new IDs to the consolidated register without renumbering them.

| Evidence ID | Claim | Class | Primary source or method | Publication boundary | Status |
|---|---|---|---|---|---|
| `IMP-001` | Student task completion, time, perceived relevance, clarity and ease | measured | Protocol in section 5; consented aggregate results | Aggregate only | Planned; no study result claimed |
| `IMP-002` | Intended social benefit follows from reducing fragmented work into cycle-relevant next actions | expected | Product specification; `PRD-003`–`PRD-017`; impact model in section 2 | Public | Collected as reasoned expected impact |
| `IMP-003` | Mobile, keyboard, focus, reduced-motion and semantic mechanisms exist, without claiming full accessibility conformance | internally validated mechanism | Shared UI source, accessibility statement and structural tests | Public summary | Collected; manual accessibility review pending |
| `IMP-004` | Inclusion risks and unequal cycle coverage are explicitly assessed rather than hidden by a total | expected plus measured coverage | Risk register; `DAT-001`–`DAT-007` | Public summary/aggregate | Risk model collected; final coverage planned |
| `ECO-001` | Current and projected operating cost through 31 August 2027 | measured or estimated | Dated invoices/provider prices and section 7 calculation method | Aggregate only | Planned owner input |
| `ECO-002` | Maintenance responsibilities and provider fallbacks support continued operation | delivered plan plus owner-confirmed operation | Operations documentation and section 7.3 | Public summary | Mechanisms documented; owners and operating evidence planned |

## 9. Extraction boundary for the final PDF

The final technical report should contain:

- a concise statement of the student problem and AL-LIO's intended outcome;
- the five-cycle relevance model and the fact that coverage is assessed per
  cycle;
- a compact impact chain or a few concrete product-to-outcome examples;
- measured validation results only if `IMP-001` is completed with its method,
  sample and limitations;
- a short inclusion/accessibility assessment with honest gaps;
- the combined current and projected operating cost, dated assumptions and the
  maintenance commitment through 31 August 2027;
- a concise explanation of the integrated product/governance innovation,
  without a market-uniqueness claim.

Do not copy the full study script, raw responses, participant-level data,
repository paths, test names, invoice details, provider account information,
monthly calculation workbook or complete risk/evidence tables into the PDF.
If no study is completed, say explicitly that impact is expected and has not
been measured with users. A missing measurement must never be replaced by
generic testimonials or internal team opinion.

## Open items for owner and final integration

- Decide whether the privacy-safe validation protocol will be run. If not,
  retain only the `expected` impact claim.
- Reconcile the public long-form `TSAF` name before the PDF.
- Supply dated, redacted cost evidence, VAT treatment, shared-host allocation
  and renewal dates for `ECO-001`.
- Confirm named maintenance owners, cadence and provider fallbacks with issue
  #299; do not duplicate its final operational evidence here.
- Collect per-cycle `DAT-*` values from the frozen release before describing
  content breadth or equity.
- Add `IMP-003`, `IMP-004` and `ECO-002` to
  [`02-evidence-register.md`](02-evidence-register.md) during final integration.
- Change the report README status for this file only during the integration
  task, avoiding conflicts with parallel documentation branches.
