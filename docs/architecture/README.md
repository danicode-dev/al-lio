# AL-LIO architecture

AL-LIO is deployed as a small set of explicit trust boundaries rather than a
single process with access to everything.

## Architecture goals

- Keep student data inside the application database boundary.
- Keep untrusted source fetching outside the student application.
- Require deterministic classification and human review before publication.
- Make database evolution explicit, transactional and recoverable.
- Allow a web-only release without touching Radar or PostgreSQL.
- Preserve a Spanish product while using English engineering artefacts.

## System components

| Component | Responsibility | Must not do |
|---|---|---|
| Browser | Render the Spanish UI and initiate user actions. | Access PostgreSQL or Radar directly. |
| Caddy | Terminate public HTTPS and route to the web container. | Hold application data. |
| AL-LIO web | Authentication, authorisation, UI, API, integrations and user-owned state. | Fetch arbitrary news sources. |
| PostgreSQL | Authoritative application, profile and delivered-content state. | Accept direct connections from Radar. |
| AL-LIO Radar | Collect, classify, review and deliver bounded source metadata. | Receive sessions or read student data. |
| Google APIs | Provide verified OAuth identity and optional Calendar access. | Become AL-LIO's application database. |

## Trust boundaries

### Public browser boundary

Every private page requires a valid signed session. Client input is untrusted
and ownership checks remain server-side. The browser never receives database
credentials, webhook secrets or raw Google client secrets.

### Application database boundary

The web service connects through the restricted `al_lio_app` role. Schema
changes use a separate migration URL available only to the operational
migrator. Radar has no membership in the internal database network.

### External-source boundary

Radar treats feeds and HTML as untrusted. It applies host allowlists, redirect
checks, content limits, deterministic routing, expiry and manual approval. A
trusted organisation does not make every item safe or relevant.

### Service-delivery boundary

Radar sends only approved metadata to the public application endpoint. The
application verifies HMAC, timestamp, delivery identity and schema before a
single PostgreSQL transaction. A delivery replay cannot duplicate items.

### Google boundary

OAuth state is validated and tokens are encrypted before storage in the
protected application cookie boundary. Google Calendar is optional; its
failure does not invalidate AL-LIO-owned data.

## Data ownership

| Data | Authoritative owner |
|---|---|
| User identity, role and profile | AL-LIO PostgreSQL |
| Tasks, notes and local calendar state | AL-LIO PostgreSQL |
| Learning progress and notes | AL-LIO PostgreSQL |
| Delivered news and per-user state | AL-LIO PostgreSQL |
| Source catalogue and routing rules | Radar Git repository |
| Pending review queue and outbound batches | Radar SQLite volume |
| OAuth provider data | Google; AL-LIO stores only required token material |

Legacy JSON news files are not a production source of truth.

## Runtime reference

- [`ARCHITECTURE_AND_STACK.md`](ARCHITECTURE_AND_STACK.md): the concise
  runtime view (services, ports, processes and where each concern lives).

## Diagrams

- [`diagrams/system-context.md`](diagrams/system-context.md): users, services and external systems.
- [`diagrams/production-deployment.md`](diagrams/production-deployment.md): containers, networks and volumes.
- [`diagrams/radar-delivery.md`](diagrams/radar-delivery.md): reviewed-news delivery sequence.

## Decisions

Accepted architecture decisions are indexed in
[`decisions/README.md`](decisions/README.md). A decision record explains why a
boundary exists; the executable configuration and tests remain authoritative.

## Authoritative implementation

- Application topology: `infra/docker-compose.prod.yml`.
- Reverse proxy: `infra/Caddyfile.example` and the separately managed host
  configuration.
- Database baseline and migrations: `infra/postgres/`.
- Authentication: `src/lib/auth/`.
- Google integration: `src/lib/google/`.
- Radar receiver: `src/app/api/radar/v1/ingest/route.ts` and
  `src/lib/radar/`.
- Radar sender: `al-lio-radar/src/delivery/`.

Architecture documentation must not claim that a planned control is already
implemented. Planned work belongs in an issue until executable evidence exists.
