# Documentación

Esta carpeta separa documentación vigente de documentación histórica.

## Fuente Actual

- `../README.md` - portada del proyecto y setup rápido.
- `01_PRODUCT_SPEC.md` - estado funcional y alcance actual.
- `03_ARCHITECTURE_AND_STACK.md` - arquitectura runtime vigente.
- `06_INTEGRATIONS_AND_DEEPLINKS.md` - criterio de integraciones y enlaces externos.
- `07_SEED_HACKATHONS.md` - referencia de hackathons semilla.
- `DEPLOY_VPS.md` - operación en VPS.
- `PROJECT_STRUCTURE.md` - mapa del repositorio.

## Archivo Histórico

- `archive/` contiene planes, auditorías y migraciones anteriores.
- Los documentos archivados pueden ser útiles para entender decisiones pasadas, pero no deben presentarse como estado actual.

## Criterio

La documentación activa debe reflejar el proyecto que realmente existe hoy:

- Next.js App Router.
- PostgreSQL propio.
- Sesión propia.
- Google OAuth.
- Docker Compose en VPS.
- Caddy como reverse proxy.

Los planes de candidatura, roadmap Aircury, fixtures finales, BDD y login email/password deben documentarse en PRs posteriores cuando se implementen o se apruebe su alcance.
