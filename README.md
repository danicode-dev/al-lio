# D1OS

Panel personal para organizar tareas, cursos, hackathons, calendario, empresas y busqueda de empleo tech.

## Estado actual

Este repo esta en fase MVP local-first.

Ahora mismo la app funciona como panel local con persistencia en navegador mediante `localStorage`, usando el perfil:

```text
techlife.store.D1OS.v2
```

Esto permite avanzar rapido, pero todavia no es la version permanente entre movil y PC. El siguiente paso de escalabilidad es mover los datos a Supabase con Auth y Row Level Security.

## Funcionalidades principales

- Dashboard inicial en `/dashboard`.
- Barra lateral de navegacion.
- Alta rapida con boton flotante `+`.
- Tareas rapidas sin campo URL.
- Atajos de fecha para tareas cercanas, incluido `Manana misma hora`.
- Acciones en tareas: `Hecho`, `Manana misma hora`, `Otro dia` y `Nota`.
- Registro de notas de avance en `progress_notes`.
- Calendario mensual con eventos dentro de cada dia.
- Seccion Trabajo con pestanas `Portales` y `Empresas`.
- Seed local de empresas en `public/data/empresas_tech_granada.md`.

## Stack

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- lucide-react.
- Supabase preparado para la siguiente fase.
- Vercel como destino recomendado de despliegue.

## Rutas

- `/` redirige a `/dashboard`.
- `/dashboard`
- `/work`
- `/courses`
- `/hackathons`
- `/tasks`
- `/calendar`
- `/links`
- `/sources`
- `/settings`

## Instalacion local

```bash
npm install
npm run dev
```

La app abre normalmente en:

```text
http://localhost:3000
```

## Verificacion antes de subir

Ejecutar la bateria principal:

```bash
npm run ci
```

Esto ejecuta:

- `npm run lint`
- `npm run check:project`
- `npm run typecheck`
- `npm run build`

Para probar rutas y CSS con el servidor local arrancado:

```bash
npm run dev
npm run smoke
```

Si se usa otro puerto:

```bash
$env:SMOKE_BASE_URL="http://localhost:3001"; npm run smoke
```

## Documentacion

La documentacion del proyecto esta organizada en `docs/`.

Documentos importantes:

- [Pasos seguidos el dia 2504](docs/pasos%20seguidos%20el%20dia%202504.md)
- [Proyecto escalada](docs/proyecto%20escalada.md)
- [Product spec](docs/01_PRODUCT_SPEC.md)
- [Arquitectura y stack](docs/03_ARCHITECTURE_AND_STACK.md)
- [Schema Supabase inicial](docs/04_SUPABASE_SCHEMA.md)
- [Plan de implementacion](docs/08_IMPLEMENTATION_PLAN.md)

## Siguiente fase

La siguiente fase recomendada es:

1. Mantener el MVP local estable.
2. Subir el proyecto a GitHub.
3. Desplegar la app en Vercel.
4. Crear Supabase.
5. Crear tablas para tareas, notas, cursos, hackathons, empresas y portales.
6. Activar Auth y RLS.
7. Migrar datos desde `localStorage` a Supabase.
8. Convertir la app en PWA para movil.

## Variables de entorno futuras

Cuando se conecte Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

No subir `.env.local` a GitHub.

## Deploy futuro

Destino recomendado:

- Vercel para la app Next.js.
- Supabase Pro para persistencia permanente.
- Dominio propio opcional.

La opcion recomendada para uso personal serio es empezar con Vercel Hobby y Supabase Pro.

## Limpieza local

Los artefactos generados estan ignorados por Git:

- `.next`
- `.playwright-mcp`
- `dev-server*.log`
- `node_modules`

No forman parte del codigo fuente ni deben subirse al repositorio.
