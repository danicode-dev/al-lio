# Documentación

Esta carpeta contiene la documentación vigente del proyecto. No incluye
planes, auditorías o migraciones ya completadas — esas quedan fuera del
repositorio una vez terminadas, para que lo que hay aquí sea siempre el
estado real y actual.

## Índice

- `../README.md` - portada del proyecto y setup rápido.
- `01_PRODUCT_SPEC.md` - estado funcional y alcance actual.
- `02_ARCHITECTURE_AND_STACK.md` - arquitectura runtime vigente.
- `03_INTEGRATIONS_AND_DEEPLINKS.md` - criterio de integraciones y enlaces externos.
- `04_SEED_HACKATHONS.md` - referencia de hackathons semilla.
- `DEPLOY_VPS.md` - operación en VPS.
- `PRODUCTION_READINESS.md` - checklist de seguridad, recuperación y optimización.
- `PROJECT_STRUCTURE.md` - mapa del repositorio.

## Criterio

La documentación activa debe reflejar el proyecto que realmente existe hoy:

- Next.js App Router.
- PostgreSQL propio.
- Sesión propia.
- Google OAuth.
- Docker Compose en VPS.
- Caddy como reverse proxy.

Los planes de candidatura, roadmap Aircury, fixtures finales, BDD y login email/password deben documentarse en PRs posteriores cuando se implementen o se apruebe su alcance.
