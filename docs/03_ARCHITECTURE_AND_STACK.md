# Architecture and Stack

## Stack principal

- **Framework:** Next.js App Router
- **Lenguaje:** TypeScript
- **UI:** shadcn/ui
- **Estilos:** Tailwind CSS como base de shadcn/ui
- **Base de datos:** Supabase PostgreSQL
- **Auth:** Supabase Auth
- **Deploy:** Vercel
- **Integraciones:** API Routes o Server Actions
- **Validación:** Zod recomendado
- **Iconos:** lucide-react
- **Fechas:** date-fns recomendado

## Nota sobre shadcn/ui

shadcn/ui no sustituye totalmente a Tailwind. Usa Tailwind por debajo, pero permite trabajar con componentes ya preparados.

Objetivo:

- no escribir clases desde cero todo el rato
- usar componentes consistentes
- mantener diseño simple
- no saturar la UI

## Estructura de carpetas recomendada

```txt
techlife-control-panel/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── work/
│   │   ├── courses/
│   │   ├── hackathons/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   ├── links/
│   │   ├── sources/
│   │   └── settings/
│   ├── api/
│   │   ├── collect/
│   │   └── health/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── app-sidebar.tsx
│   ├── folder-card.tsx
│   ├── dashboard-summary.tsx
│   ├── platform-card.tsx
│   ├── hackathon-card.tsx
│   ├── task-card.tsx
│   ├── quick-search-card.tsx
│   └── ui/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── integrations/
│   │   ├── infojobs.ts
│   │   ├── adzuna.ts
│   │   ├── jooble.ts
│   │   ├── remotive.ts
│   │   └── tecnoempleo-rss.ts
│   ├── deeplinks/
│   │   └── job-search-urls.ts
│   ├── db/
│   │   └── types.ts
│   ├── seed/
│   │   └── hackathons.ts
│   └── utils.ts
├── public/
│   └── logos/
├── supabase/
│   ├── schema.sql
│   └── seed.sql
├── .env.example
├── README.md
└── package.json
```

## Rutas

### Públicas

- `/`
- `/login`
- `/register`

### Privadas

- `/dashboard`
- `/work`
- `/courses`
- `/hackathons`
- `/tasks`
- `/calendar`
- `/links`
- `/sources`
- `/settings`

## Integraciones

Tipos:

- `api`: InfoJobs, Adzuna, Jooble, Remotive
- `rss`: Tecnoempleo
- `deeplink`: LinkedIn, Indeed, JobToday, Talent.com, Welcome to the Jungle
- `manual`: fuentes añadidas a mano

## Deploy inicial

- Vercel para Next.js
- Supabase para DB/Auth
