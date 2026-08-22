# Production deployment

```mermaid
flowchart TB
    Internet[Internet]
    Caddy["Host Caddy"]

    subgraph Compose["AL-LIO Docker Compose project"]
        Web["al_lio_web\nread-only, non-root"]
        Radar["al_lio_radar\nread-only, single replica"]
        Migrator["al_lio_migrator\nops profile only"]
        Postgres["al_lio_postgres"]
        PgVolume[(al_lio_postgres_data)]
        RadarVolume[(al_lio_radar_data)]
    end

    Internet -->|443| Caddy
    Caddy -->|danicode_web| Web
    Radar -->|HTTPS via danicode_web| Caddy
    Web -->|al_lio_internal| Postgres
    Migrator -->|al_lio_internal| Postgres
    Postgres --> PgVolume
    Radar --> RadarVolume
```

## Deployment rules

- `al_lio_internal` is an internal Docker network.
- Radar is intentionally absent from `al_lio_internal`.
- The migrator starts only through the `ops` profile.
- Web and Radar images use reviewed Git SHAs as tags.
- A web-only release replaces only `al_lio_web`.
- Persistent volumes are backed up independently before a release that can
  affect them.
