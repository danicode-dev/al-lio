# Implementation Plan

## Fase 0 - Preparación

1. Crear proyecto Next.js.
2. Configurar TypeScript.
3. Configurar shadcn/ui.
4. Configurar Tailwind.
5. Configurar Supabase.
6. Crear `.env.example`.
7. Inicializar Git.
8. Crear repo privado si `gh` está disponible.

## Fase 1 - Layout

Objetivo: tener la app navegable.

Tareas:

- crear layout autenticado
- crear sidebar plegable
- crear rutas principales
- crear dashboard base
- crear componentes:
  - AppSidebar
  - FolderCard
  - DashboardSummary
  - PageHeader

Criterio de fin:

- se puede navegar por todas las rutas
- la home se parece al concepto de carpetas
- no hay errores visuales importantes

## Fase 2 - Supabase

Objetivo: tener DB y Auth preparados.

Tareas:

- crear SQL
- activar RLS
- crear clients Supabase
- crear login/register
- proteger rutas privadas
- crear perfil por defecto

Criterio de fin:

- usuario puede registrarse
- usuario puede entrar
- usuario solo ve sus datos

## Fase 3 - CRUD manual

Objetivo: que la app ya sea útil.

Tareas:

- CRUD tasks
- CRUD opportunities
- CRUD courses
- CRUD hackathons
- CRUD quick_links
- CRUD quick_searches

Criterio de fin:

- crear/editar/borrar/marcar estados funciona
- dashboard muestra datos reales
- no hay datos mezclados entre usuarios

## Fase 4 - Trabajo y deep links

Objetivo: abrir búsquedas preparadas.

Tareas:

- crear plataformas con logos
- crear quick searches iniciales
- crear `buildJobSearchUrl`
- crear botones "Abrir búsqueda"
- crear vista de ofertas guardadas

Criterio de fin:

- LinkedIn abre búsqueda de empleo con keyword/location
- Indeed abre búsqueda
- InfoJobs abre búsqueda
- Tecnoempleo abre búsqueda
- el usuario puede guardar URLs manualmente

## Fase 5 - Hackathons

Objetivo: controlar eventos por provincia.

Tareas:

- seed inicial de hackathons
- filtros por provincia
- filtros por estado
- tarjeta de hackathon
- acción "marcar revisado"
- acción "crear tarea"
- acción "crear recordatorio"

Criterio de fin:

- Granada/Málaga/Almería/Jaén/Córdoba muestran elementos
- se puede actualizar estado y revisión
- se puede crear tarea desde hackathon

## Fase 6 - Calendario

Objetivo: ver fechas.

Tareas:

- calendario mensual básico
- mostrar tareas con `due_date`
- mostrar cursos con `deadline`
- mostrar hackathons con fecha
- mostrar recordatorios

## Fase 7 - Integraciones preparadas

Objetivo: dejar APIs listas sin bloquear MVP.

Tareas:

- crear `lib/integrations/infojobs.ts`
- crear `lib/integrations/adzuna.ts`
- crear `lib/integrations/jooble.ts`
- crear `lib/integrations/remotive.ts`
- crear `lib/integrations/tecnoempleo-rss.ts`
- crear normalizador
- crear control de errores si faltan API keys

Criterio de fin:

- faltan claves y la app no rompe
- collectors devuelven array vacío si no están configurados
- estructura lista para activar

## Fase 8 - Deploy

Objetivo: publicar online.

Tareas:

- README
- `.env.example`
- instrucciones Supabase
- instrucciones Vercel
- commit inicial
- push repo privado si posible

## Comandos sugeridos

```bash
npx create-next-app@latest techlife-control-panel --typescript --tailwind --eslint --app
cd techlife-control-panel
npx shadcn@latest init
npx shadcn@latest add button card badge tabs sheet dialog dropdown-menu input textarea select calendar table command separator scroll-area checkbox
npm install @supabase/supabase-js @supabase/ssr zod date-fns lucide-react
```
