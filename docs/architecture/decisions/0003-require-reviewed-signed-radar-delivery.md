# ADR-0003: Require reviewed, signed Radar delivery

**Status:** Accepted

## Context

Source trust alone cannot prevent irrelevant items. Network retries can also
duplicate a successful batch, and a public endpoint must not accept an
unauthenticated publisher.

## Decision

Require deterministic per-item routing plus human approval before delivery.
Radar freezes approved items into a persistent batch and signs each request
with HMAC-SHA256 over the timestamp, delivery identifier and raw body. AL-LIO
enforces a five-minute replay window, schema version 3, transactional ingestion,
explicit content destinations and delivery/item idempotency.

## Consequences

- No currently enabled source can publish without an auditable reviewer.
- A restart or network failure does not regenerate a different pending batch.
- AL-LIO can reject stale, malformed, unsigned or conflicting deliveries.
- Editorial throughput is intentionally lower than automatic publication.
- Both services must rotate the shared secret together.

## Evidence

- `src/lib/radar/contract.ts`
- `src/lib/radar/webhook-auth.ts`
- `src/app/api/radar/v1/ingest/route.ts`
- Radar `src/delivery/outbox.ts`
- Radar `docs/SOURCE_GOVERNANCE.md`
