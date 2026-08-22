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
X-AL-LIO-Schema-Version: 3
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

## Accepted content

- schema version 3, with `destination` and `semanticKey`;
- at most 100 items per batch;
- `reviewStatus="approved"` only;
- complete reviewer identity, time and reason;
- one or more supported cycle codes;
- canonical and optional registration URLs accepted by the sender policy;
- bounded metadata, never a full article body.

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

## Student filtering

Delivery to PostgreSQL does not make an item visible to every student. News
queries join the authenticated user's profile, require the profile cycle to be
present in `target_cycle_codes`, and accept only current `news` and `legal`
items. Ordinary news remains visible for 72 hours and legal updates for 30
days; saved items remain available. Read and saved state is owned per user in
`radar_item_user_states`.

`course` and `event` destinations are materialised once in the global FP
catalogue. Existing `fp_content_cycle_fit` rows control cycle visibility and
`fp_user_content_state` stores each student's saved, started, completed or
dismissed state without copying the content per user.

Client query parameters cannot grant access to another cycle.

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

The version 3 receiver temporarily accepts signed version 2 batches and derives
the new routing fields. This compatibility must remain until all frozen version
2 outbox batches have either been delivered or intentionally reconciled.

## Secret rotation

`AL_LIO_RADAR_WEBHOOK_SECRET` is shared only by the two services, has at least
32 random characters and is never logged or committed. Rotation requires a
controlled maintenance window or an explicitly implemented dual-secret
transition; changing only one service stops delivery.
