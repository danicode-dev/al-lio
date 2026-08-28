# AL-LIO Radar integration

This document describes the application side of the Radar contract. The sender
keeps the matching contract in its own repository.

## Boundary

Radar never connects to AL-LIO PostgreSQL and never receives student sessions.
It sends approved metadata to:

```http
POST /api/radar/v1/ingest
```

The authoritative receiver implementation is:

- `src/app/api/radar/v1/ingest/route.ts`;
- `src/lib/radar/contract.ts`;
- `src/lib/radar/webhook-auth.ts`;
- `src/lib/db/repositories/radar.ts`.

## Authentication

Required headers:

```http
X-AL-LIO-Schema-Version: <2 | 3 | 4>
X-AL-LIO-Delivery-Id: <uuid>
X-AL-LIO-Timestamp: <ISO-8601 UTC timestamp>
X-AL-LIO-Signature: v1=<HMAC-SHA256 hex digest>
```

The signing input is:

```text
<timestamp>.<deliveryId>.<rawRequestBody>
```

AL-LIO rejects an unsupported schema, missing header, invalid signature,
timestamp outside the five-minute replay window or body larger than the
receiver limit. Signature comparison is constant-time.

The same boundary accepts versions 2, 3 and 4. Version 2 is normalized to the
strict v3 compatibility model. Version 4 is validated before any database
write: a present source fact must be `verified` and carry field-level evidence
whose value hash matches the fact. Derived public copy must declare its source
fields and generation method. A malformed item rejects the entire delivery.

## Accepted content

- schema version 3, with `destination` and `semanticKey`;
- schema version 4, with stable entity/occurrence/revision identity, typed
  facts, observation states, bounded evidence and derived provenance;
- at most 100 items per batch;
- `reviewStatus="approved"` only;
- complete reviewer identity, time and reason;
- one or more supported cycle codes;
- canonical and optional registration URLs accepted by the sender policy;
- bounded metadata, never a full article body.

An accepted v4 course requires a verified title, short summary and provider.
An accepted event additionally requires a verified organizer and start time.
Accepted news requires a verified title/short summary plus the objective source
publication time. All other display facts are optional: absence remains `null`
or an empty list and must disappear from the eventual UI rather than becoming
placeholder copy.

## Version 4 canonical storage

PostgreSQL, not a committed JSON/CSV file, is the runtime source of truth:

| Concern | Canonical storage |
| --- | --- |
| Stable content | `radar_content_entities` |
| Source edition/occurrence | `radar_content_occurrences` |
| Immutable material history | `radar_content_revisions` |
| Last-known-good facts | `radar_content_current_facts` plus typed occurrence columns |
| Field provenance | `radar_content_field_evidence` |
| Cycle/module/topic/skill targeting | `radar_content_targets` |
| Dedupe corrections | `radar_content_identity_aliases` |
| Delivery/revision idempotency | `radar_delivery_revisions` |
| Authority conflicts | `radar_content_conflicts` |
| Safe operational outcomes | `radar_ingest_events`, `radar_projector_events` |

`payload_snapshot` is an immutable, bounded v4 transport snapshot for audit. It
is not queried as the application model. Filtering, lifecycle, identity,
revision, evidence rank and compatibility relationships use typed columns and
relations.

`fp_content_items` and `radar_items` remain compatibility projections while
the course/event/news pages migrate. They are not the only copy of v4 facts.
Existing catalogue rows are reused by `legacySemanticKey`, so their stable UUID
and `fp_user_content_state` favourites/progress survive a v4 correction.
Identity aliases resolve old entity/occurrence keys to the same canonical row;
new URLs, titles and material revisions therefore do not create new student
state.

## State and evidence rules

The following domains are structurally independent:

- `publicationDecision`: Radar/system decision (`accepted`, `rejected`,
  `quarantined`);
- `sourceLifecycleStatus`: objective source state such as
  `registration_open`, `completed` or `cancelled`;
