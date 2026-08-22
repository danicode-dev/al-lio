# Radar delivery sequence

```mermaid
sequenceDiagram
    participant Source as Approved source
    participant Radar as AL-LIO Radar
    participant Reviewer as Human reviewer
    participant API as AL-LIO webhook
    participant DB as PostgreSQL
    participant Student as Authenticated student

    Radar->>Source: Bounded fetch
    Source-->>Radar: Public metadata
    Radar->>Radar: Validate, normalise, deduplicate and classify
    Radar->>Reviewer: Candidate with matched rules
    Reviewer-->>Radar: Approve with actor and reason
    Radar->>Radar: Freeze persistent delivery batch
    Radar->>API: POST schema v2 + HMAC + timestamp + delivery ID
    API->>API: Verify size, schema, replay window and signature
    API->>DB: Transactional delivery and item upsert
    DB-->>API: Commit
    API-->>Radar: 2xx
    Radar->>Radar: Confirm batch and mark items delivered
    Student->>API: Request news with signed session
    API->>DB: Filter by profile cycle and expiry
    DB-->>Student: Approved cycle-specific items
```

## Failure behaviour

- Fetch or classification failure cannot create a published item.
- Pending and rejected candidates are never selected for an outbound batch.
- A non-2xx response leaves the exact frozen batch pending for retry.
- Reusing a successful delivery identifier does not duplicate data.
- A user cannot request another cycle's feed through a client-side filter; the
  profile filter is applied in the server query.
