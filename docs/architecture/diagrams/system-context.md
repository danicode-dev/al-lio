# System context

```mermaid
flowchart LR
    Student["Student\nSpanish web interface"]
    Admin["Authorised administrator"]
    Caddy["Caddy\nHTTPS boundary"]
    Web["AL-LIO web\nNext.js"]
    Database[("PostgreSQL\nstudent and product state")]
    Google["Google OAuth and Calendar"]
    Radar["AL-LIO Radar\ncollection and review"]
    Sources["Approved public sources"]
    Reviewer["Human content reviewer"]

    Student -->|HTTPS| Caddy
    Admin -->|HTTPS| Caddy
    Caddy --> Web
    Web -->|restricted role| Database
    Web <-->|OAuth and Calendar API| Google
    Sources -->|bounded public metadata| Radar
    Reviewer -->|approve or reject| Radar
    Radar -->|signed webhook v2| Caddy
```

## Reading the diagram

- Students and administrators enter through the same HTTPS application
  boundary but receive role-appropriate capabilities.
- PostgreSQL is reachable by the web and migrator boundaries, not by Radar.
- Radar receives public source metadata and human editorial decisions, never
  student sessions.
- Google is an optional external integration; PostgreSQL remains the product
  source of truth.
