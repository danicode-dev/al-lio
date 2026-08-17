# Project Structure

## Aplicación

Código de la aplicación bajo `src/` (convención oficial de Next.js):

- `src/app/` - rutas App Router, layouts y route handlers.
- `src/components/` - componentes React y vistas de producto.
- `src/lib/` - autenticación, acceso a datos, integraciones, noticias y utilidades.
- `src/middleware.ts` - protección de rutas y sesión.
- `public/` - assets públicos servidos por Next.js (fuera de `src/`, también por convención de Next.js).

## Datos

- `infra/postgres/schema.sql` - schema PostgreSQL actual.
- `infra/postgres/migrations/0002_radar_news.sql` - persistencia de entregas, noticias y estado por usuario de AL-LÍO Radar.
- `csv/` - fuentes CSV para importadores.
- `data/` - copia legacy conservada solo como respaldo; `/api/news` usa PostgreSQL.

## Operaciones

- `infra/` - Dockerfile, Docker Compose, Caddy y PostgreSQL.
- `scripts/` - validaciones, importadores y utilidades operativas.
- `.env.example` - plantilla local.
- `.env.production.example` - plantilla de producción.
- `README.md` - portada humana del proyecto.
- `docs/` - documentación activa.

## No Committing

No subir:

- `.env`
- `.env.local`
- `.next/`
- `node_modules/`
- `migration-artifacts/`
- dumps de base de datos;
- logs temporales;
- prompts o notas privadas dentro de `public/`;
- guías operativas para asistentes de IA (`AGENTS.md`, `CLAUDE.md`) - existen en local para quien desarrolle con asistencia de IA, pero no forman parte del repositorio público.

## Regla De Limpieza

Si un documento describe Supabase, Vercel, Aidraft o TechLife como estado actual, debe actualizarse o retirarse del repositorio antes de aparecer enlazado desde README.
