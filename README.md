# AL-LÍO

AL-LÍO es una aplicación web para centralizar tareas, calendario, cursos, hackathons, oportunidades, noticias y enlaces de trabajo en un único panel.

[Demo pública](https://al-lio.danielcode.dev) · [Documentación](docs/) · [Runbook VPS](docs/DEPLOY_VPS.md)

## Estado Actual

- Aplicación Next.js 15 con App Router.
- Dashboard privado con módulos de tareas, calendario, cursos, hackathons, oportunidades, noticias, enlaces y fuentes.
- Persistencia en PostgreSQL propio mediante `pg`.
- Sesión propia firmada en cookie `al_lio_session`.
- Acceso funcional mediante Google OAuth.
- Integración con Google Calendar desde servidor.
- Despliegue preparado para VPS con Docker Compose y Caddy.
- Demo pública activa en `https://al-lio.danielcode.dev`.

El login por email/password todavía no debe documentarse como funcional. La base de datos ya contempla `password_hash`, pero el flujo de producto se cerrará en una PR posterior.

## Producto

El objetivo del producto es ayudar al usuario a convertir información dispersa en acciones concretas:

- qué requiere atención esta semana;
- qué oportunidades o convocatorias encajan con su perfil;
- qué tareas, evidencias o próximos pasos debe registrar.

El proyecto nació como herramienta personal y se está preparando como versión profesional abierta para estudiantes.

## Stack

- Next.js App Router.
- React 19.
- TypeScript.
- Tailwind CSS.
- PostgreSQL propio.
- Google APIs para OAuth y Calendar.
- Zod.
- date-fns.
- lucide-react.
- Docker Compose.
- Caddy.

El runtime actual no usa Supabase Auth ni Supabase Database.

## Instalación Local

Requisitos recomendados:

- Node.js 22 LTS.
- npm.
- Docker Desktop si se usa PostgreSQL sandbox.

```bash
npm ci
npm run dev
```

`npm run dev` ejecuta antes `npm run verify:startup`.

Si Next queda en un estado inconsistente por mezclar `next dev`, `next build` o `next start`, usar:

```bash
npm run dev:clean
```

## Variables de Entorno

Crear `.env.local` a partir de `.env.example`.

Variables principales:

```env
DATABASE_URL=
SESSION_SECRET=
TARGET_USER_EMAIL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_TOKEN_ENCRYPTION_KEY=

INFOJOBS_CLIENT_ID=
INFOJOBS_CLIENT_SECRET=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
JOOBLE_API_KEY=

BASE_URL=
```

Para producción, usar `.env.production.example` como plantilla. No subir `.env`, `.env.local`, dumps ni `migration-artifacts/` a GitHub.

## Base de Datos

Schema principal:

- `infra/postgres/schema.sql`

Sandbox local:

```bash
npm run postgres:sandbox:up
npm run postgres:schema:validate-sandbox
```

Aplicar schema sobre la base configurada en `DATABASE_URL`:

```bash
npm run postgres:setup
```

Importadores disponibles:

```bash
npm run import:opportunities
npm run import:courses
npm run import:hackathons
```

## Verificación

Chequeo mínimo:

```bash
npm run verify:startup
```

Chequeo recomendado antes de PR:

```bash
npm run verify:cheap
```

Validación específica de producción VPS:

```bash
npm run validate:production-deploy
```

Algunos validadores históricos de migración siguen existiendo para contexto y no deben confundirse con el estado final del producto.

## Despliegue

Destino actual:

- VPS propio.
- Docker Compose.
- Contenedor `al_lio_web`.
- Contenedor `al_lio_postgres`.
- Red externa `danicode_web`.
- Caddy como reverse proxy.
- Dominio `https://al-lio.danielcode.dev`.

Guía operativa:

- `docs/DEPLOY_VPS.md`

## Documentación

- `docs/README.md` - índice de documentación actual.
- `docs/01_PRODUCT_SPEC.md` - especificación de producto vigente.
- `docs/02_ARCHITECTURE_AND_STACK.md` - arquitectura actual.
- `docs/DEPLOY_VPS.md` - despliegue VPS.
- `docs/PROJECT_STRUCTURE.md` - estructura del repositorio.

Alias ASCII usado en algunos scripts y checks: `Al-Lio`.

## Licencia

Distribuido bajo licencia [MIT](LICENSE).
