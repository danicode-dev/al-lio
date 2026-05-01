# D1OS

Panel personal para organizar tareas, calendario, hackathons, cursos, enlaces y busqueda de empleo tech. En la interfaz la app se presenta como **Al-Lio**.

## Estado actual

El proyecto esta en fase MVP personal, pero ya no es solo local-first. La app usa Next.js App Router con Supabase Auth y tablas de datos para las entidades principales.

La entrada principal es Google OAuth. El login conecta la cuenta de Google, crea la sesion de Supabase desde servidor y deja la app preparada para usar Google Calendar sin exponer tokens en el frontend.

Se mantienen seeds y datos base en el repositorio para portales, hackathons y contenido inicial cuando procede.

## Funcionalidades principales

### Autenticacion

- Login moderno en `/login` con estilo SaaS split-screen.
- Acceso principal con `Continuar con Google`.
- Integracion con Google OAuth y Google Calendar.
- `/register` queda alineado con el flujo de login.
- Soporte de modo claro y oscuro.
- Uso de los logos disponibles en `logo/`.

### Dashboard

- To-do colocado en primer lugar en `/dashboard`.
- Cabecera mas compacta con saludo y estado de Google Calendar en formato pill.
- Se eliminaron del dashboard visible los bloques antiguos de accesos utiles, realizado hoy y evolucion del mes.
- Bloque operativo rotativo con 4 secciones:
  - Tareas urgentes o de prioridad alta/critica.
  - Semana con eventos proximos del calendario local y Google Calendar cuando esta conectado.
  - Hackathons proximos desde el 01/05/2026.
  - Busqueda rapida de empleo.
- El carrusel avanza automaticamente solo cuando el usuario no esta interactuando.
- Al hacer hover, foco o usar los controles, el carrusel se pausa para poder leer y operar con calma.
- Controles manuales con flechas y puntos de seccion.
- La seccion de noticias tech queda fuera del dashboard principal; `/noticias` sigue disponible.

### To-do y tareas

- Tablero tipo Kanban en `/tasks`.
- Version compacta del tablero en `/dashboard`.
- Columnas fijas:
  - Diario.
  - Pendiente.
  - Semanal.
- Las tarjetas muestran titulo e indicador visual de prioridad.
- Prioridades soportadas: baja, media, alta y critica.
- Boton de papelera directo en cada tarjeta para borrar sin abrir el detalle.
- Alta rapida de tareas desde el dashboard y desde cada columna.
- Modal de detalle para editar titulo, descripcion, columna, prioridad, fecha limite, alarma, etiquetas, estado y eliminacion.
- Las tareas antiguas sin bloque se muestran por defecto en Diario.

### Calendario

- Calendario compacto en el dashboard.
- Controles de mes anterior, hoy y mes siguiente.
- Panel de detalle del dia seleccionado, adaptado para pantalla vertical y horizontal.
- Vista completa disponible en `/calendar`.
- Integracion con Google Calendar mediante llamadas puntuales; no hay polling constante.
- Creacion y borrado de eventos de Google desde la vista de calendario cuando la conexion esta activa.

### Hackathons

- Dashboard muestra hackathons proximos desde el 01/05/2026.
- Acciones rapidas para investigar, marcar como realizado, borrar y abrir informacion.
- Boton para abrir las webs disponibles de todos los hackathons mostrados.
- Vista completa en `/hackathons`.

### Trabajo

- Vista completa en `/work` para portales, empresas y oportunidades.
- Busqueda rapida en dashboard con un unico termino y ubicacion.
- Boton `Buscar en los 4` para abrir LinkedIn, InfoJobs, Tecnoempleo e Indeed con el mismo patron de busqueda.
- Cada portal tambien puede abrirse de forma individual.
- Los deeplinks de busqueda viven en `lib/deeplinks/job-search-urls.ts`.

### Navegacion

- `/tasks` es la segunda entrada del sidebar y de la navegacion movil.
- Rutas principales protegidas por sesion.
- Sidebar con Inicio, Tareas, Bloc, Noticias, Trabajo, Cursos, Hackathons, Calendario, Enlaces y Ajustes.
- Boton flotante `+` para alta rapida.

## Stack

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui local.
- lucide-react.
- Supabase Auth y Supabase Database.
- Google APIs para Google Calendar.
- date-fns.
- Zod.
- Vercel como destino recomendado de despliegue.

## Rutas

- `/` redirige a `/dashboard`.
- `/login`
- `/register`
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

## Instalacion local

```bash
npm install
npm run dev
```

`npm run dev` ejecuta antes `npm run verify:startup`, que revisa estructura del proyecto y TypeScript. Si algo basico esta roto, la app no arranca.

La app abre normalmente en:

```text
http://localhost:3000
```

Antes de usar autenticacion, Supabase o Google Calendar, crea `.env.local` a partir de `.env.example` y rellena las variables necesarias.

Si aparece un error de chunks de Next tipo `Cannot find module './992.js'`, no es codigo de la app: es `.next` corrupto o generado con otro modo. Usa:

```bash
npm run restart:prod
```

Para desarrollo limpio:

```bash
npm run dev:clean
```

## Variables de entorno

Variables principales usadas por la app:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Tambien soportado para llaves nuevas de Supabase:
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SECRET_KEY=

PROFILES_SHARED_PASSWORD=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/calendar/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=

INFOJOBS_CLIENT_ID=
INFOJOBS_CLIENT_SECRET=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
JOOBLE_API_KEY=

BASE_URL=http://localhost:3000
```

No subir `.env.local` a GitHub.

## Verificacion antes de subir

Chequeo rapido y barato durante desarrollo:

```bash
npm run verify:cheap
```

Chequeo minimo que se ejecuta antes de arrancar:

```bash
npm run verify:startup
```

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

Para validar build real de produccion con servidor temporal y smoke automatico:

```bash
npm run verify:prod
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
- [Estructura del proyecto](docs/PROJECT_STRUCTURE.md)
- [Guia de agentes IA](AGENTS.md)
- [Contexto CSV oportunidades tech](docs/context/OPORTUNIDADES_TECH_CSV_PARA_CODEX.md)
- [TODO Supabase persistencia](docs/SUPABASE_TODO.md)
- [Schema Supabase inicial](docs/04_SUPABASE_SCHEMA.md)
- [Plan de implementacion](docs/08_IMPLEMENTATION_PLAN.md)

## Siguiente fase

La siguiente fase recomendada es:

1. Revisar que el schema de Supabase coincide con los campos usados por tareas, calendario, cursos, hackathons, oportunidades y enlaces.
2. Endurecer RLS y permisos por usuario.
3. Completar migraciones SQL versionadas.
4. Ampliar pruebas smoke para login, dashboard, tareas, calendario y trabajo.
5. Afinar sincronizacion de Google Calendar y manejo de errores de OAuth.
6. Preparar despliegue estable en Vercel.
7. Convertir la app en PWA para uso comodo en movil.

## Deploy

Destino recomendado:

- Vercel para la app Next.js.
- Supabase para autenticacion y persistencia.
- Google Cloud Console para OAuth de Google Calendar.
- Dominio propio opcional.

Para produccion, actualizar `GOOGLE_REDIRECT_URI` con el dominio final:

```text
https://tu-dominio.com/api/google/calendar/callback
```

## Limpieza local

Los artefactos generados estan ignorados por Git:

- `.next`
- `.playwright-mcp`
- `dev-server*.log`
- `node_modules`

No forman parte del codigo fuente ni deben subirse al repositorio.
