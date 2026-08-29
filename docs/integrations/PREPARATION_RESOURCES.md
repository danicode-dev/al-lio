# Canonical preparation resources

AL-LÍO uses one stable resource identity for the learning player, notes and
per-user progress. Issue #202 extends that identity instead of building a
second catalogue for event preparation.

## Product boundary

Radar discovers and verifies public learning resources. AL-LÍO owns canonical
FP skills, event requirements, Spanish presentation and private progress.
Student identifiers, watch state, notes and readiness totals are never sent to
Radar or included in the Radar learning contract.

The operational handoff is versioned JSON. It carries nested exact resource
identity, revision and many-to-many mappings safely. CSV remains useful for the
bounded #42 manual audit, but is not a runtime source of truth.

## Canonical model

Migration `0014_canonical_preparation_resources` adds:

- exact provider identity, canonical URL, internal deep link, availability,
  source verification and revision fields to `fp_learning_resources`;
- immutable `fp_learning_resource_revisions` snapshots;
- `fp_skill_learning_resources`, linked to the existing `fp_cycle_skills`
  catalogue with `primary`, `alternative` and `extension` roles;
- explicit `fp_learning_coverage_gaps` for missing or obsolete coverage;
- honest completion evidence on private resource and skill progress;
- idempotent Radar learning delivery receipts.

Existing resource IDs are preserved, so notes and progress remain attached.
An unavailable or superseded resource is removed from recommendations but is
not deleted; historical progress remains readable through the stable ID.

## Reliability rules

The event detail queries only mappings and resources whose publication state
is `approved`, availability is `available`, language is Spanish and exact deep
link/verification fields are present. Legacy `fp_content_items.video_url` rows
and the old video JSON never enter this query.

The receiver additionally requires:

- exact 11-character YouTube video identity;
- canonical `https://www.youtube.com/watch?v=<id>` URL;
- a verified channel and timestamp;
- an existing cycle/skill pair from `fp_cycle_skills`;
- a non-empty mapping rationale;
- monotonic immutable Radar revisions;
- an HMAC-authenticated, idempotent delivery.

`AL_LIO_RADAR_LEARNING_INGEST_ENABLED=false` is the safe default. Enabling it
does not make candidates visible: Radar may send only already-approved,
available resources, and AL-LÍO still rejects unknown skills or conflicting
revisions.

## Student progress and readiness

Opening a resource does not complete it. Embedded-player updates can record
observed position and completion. A student can independently mark the
competency as complete; that is stored as `self_declared`, not fabricated watch
time. Existing completions that predate this distinction are labelled
`legacy_unspecified`.

The event detail reports required and recommended competencies separately,
plus distinct started/completed resource counts. It is described as preparation
progress, never as a grade or claim about the student's actual ability.

## #42 migration path

The 120-event backlog remains a controlled curation job:

1. Map each event only to existing `fp_skills` rows through
   `fp_item_competencies`.
2. Classify every legacy video row as `candidate_reverification`, `rejected` or
   an approved mapping with exact provider identity and rationale.
3. Promote only videos whose topic, language, channel, availability and cycle
   mapping have been independently reverified.
4. Import approved decisions into `fp_learning_resources` and
   `fp_skill_learning_resources`; do not retain a second CSV/JSON runtime join.
5. Write missing coverage to `fp_learning_coverage_gaps` for Radar #24. A gap
   is preferable to a generic or weak match.

The audited baseline (98 rows, 40 unique URLs and known indirect mappings)
means there is intentionally no blanket migration to `approved`.

## Activation route

1. Deploy the additive migration and application with learning ingest disabled.
2. Reverify a small set of resources for one skill in each of DAW, DAM, AF,
   TSAF and MP.
3. Review the event detail locally: exact CTA, provider, rationale,
   verification date and isolated user progress.
4. Exchange one signed shadow delivery with Radar and confirm idempotency,
   revision conflicts and unknown-skill rejection.
5. Enable ingestion without yet automating broad channel discovery.
6. Expand trusted sources and competencies only from measured coverage gaps.

Suitable sources are official course/project channels, public education
providers and established instructional publishers whose ownership and
language are verified. Generic YouTube searches, channel homepages, popularity
alone and AI-only mappings are not accepted resources.