- `rankingPriority`: internal 0–100 relevance signal;
- AL-LÍO user state: read/saved/started/completed/task/application state.

The database check constraints reject values crossing these domains. Priority
is only converted to an internal legacy sort score; it is never a public fact.
Source lifecycle is only mapped when the old catalogue has an exact equivalent.

`not_stated`, `extraction_failed` and `source_unavailable` never erase a
last-known-good verified fact. `verified_removed` may clear a value only with
matching evidence. A different value from equal or weaker authority retains
the last-known-good value, records a conflict and quarantines compatibility
projection. Higher authority may replace it while retaining the conflict audit.

## Transaction and idempotency

AL-LIO processes the delivery record, item upserts and delivery-item links in a
single PostgreSQL transaction.

- `delivery_id` prevents batch replay.
- `payload_hash` detects reuse of an identifier with different content.
- `(source_id, canonical_url)` prevents item duplication.
- `semantic_key` prevents the same course or event appearing twice across sources.
- A repeated successful delivery returns 200 without reprocessing.
- A conflicting delivery identifier returns 409.
- A transient database failure returns 5xx so Radar retains and retries the
  frozen batch.

V4 material revisions are additionally idempotent by
`(occurrence_id, revision)` and material fingerprint. Reusing either identity
inconsistently returns 409 and rolls back the whole delivery.

## Student filtering

Delivery to PostgreSQL does not make an item visible to every student. News
queries join the authenticated user's profile, require the profile cycle to be
present in `target_cycle_codes`, and accept only current `news` and `legal`
items. Ordinary news remains visible for 7 days and legal updates for 30
days; saved items remain available. Read and saved state is owned per user in
`radar_item_user_states`.

`course` and `event` destinations are materialised once in the global FP
catalogue. Existing `fp_content_cycle_fit` rows control cycle visibility and
`fp_user_content_state` stores each student's saved, started, completed or
dismissed state without copying the content per user.

Client query parameters cannot grant access to another cycle.

`GET /api/news/[id]` applies the identical boundary to a single item, plus one
extension: a saved item stays reachable after it ages out of the current
window, the same way it does in the saved-archive list view. An id that does
not exist, does not match the caller's cycle, or is not a `news`/`legal`
destination all produce the same generic not-found response — the endpoint
never reveals which case applies.

Marking an item read or saved applies the same boundary before the first
write: an item the caller has not already saved can only be touched while it
is still live; once saved, it stays mutable regardless of freshness. Status
transitions are monotonic — a read request can never downgrade a saved item
back to read, including one that lands after a save request completes.

## Deployment order

When the contract changes:

1. add backward-compatible receiver support;
2. validate receiver and sender contracts together;
3. deploy the receiver;
4. verify health and readiness;
5. deploy the sender;
6. approve one controlled item and verify idempotent delivery.

A breaking contract requires a new schema version. Do not deploy a sender that
the current receiver cannot parse.

The v4 receiver stores canonical content immediately but its compatibility
projectors are disabled by default. `AL_LIO_RADAR_V4_PROJECT_DESTINATIONS` is a
comma-separated allow-list (`news`, `course`, `event`). Roll out one reviewed
vertical at a time only after its exact fixtures pass in both repositories.
Clearing the variable rolls projection back without deleting received facts,
evidence or revisions. The future `job` contract can be stored, but AL-LÍO
rejects enabling a job projector until issue #203 supplies that consumer.

The version 3 receiver temporarily accepts signed version 2 batches and derives
the new routing fields. This compatibility must remain until all frozen version
2 outbox batches have either been delivered or intentionally reconciled.

JSON is the transport and contract-fixture format. CSV is restricted to legacy
seed/import workflows; imported rows require re-verification and are not
publication approval.

## Secret rotation

`AL_LIO_RADAR_WEBHOOK_SECRET` is shared only by the two services, has at least
32 random characters and is never logged or committed. Rotation requires a
controlled maintenance window or an explicitly implemented dual-secret
transition; changing only one service stops delivery.
