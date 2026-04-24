# Prompt principal para Codex / agente IA

Copia este prompt en Codex/Antigravity. Adjunta también la imagen de referencia del dashboard si puedes.

```text
Actúa como un desarrollador full stack senior especializado en Next.js, TypeScript, shadcn/ui, Supabase, PostgreSQL, dashboards personales y arquitectura SaaS ligera.

Quiero crear una aplicación web nueva llamada **TechLife Control Panel**.

Antes de empezar, lee y usa estos documentos como fuente de verdad:
- @01_PRODUCT_SPEC.md
- @02_AGENT_SKILLS.md
- @03_ARCHITECTURE_AND_STACK.md
- @04_SUPABASE_SCHEMA.md
- @05_UI_UX_SHADCN.md
- @06_INTEGRATIONS_AND_DEEPLINKS.md
- @07_SEED_HACKATHONS.md
- @08_IMPLEMENTATION_PLAN.md

OBJETIVO
Crear mi panel personal online para controlar:
- ofertas de trabajo
- búsquedas rápidas en LinkedIn, InfoJobs, Indeed, Tecnoempleo, Adzuna, Jooble, Remotive, JobToday, Talent.com y Welcome to the Jungle
- cursos
- hackathons y retos por provincia
- tareas pendientes
- calendario interno
- recordatorios
- enlaces rápidos

ESTILO
Quiero una app minimalista, operativa y sencilla. Nada de relleno, nada de textos largos, nada de dashboards saturados.
La home debe parecer un sistema de carpetas como en la imagen de referencia:
- saludo arriba: Buenos días, Dani / Buenas tardes, Dani
- debajo carpetas grandes: Trabajo, Cursos, Hackathons, Tareas, Calendario, Enlaces rápidos
- resumen simple: tareas pendientes, ofertas guardadas, hackathons para revisar y cursos pendientes
- sidebar izquierda plegable para navegar por secciones

STACK OBLIGATORIO
- Next.js App Router
- TypeScript
- shadcn/ui
- Tailwind CSS solo como base de shadcn/ui, evitando escribir estilos excesivos a mano
- Supabase PostgreSQL
- Supabase Auth
- API Routes o Server Actions de Next.js
- Deploy preparado para Vercel
- Repositorio nuevo privado en GitHub

REPOSITORIO
Crea un nuevo repositorio privado en GitHub llamado:
techlife-control-panel

Pasos:
1. Comprueba si existe GitHub CLI con `gh --version`.
2. Comprueba sesión con `gh auth status`.
3. Si hay sesión, crea repo privado:
   `gh repo create techlife-control-panel --private --source=. --remote=origin --push`
4. Si no hay sesión, crea el repo local con Git, deja todo preparado y documenta exactamente los comandos para subirlo manualmente.

NO HACER
- No scraping.
- No Selenium.
- No Playwright para extraer ofertas.
- No automatizar LinkedIn.
- No usar Gmail API en esta primera versión.
- No integrar Google Calendar todavía.
- No meter IA generativa todavía.
- No hacer microservicios.

SÍ HACER
- Crear UI funcional.
- Crear CRUD manual de tareas, cursos, hackathons, enlaces rápidos y ofertas guardadas.
- Crear deep links con búsquedas precargadas para LinkedIn, Indeed, JobToday, Talent.com, Welcome to the Jungle, InfoJobs y Tecnoempleo.
- Preparar integraciones reales para InfoJobs, Adzuna, Jooble, Remotive y Tecnoempleo RSS, aunque las claves queden pendientes.
- Cargar datos iniciales de hackathons por provincia.
- Permitir filtrar hackathons por provincia y estado.
- Permitir crear una tarea o recordatorio desde un hackathon.
- Preparar la app para deploy online 24/7 en Vercel + Supabase.

RUTAS NECESARIAS
- /dashboard
- /work
- /courses
- /hackathons
- /tasks
- /calendar
- /links
- /sources
- /settings

PRIORIDAD DE IMPLEMENTACIÓN
1. Crear estructura del proyecto.
2. Instalar y configurar shadcn/ui.
3. Crear layout principal con sidebar plegable.
4. Crear dashboard estilo carpetas.
5. Crear Supabase client/server.
6. Crear SQL de base de datos con RLS.
7. Crear CRUD manual de tasks, opportunities, hackathons, courses y quick_links.
8. Crear deep links de plataformas de empleo.
9. Crear seed inicial de hackathons.
10. Crear README con instalación, Supabase y deploy en Vercel.
11. Hacer commit inicial y push al repo privado si GitHub CLI está disponible.

CRITERIO DE ÉXITO
Al terminar quiero poder:
- entrar con login
- ver mi dashboard
- entrar en Trabajo y abrir búsquedas directas de empleo
- guardar ofertas manualmente
- entrar en Hackathons y verlos por provincia
- crear tareas y posponerlas a mañana
- crear cursos
- guardar enlaces rápidos
- ver calendario interno básico
- desplegarlo en Vercel
```
