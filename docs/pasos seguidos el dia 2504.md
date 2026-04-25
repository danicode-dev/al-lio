# Pasos seguidos el dia 25/04/2026

## Objetivo del dia

Dejar D1OS en una primera fase mas ordenada: panel principal usable, documentacion organizada, estructura preparada para GitHub y una bateria basica de verificacion antes de subir el proyecto.

## Lo que se ha avanzado

- Se dejo la app arrancando desde `/dashboard`.
- Se mantuvo una navegacion lateral para acceder a las secciones principales.
- Se simplifico el alta rapida con el boton flotante `+`.
- Para tareas rapidas se quito la URL.
- Se dejaron atajos de fecha para tareas cercanas, incluido `Manana misma hora`.
- Se preparo el modelo local versionado `techlife.store.D1OS.v2`.
- Se conservaron datos en navegador con migracion desde stores antiguos.
- Las tareas tienen `due_at`, `status`, `description`, `progress_notes`, `created_at` y `completed_at`.
- Se anadio accion directa de tarea: `Hecho`.
- Se anadio accion directa de tarea: `Manana misma hora`.
- Se anadio accion directa de tarea: `Otro dia`.
- Se anadio accion directa de tarea: `Nota`.
- Se preparo registro de completadas del dia y progreso mensual.
- Se rehizo la idea de calendario como cuadrilla mensual con eventos dentro de cada dia.
- Se rehizo `/work` con dos bloques principales: `Portales` y `Empresas`.
- Se importo el archivo de empresas de Granada a `public/data/empresas_tech_granada.md`.
- Se preparo el documento `proyecto escalada.md` con el plan de despliegue y escalabilidad.
- Se movio la documentacion auxiliar a la carpeta `docs/`.
- Se actualizo `README.md` para que sirva como portada futura del repo en GitHub.
- Se corrigio el script de lint para que no dependa del asistente interactivo de Next.
- Se prepararon scripts de verificacion:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run check:project`
  - `npm run test`
  - `npm run ci`
  - `npm run smoke`
- Se ejecuto `npm run ci` correctamente.
- Se ejecuto `npm run smoke` correctamente contra un servidor local temporal.
- Se limpiaron artefactos generados locales: `.next`, `.playwright-mcp`, `dev-server*.log` y `tsconfig.tsbuildinfo`.

## Donde nos quedamos

El proyecto queda como MVP local-first.

Esto significa:

- La app funciona como panel local.
- La persistencia principal sigue estando en `localStorage`.
- Todavia no esta conectada a Supabase como fuente real de datos.
- Todavia no se ha subido a GitHub.
- Todavia no se ha desplegado en Vercel.
- Todavia no hay dominio propio.
- Todavia no hay PWA instalada en movil.
- La carpeta queda preparada para GitHub, manteniendo `node_modules` solo como dependencia local ignorada por Git.

## Proximo paso a paso recomendado

### Paso 1 - Verificacion local

Ejecutar:

```bash
npm run ci
```

Despues arrancar:

```bash
npm run dev
```

Y en otra terminal:

```bash
npm run smoke
```

Objetivo:

- Confirmar que TypeScript no falla.
- Confirmar que el build de Next funciona.
- Confirmar que las rutas principales cargan.
- Confirmar que el CSS carga y no vuelve el problema de pantalla sin estilo.

### Paso 2 - Revision visual manual

Abrir:

```text
http://localhost:3000/dashboard
```

Comprobar:

- Dashboard con estilos.
- Boton `+`.
- Crear tarea sin URL.
- Usar `Manana misma hora`.
- Marcar tarea como hecha.
- Anadir nota a tarea.
- Recargar navegador y confirmar que sigue guardado.
- Ir a `/calendar` y ver eventos en el mes.
- Ir a `/work` y alternar entre `Portales` y `Empresas`.

### Paso 3 - Preparar GitHub

Antes de subir:

```bash
git status
```

Revisar que no se suben:

- `.env.local`
- `.next`
- `.playwright-mcp`
- `node_modules`
- `dev-server*.log`

Despues crear repo y subir cuando se decida.

### Paso 4 - Despliegue inicial en Vercel

Subir primero sin Supabase real, solo para confirmar:

- Build en Vercel.
- Rutas publicas.
- Estilos.
- Navegacion.

Limitacion:

Los datos seguiran siendo locales por navegador hasta migrar a Supabase.

### Paso 5 - Supabase como siguiente gran fase

Crear:

- Proyecto Supabase.
- Auth.
- Tablas.
- RLS.
- Migracion desde `localStorage`.

Tablas minimas:

- `tasks`
- `progress_notes`
- `courses`
- `hackathons`
- `companies`
- `job_portals`

### Paso 6 - Persistencia real entre dispositivos

Una vez conectada la base de datos:

- Iniciar sesion desde PC.
- Crear tarea.
- Abrir en movil.
- Confirmar que aparece la misma tarea.
- Marcar como hecha desde movil.
- Confirmar que se ve en PC.

### Paso 7 - PWA y dominio

Cuando la app ya guarde en Supabase:

- Anadir manifest.
- Anadir iconos.
- Revisar colores.
- Probar instalacion en Android/iPhone.
- Conectar dominio propio si se quiere.

## Puntos flojos actuales

### Persistencia local

El punto mas importante.

Ahora mismo los datos viven en el navegador. Para escalabilidad real hay que moverlos a Supabase.

### Componente principal demasiado grande

`components/guest-app.tsx` concentra demasiada logica:

- Tipos.
- Store.
- Migracion.
- Dashboard.
- Calendario.
- Trabajo.
- Formularios.
- Acciones de tareas.

Esto conviene dividirlo antes de crecer mucho.

Division recomendada:

- `components/dashboard/*`
- `components/calendar/*`
- `components/work/*`
- `components/quick-add/*`
- `lib/local-store/*`
- `lib/domain/*`

### Falta test de UI real

La bateria actual cubre estructura, lint, typecheck, build y humo local.

Falta mas adelante:

- Tests de componentes.
- Tests de flujo de tarea.
- Tests de migracion `localStorage` a Supabase.
- Tests de calendario.
- Tests E2E con Playwright.

### Supabase preparado pero no integrado como fuente final

Hay carpeta `supabase/`, pero la app actual no depende todavia de Supabase para guardar tareas reales.

Hay que alinear:

- Schema SQL.
- Tipos TypeScript.
- Store de la app.
- Server actions o API routes.
- RLS.

### Empresas y enlaces sin verificacion fuerte

Los enlaces importados deben tratarse como:

- `verified`
- `unverified`
- `broken`

Por defecto, si no se pueden comprobar, deben quedar como `unverified`.

### Falta export/import

Antes de migrar a Supabase conviene tener:

- Exportar JSON local.
- Importar JSON local.
- Migrar a nube.

Esto evita perdida de datos.

### Falta observabilidad

Cuando se despliegue:

- Logs utiles.
- Control de errores.
- Pagina de health check.
- Revisión de fallos de build.

## Mejoras para escalabilidad

- Mover datos a Supabase.
- Activar RLS desde el primer dia.
- Crear indices por `user_id`, `due_at`, `completed_at` y `status`.
- Usar Zod para validar formularios.
- Separar UI de logica de datos.
- Mantener un sistema de migraciones.
- Anadir tests E2E antes de tocar auth y persistencia.
- Convertir el panel en PWA.
- Crear backups/export de datos personales.
- Evitar scraping; usar deeplinks o APIs oficiales.

## Decision tecnica recomendada

Para la siguiente fase:

```text
Vercel Hobby + Supabase Pro + GitHub
```

Motivo:

- Coste bajo.
- App accesible desde cualquier dispositivo.
- Persistencia real.
- Escala suficiente para uso personal serio.
- Permite convertir D1OS en producto mas adelante.
