# AL-LÍO

> Orientación, planificación y seguimiento para estudiantes que necesitan convertir formación, oportunidades y próximos pasos en acciones concretas.

[Demo pública](https://al-lio.danielcode.dev) · [Documentación](docs/) · [Runbook VPS](docs/DEPLOY_VPS.md)

## Estado Actual

AL-LÍO es una aplicación web construida con Next.js para centralizar tareas, calendario, cursos, hackathons, oportunidades, noticias y enlaces de trabajo en un único panel.

El proyecto nació como una herramienta personal, pero se está preparando como versión abierta para Aircury Summer of Code 2026. El objetivo de la versión final es convertirlo en una experiencia profesional para estudiantes, con rutas adaptadas por ciclo formativo y seguimiento verificable del progreso.

Estado real del repositorio en esta fase:

- Aplicación Next.js App Router con dashboard privado.
- Base de datos PostgreSQL propia mediante `pg`.
- Sesión propia firmada en cookie `al_lio_session`.
- Acceso actual mediante Google OAuth.
- Integración con Google Calendar desde servidor.
- Despliegue preparado para VPS con Docker Compose y Caddy.
- Demo pública activa en `https://al-lio.danielcode.dev`.

El login por email/password está previsto, pero todavía no debe documentarse como funcional. La tabla `users` ya tiene `password_hash` y existe tooling inicial de contraseña, pero el flujo de producto se cerrará en una fase posterior.

## Producto

AL-LÍO ayuda al usuario a contestar tres preguntas:

- Qué requiere atención esta semana.
- Qué oportunidades o convocatorias encajan con su perfil.
- Qué evidencia puede generar para demostrar progreso.

El flujo objetivo para Aircury es:

```text
Perfil del estudiante -> Ciclo formativo -> Objetivos -> Acciones semanales -> Evidencias -> Resultados
```

Los ciclos previstos para la primera iteración de onboarding son:

- DAW: Desarrollo de Aplicaciones Web.
- DAM: Desarrollo de Aplicaciones Multiplataforma.
- AF: Administración y Finanzas.
- TSAF: Acondicionamiento Físico.

DAW y DAM cubren el origen tecnológico del proyecto. AF y TSAF amplían el impacto social y obligan a que la narrativa sea más amplia que "empleo tech": AL-LÍO debe presentarse como orientación y seguimiento para FP.

## Funcionalidades Actuales

### Dashboard

- Resumen de tareas prioritarias.
- Vista semanal con eventos locales y Google Calendar cuando está conectado.
- Acceso a hackathons, cursos, oportunidades y búsquedas.
- Navegación por módulos desde sidebar y navegación móvil.

### Tareas

- Tablero Kanban con bloques Diario, Pendiente y Semanal.
- Prioridades baja, media, alta y crítica.
- Fechas límite, alarmas, etiquetas y notas de progreso.
- Alta rápida desde dashboard y vista de tareas.

### Calendario

- Calendario mensual.
- Vista detallada por día.
- Conexión con Google Calendar.
- Creación y borrado de eventos de Google cuando la conexión está activa.

### Formación y Oportunidades

- Cursos y hackathons gestionados desde PostgreSQL.
- Importadores CSV para cursos, hackathons y oportunidades tech.
- Tabla compartida `tech_opportunities` para oportunidades normalizadas.
- Deep links de búsqueda en LinkedIn, InfoJobs, Tecnoempleo e Indeed.

### Noticias y Fuentes

- Caché local versionada en `data/`.
- Sincronización mediante `npm run sync:news`.
- Fuentes configuradas en `lib/sources/source-registry.ts`.

## Stack Técnico

- Next.js App Router.
- React 19.
- TypeScript.
- Tailwind CSS.
- Componentes UI locales.
- PostgreSQL propio.
- `pg` para acceso a datos.
- Google APIs para OAuth y Calendar.
- Zod.
- date-fns.
- lucide-react.
- Docker Compose para producción.
- Caddy como reverse proxy en VPS.

El repositorio ya no debe describirse como una app basada en Supabase Auth o Supabase Database. Hay documentación histórica sobre esa migración en `docs/`, pero el estado runtime actual usa PostgreSQL propio y sesión propia.

## Rutas

Públicas:

- `/`
- `/login`
- `/register`
- `/api/health`

Privadas:

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

La demo pública actual redirige `/` a `/dashboard` y, si no hay sesión, a `/login`. La landing pública y el reposicionamiento final de Aircury se trabajarán en una PR posterior.

## Instalación Local

Requisitos recomendados:

- Node.js 22 LTS.
- npm.
- Docker Desktop si se usa PostgreSQL sandbox.

Instalación reproducible:

```bash
npm ci
```

Arranque normal de desarrollo:

```bash
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

Aplicar schema sobre una base configurada en `DATABASE_URL`:

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

Chequeo mínimo de estructura, schema y TypeScript:

```bash
npm run verify:startup
```

Chequeo recomendado antes de abrir PR:

```bash
npm run verify:cheap
```

CI local completo:

```bash
npm run ci
```

Validación específica de producción VPS:

```bash
npm run validate:production-deploy
```

Algunos validadores antiguos aún hacen referencia a fases de migración Supabase. Deben actualizarse o archivarse antes de considerar el repo como versión final.

## Despliegue

Destino actual:

- VPS propio.
- Docker Compose.
- Contenedor `al_lio_web`.
- Contenedor `al_lio_postgres`.
- Red externa `danicode_web`.
- Caddy como reverse proxy.
- Dominio `https://al-lio.danielcode.dev`.

Archivos relevantes:

- `infra/Dockerfile`
- `infra/docker-compose.prod.yml`
- `infra/Caddyfile.example`
- `.env.production.example`
- `docs/DEPLOY_VPS.md`

La guía `docs/DEPLOY_VPS.md` necesita una actualización completa antes de usarse como documentación final, porque parte de su contenido todavía refleja fases anteriores.

## Mapa de Documentación

Fuente de verdad actual:

- `README.md`
- `AGENTS.md` para reglas operativas del agente.
- `infra/postgres/schema.sql` para el modelo PostgreSQL actual.
- `.env.example` y `.env.production.example` para variables.
- `infra/docker-compose.prod.yml` para producción VPS.

Documentación que debe revisarse antes de entrega final:

- `docs/01_PRODUCT_SPEC.md`
- `docs/03_ARCHITECTURE_AND_STACK.md`
- `docs/DEPLOY_VPS.md`
- `docs/PROJECT_STRUCTURE.md`
- `AGENTS.md`
- `CLAUDE.md`

Documentación histórica o de migración:

- `docs/SUPABASE_TO_POSTGRES_AUDIT.md`
- `docs/POSTGRES_MIGRATION_PHASE_*.md`
- `docs/SUPABASE_TODO.md`
- `docs/04_SUPABASE_SCHEMA.md`
- `docs/context/`

Estos documentos no deben presentarse como estado final sin una limpieza previa.

## Próximos Pasos

Orden recomendado:

1. Terminar limpieza documental principal.
2. Añadir licencia MIT y crédito explícito a Aircury SL.
3. Actualizar metadata de `package.json`, `app/manifest.ts` y `/api/health`.
4. Corregir o archivar validadores obsoletos de Supabase.
5. Decidir y cerrar login email/password real.
6. Implementar onboarding por ciclos FP.
7. Añadir fixtures demo para presentación.
8. Añadir pruebas BDD/Playwright para los flujos críticos.

## Nota de Entrega Aircury

Para la entrega final, el repositorio debe quedar publicado con licencia MIT, crédito a Aircury SL y una demo operativa mantenida hasta el 31 de agosto de 2027.

Alias ASCII usado en algunos scripts y checks: `Al-Lio`.
