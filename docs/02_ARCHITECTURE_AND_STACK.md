# Architecture and Stack

## Runtime Actual

- Framework: Next.js 15 App Router.
- Lenguaje: TypeScript.
- UI: componentes React locales con Tailwind CSS.
- Base de datos: PostgreSQL propio.
- Acceso a datos: `pg`.
- Auth actual: sesión propia firmada en cookie `al_lio_session`.
- Login actual: Google OAuth.
- Integraciones: Google Calendar, AL-LÍO Radar mediante webhook HMAC, deep links y APIs de oportunidades cuando hay claves.
- Deploy: VPS con Docker Compose y Caddy.

Supabase ya no es la base de datos ni el sistema de autenticación en runtime.

## Capas Principales

```txt
Browser
  -> Next.js App Router
  -> Route handlers / server actions
  -> lib/auth + lib/db + lib/integrations
  -> PostgreSQL propio
  -> Google APIs cuando aplica

Fuentes permitidas
  -> AL-LÍO Radar (recogida, reglas y revisión humana)
  -> webhook HTTPS firmado
  -> radar_items en PostgreSQL
  -> /api/news filtrado por ciclo del perfil
```

## Carpetas Clave

```txt
app/        rutas, layouts y route handlers
components/ UI y vistas compartidas
lib/        auth, datos, integraciones, news, helpers
infra/      Docker, Caddy y PostgreSQL
scripts/    checks, importadores, migración y operaciones
data/       respaldo legacy sin uso en runtime
csv/        fuentes CSV para importadores
docs/       documentación activa
```

## Rutas Públicas

- `/`
- `/login`
- `/register`
- `/api/health`

## Rutas Privadas

- `/dashboard`
- `/tasks`
- `/bloc`
- `/noticias`
- `/work`
- `/courses`
- `/hackathons`
- `/calendar`
- `/links`
- `/sources`
- `/settings`
- `/more`

## Producción

El despliegue esperado usa:

- `infra/Dockerfile`
- `infra/docker-compose.prod.yml`
- `infra/Caddyfile.example`
- `.env.production.example`
- `docs/DEPLOY_VPS.md`

El contenedor web (`al_lio_web`) se conecta a PostgreSQL (`al_lio_postgres`) y Caddy publica el dominio `https://al-lio.danielcode.dev`. El contenedor separado `al_lio_radar` conserva su propia cola en SQLite y solo entrega elementos aprobados al endpoint firmado de AL-LÍO; nunca escribe directamente en PostgreSQL.
