# TechLife Control Panel

Panel personal para controlar trabajo, cursos, hackathons, tareas, calendario interno y enlaces rapidos.

## Stack

- Next.js App Router
- TypeScript
- shadcn/ui style components
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Server Actions y API Routes
- Vercel

## Rutas

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
cp .env.example .env.local
npm run dev
```

Variables necesarias:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
INFOJOBS_CLIENT_ID=
INFOJOBS_CLIENT_SECRET=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
JOOBLE_API_KEY=
```

## Supabase

1. Crea un proyecto en Supabase.
2. Copia `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local`.
3. Ejecuta el contenido de `supabase/schema.sql` en el SQL Editor.
4. Ejecuta el contenido de `supabase/seed.sql` en el SQL Editor.
5. En la app, entra en `/settings` y pulsa `Cargar hackathons`.

Todas las tablas usan `user_id`, timestamps y RLS. Cada usuario solo puede leer y modificar sus propios datos.

## Deep links de trabajo

La seccion Trabajo abre busquedas precargadas para:

- LinkedIn
- InfoJobs
- Indeed
- Tecnoempleo
- Adzuna
- Jooble
- Remotive
- JobToday
- Talent.com
- Welcome to the Jungle

No hay scraping, Selenium ni automatizacion de LinkedIn.

## Integraciones preparadas

Collectors en `lib/integrations`:

- `infojobs.ts`
- `adzuna.ts`
- `jooble.ts`
- `remotive.ts`
- `tecnoempleo-rss.ts`

Si faltan claves, devuelven `[]` y la app no rompe.

## Deploy en Vercel

1. Conecta el repositorio en Vercel.
2. Configura las variables de entorno.
3. Ejecuta build con `npm run build`.
4. Despliega.

## GitHub

GitHub CLI no esta disponible en este entorno. El repo remoto indicado es:

```bash
git remote add origin https://github.com/danicode-dev/d1os.git
git branch -M main
git push -u origin main
```
