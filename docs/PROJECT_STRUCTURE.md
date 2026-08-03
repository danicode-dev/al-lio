# Project Structure

## Aplicación

- `app/` - rutas App Router, layouts y route handlers.
- `components/` - componentes React y vistas de producto.
- `lib/` - autenticación, acceso a datos, integraciones, noticias y utilidades.
- `middleware.ts` - protección de rutas y sesión.
- `public/` - assets públicos servidos por Next.js.

## Datos

- `infra/postgres/schema.sql` - schema PostgreSQL actual.
- `csv/` - fuentes CSV para importadores.
- `data/` - caché versionada de noticias usada por `/api/news`.

## Operaciones

- `infra/` - Dockerfile, Docker Compose, Caddy y PostgreSQL.
- `scripts/` - validaciones, importadores, migraciones y utilidades operativas.
- `.env.example` - plantilla local.
- `.env.production.example` - plantilla de producción.
- `AGENTS.md` - guía operativa para agentes.
- `CLAUDE.md` - entrada específica para Claude.
- `README.md` - portada humana del proyecto.
- `docs/` - documentación activa.
- `docs/archive/` - documentación histórica.

## No Committing

No subir:

- `.env`
- `.env.local`
- `.next/`
- `node_modules/`
- `migration-artifacts/`
- dumps de base de datos;
- logs temporales;
- prompts o notas privadas dentro de `public/`.

## Regla De Limpieza

Si un documento describe Supabase, Vercel, Aidraft o TechLife como estado actual, debe moverse a `docs/archive/` o actualizarse antes de aparecer enlazado desde README.
