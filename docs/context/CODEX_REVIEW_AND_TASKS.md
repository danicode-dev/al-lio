# D1OS / Al-Lio — Revisión Completa para Codex

> Documento generado el 2026-05-01 con todo el contexto del proyecto para que Codex pueda revisarlo, validarlo e implementar las tareas pendientes.

---

## 1. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 App Router (server + client components) |
| UI | React 19, Tailwind CSS 3, shadcn-style components propios |
| Auth + DB | Supabase (PostgreSQL, RLS, SSR client via `@supabase/ssr`) |
| Server actions | `lib/db.ts` → `insertDb`, `updateDb`, `deleteDb` con `revalidatePath` |
| Estado cliente | Context API (`StoreProvider` en `components/guest-app.tsx`) |
| Noticias | RSS/API fetch propio → JSON local `data/` |
| Deploy | Vercel (Node.js runtime) |

---

## 2. Arquitectura de datos

### Tablas Supabase activas (ver `supabase/schema.sql`)

```
tasks           — tareas con bucket diario/urgente/semanal, progress_notes JSONB
courses         — cursos (schema básico: title, platform, url, status…)
hackathons      — hackathons (name, organizer, province, status, fechas…)
opportunities   — oportunidades de trabajo guardadas
quick_links     — enlaces rápidos
tech_opportunities — tabla extendida con encaje DAW, prioridad, tags (creada en sesión anterior)
```

### Estado cliente en `StoreProvider` (`components/guest-app.tsx`)

El layout `app/(dashboard)/layout.tsx` llama `getGlobalStore()` → 5 queries Supabase en paralelo → pasa `initialStore` a `StoreProvider`. El store tiene: `tasks`, `courses`, `hackathons`, `opportunities`, `links`, `companies`.

---

## 3. Cambios realizados en las últimas sesiones (lo que Codex debe conocer)

### 3.1 Fix paste/foco en inputs de tareas

**Problema:** Al añadir una tarea desde el dashboard, se perdía el foco del input y no se podía pegar texto.

**Causa raíz:** Las server actions llamaban `revalidatePath("/dashboard")`, lo que forzaba `router.refresh()` → el layout re-ejecutaba `getGlobalStore()` → nuevo `initialStore` → `StoreProvider.useEffect` llamaba `setStore(initialStore)` → re-render completo del árbol → input perdía foco.

**Fix aplicado en `components/guest-app.tsx`:**
- Eliminado `/dashboard` de todos los arrays de `revalidatePath` en las actions (`addTask`, `updateTask`, `deleteTask`, `addTaskNote`, `addCourse`, `updateCourse`, `addHackathon`, `updateHackathon`, `addCompany`, `updateCompany`, `addLink`).
- Añadido `hasMountedRef` en `StoreProvider` para que el `useEffect` que sincroniza `initialStore` NO dispare re-render en el mount inicial (evita doble render).

### 3.2 BlocView reescrito (notas rápidas)

**Problema:** La IA anterior dejó BlocView como un stub roto (textarea sin estado, sin persistencia).

**Fix aplicado:** Reescritura completa de `BlocView` en `components/guest-app.tsx`:
- Multi-nota con array `BlocNote[]` en estado
- Guardado automático en `localStorage` con debounce 400ms
- **Bug crítico solucionado:** el cleanup del debounce cancelaba el guardado al navegar. Solución: `notesRef` siempre sincronizado + efecto de flush inmediato en unmount (deps `[]`)
- Ajustes por nota: tamaño de fuente (sm/base/lg), nombre por defecto de notas nuevas
- Loading skeleton mientras carga (en vez de pantalla en blanco)
- Keys localStorage: `techlife.bloc.D1OS.v1` y `techlife.bloc.settings.D1OS.v1`

### 3.3 Settings con ajustes reales

**Añadido `useAppSettings` hook:**
- Key: `techlife.app.settings.D1OS.v1`
- Campos: `displayName` (aparece en el saludo), `defaultTaskBucket` (columna por defecto al añadir tarea), `compactTaskView` (toggle vista compacta)
- Usado en `GuestApp` (saludo), `TodoOverview` (pasa `compact` a `TaskBoard`)
- Settings reescrito con: input nombre, select columna por defecto, toggle switch vista compacta, zona de peligro (reset)

### 3.4 Noticias (/noticias)

**Problema 1:** `data/news-items.json` estaba en `.gitignore` → en Vercel no existía → API devolvía array vacío.
**Fix:** Eliminado de `.gitignore`. Los 221 artículos se despliegan con el build.

**Problema 2:** `readAllItems()` y `readSyncStatus()` en `lib/news/store.ts` intentaban hacer writes al filesystem en cada lectura cuando los datos normalizados diferían → en Vercel (read-only filesystem) lanzaba `EROFS` → 500 en el API.
**Fix:** Writes con `.catch(() => {})` → fallo silencioso en filesystem read-only.

### 3.5 Limpieza de código muerto (~350 líneas eliminadas)

Eliminado de `components/guest-app.tsx` todo el sistema legacy de localStorage que una IA anterior dejó abandonado (el app ahora usa Supabase como fuente de verdad):

**Funciones/componentes eliminados:**
- `DashboardLegacy` + sus sub-componentes: `WeeklyTodo`, `MonthPanel`, `DoneToday`, `MonthlyProgress`
- `TaskForm`, `TaskActionCard`, `Summary`, `Metric`, `CalendarEventLink`
- Sistema completo de store localStorage: `readStore`, `normalizeStore`, `migrateLegacyStore`
- Todos los `normalize*`: `normalizeTask`, `normalizeProgressNote`, `normalizeOpportunity`, `normalizeCourse`, `normalizeHackathon`, `normalizeCompany`, `normalizeLink`
- Helpers solo usados en dead code: `asLegacyRecord`, `legacyArray`, `textOr`, `stableCompanyId`, `dateToDefaultDateTime`, `isSameDay`, `getUpcomingTasks`, `greeting`, `taskStatus`, `courseStatus`, `hackathonStatus`, `priority`, `basicPriority`
- Constantes huérfanas: `storeKeyV2`, `legacyKeys`, `companiesMdPath`
- Imports: `GraduationCap`, `MoreVertical`, `Newspaper`, `RotateCcw`, `StickyNote`

**Resultado:** `npx next build` → 0 errores, 0 warnings. `npx tsc --noEmit` → 0 errores.

---

## 4. Archivos clave del proyecto

```
components/guest-app.tsx       — bundle "use client" principal (~2100 líneas tras cleanup)
components/noticias-view.tsx   — vista de noticias (fetch a /api/news)
components/tech-opportunities-section.tsx — sección de oportunidades tech
lib/data.ts                    — getGlobalStore() (5 queries Supabase en paralelo)
lib/db.ts                      — insertDb / updateDb / deleteDb (server actions)
lib/news/store.ts              — lectura/escritura JSON local para noticias
lib/news/fetchers.ts           — RSS + APIs externas (DEV.to, HN, etc.)
lib/sources/source-registry.ts — catálogo de fuentes de noticias
app/(dashboard)/layout.tsx     — layout con StoreProvider
app/(dashboard)/bloc/page.tsx  — página /bloc → <GuestApp view="bloc" />
app/(dashboard)/noticias/page.tsx — página /noticias → <NoticiasView />
data/news-items.json           — 221 artículos cacheados (ya en git)
data/news-sync-status.json     — estado del último sync
csv/                           — CSVs con datos a importar (VER SECCIÓN 5)
supabase/schema.sql            — schema completo de Supabase
scripts/import-tech-opportunities.mjs — importa CSV de oportunidades a Supabase
```

---

## 5. TAREA PENDIENTE: Importar CSVs de Cursos y Hackathons

### Problema actual

Los tabs `/courses` y `/hackathons` en el dashboard muestran datos vacíos porque los CSVs nunca se importaron a Supabase.

### CSVs disponibles en `csv/`

#### `csv/cursos_formacion_granada_online_supabase.csv`
Columnas: `id_slug, categoria, nombre, entidad, area, modalidad, localidad, provincia, formato, certificacion_tipo, certificacion_oficial, practicas_empresa, horas_totales, horas_practicas, fecha_inicio, fecha_fin, estado, coste, requisitos_resumen, encaje_daw_1_5, prioridad, tags, fuente_url, ultima_revision, notas`

#### `csv/eventos_hackathons_supabase_actualizado.csv`
Columnas: `id_slug, categoria, nombre, entidad, tipo, localidad, provincia, modalidad, fecha_inicio, fecha_fin, estado, inscripcion_hasta, certificacion_o_premio, practicas_empresa, encaje_daw_1_5, prioridad, tags, fuente_url, incluido_en_readme_original, ultima_revision, notas`

#### `csv/oportunidades_tech_supabase_combinado.csv`
Columnas: `id_slug, categoria, nombre, entidad, area_o_tipo, modalidad, localidad, provincia, fecha_inicio, fecha_fin, estado, certificacion_o_premio, practicas_empresa, horas_totales, horas_practicas, coste, requisitos_resumen, encaje_daw_1_5, prioridad, tags, fuente_url, ultima_revision, notas`
(Ya existe tabla `tech_opportunities` con script de importación)

### Schema actual de `courses` en Supabase
```sql
id, user_id, title, platform, url, price, category, status,
start_date, deadline, notes, created_at, updated_at
```
→ **Faltan columnas:** entidad, area, modalidad, localidad, provincia, certificacion, practicas_empresa, horas_totales, horas_practicas, encaje_daw_1_5, prioridad, tags, id_slug

### Schema actual de `hackathons` en Supabase
```sql
id, user_id, name, organizer, province, city, type, status,
event_start_date, event_end_date, registration_deadline, url, notes,
priority, created_at, updated_at
```
→ **Faltan columnas:** id_slug, modalidad, fecha_fin, inscripcion_hasta, certificacion_o_premio, practicas_empresa, encaje_daw_1_5, tags, localidad

---

## PROMPT PARA CODEX

```
Eres un desarrollador senior trabajando en D1OS / Al-Lio, una aplicación web de productividad personal construida con:
- Next.js 15 App Router
- React 19, Tailwind CSS
- Supabase (PostgreSQL con RLS)
- TypeScript estricto
- Despliegue en Vercel

El proyecto está en c:\Users\danga\Desktop\D1OS

---

CONTEXTO DEL PROYECTO:
Lee estos archivos clave antes de hacer nada:
1. supabase/schema.sql — schema completo de tablas
2. components/guest-app.tsx — bundle cliente principal (2100 líneas, "use client")
3. lib/data.ts — getGlobalStore() que carga datos de Supabase
4. lib/db.ts — server actions para mutaciones
5. scripts/import-tech-opportunities.mjs — ejemplo de script de importación CSV existente
6. csv/cursos_formacion_granada_online_supabase.csv — CSV de cursos a importar
7. csv/eventos_hackathons_supabase_actualizado.csv — CSV de hackathons a importar

---

CAMBIOS RECIENTES IMPORTANTES (no toques estas partes que ya están corregidas):
1. Las server actions NO deben tener "/dashboard" en sus arrays de revalidatePath — esto rompe el foco de inputs
2. StoreProvider tiene un hasMountedRef para evitar doble render — no eliminar
3. BlocView usa notesRef + flush en unmount — no tocar
4. lib/news/store.ts — los writes tienen .catch(() => {}) — necesario para Vercel
5. data/news-items.json ya NO está en .gitignore

---

TAREAS A IMPLEMENTAR:

### TAREA 1: Migración de schema — Extender tablas courses y hackathons

Crea un archivo `supabase/migrations/extend_courses_hackathons.sql` con:

Para `courses`:
```sql
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS id_slug text,
  ADD COLUMN IF NOT EXISTS entidad text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS modalidad text,
  ADD COLUMN IF NOT EXISTS localidad text,
  ADD COLUMN IF NOT EXISTS provincia text,
  ADD COLUMN IF NOT EXISTS certificacion_tipo text,
  ADD COLUMN IF NOT EXISTS certificacion_oficial boolean,
  ADD COLUMN IF NOT EXISTS practicas_empresa boolean,
  ADD COLUMN IF NOT EXISTS horas_totales integer,
  ADD COLUMN IF NOT EXISTS horas_practicas integer,
  ADD COLUMN IF NOT EXISTS fecha_inicio date,
  ADD COLUMN IF NOT EXISTS fecha_fin date,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS coste text,
  ADD COLUMN IF NOT EXISTS requisitos_resumen text,
  ADD COLUMN IF NOT EXISTS encaje_daw_1_5 integer,
  ADD COLUMN IF NOT EXISTS prioridad text DEFAULT 'media' CHECK (prioridad IN ('Alta','Media','Baja')),
  ADD COLUMN IF NOT EXISTS tags text;
```

Para `hackathons`:
```sql
ALTER TABLE public.hackathons
  ADD COLUMN IF NOT EXISTS id_slug text,
  ADD COLUMN IF NOT EXISTS modalidad text,
  ADD COLUMN IF NOT EXISTS localidad text,
  ADD COLUMN IF NOT EXISTS inscripcion_hasta date,
  ADD COLUMN IF NOT EXISTS certificacion_o_premio text,
  ADD COLUMN IF NOT EXISTS practicas_empresa boolean,
  ADD COLUMN IF NOT EXISTS encaje_daw_1_5 integer,
  ADD COLUMN IF NOT EXISTS tags text;
```

### TAREA 2: Scripts de importación

Crea `scripts/import-courses.mjs` siguiendo el mismo patrón de `scripts/import-tech-opportunities.mjs`:
- Lee `csv/cursos_formacion_granada_online_supabase.csv`
- Mapea columnas del CSV a columnas de la tabla `courses`
- Hace upsert en Supabase usando `id_slug` como identificador único (en el campo `id` o `notes`)
- Requiere en env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TARGET_USER_EMAIL` (para asignar user_id)
- Muestra resumen: insertados, actualizados, errores
- Añade a `package.json` el script: `"import:courses": "node scripts/import-courses.mjs"`

Crea `scripts/import-hackathons.mjs` con el mismo patrón:
- Lee `csv/eventos_hackathons_supabase_actualizado.csv`
- Mapea columnas a tabla `hackathons`
- Upsert con `id_slug` como clave
- Script: `"import:hackathons": "node scripts/import-hackathons.mjs"`

Mapeos de columnas CSV → Supabase:

**cursos:**
- nombre → title
- entidad → platform (o entidad si la añades)
- fuente_url → url
- coste → price (si es numérico) o notes
- estado → status (mapear: "En plazo" → "pendiente", "Terminado" → "terminado", etc.)
- fecha_inicio → start_date
- fecha_fin → deadline
- notas → notes

**hackathons:**
- nombre → name
- entidad → organizer
- provincia → province
- localidad → city
- tipo → type
- estado → status (mapear a los valores del CHECK constraint)
- fecha_inicio → event_start_date
- fecha_fin → event_end_date
- inscripcion_hasta → registration_deadline
- fuente_url → url
- notas → notes
- prioridad → priority (Alta/Media/Baja → alta/media/baja lowercase)

### TAREA 3: Actualizar el frontend para mostrar los campos nuevos

En `components/guest-app.tsx`:

**En la vista Courses (función `Courses`):**
- Mostrar `entidad` / `platform` debajo del título
- Mostrar badge con `prioridad`
- Mostrar `encaje_daw_1_5` como estrellas o número (ej: "⭐ 5/5")
- Mostrar `modalidad` y `localidad` si existen
- Mostrar `horas_totales` si existe
- Mostrar `tags` como badges separados por `|`
- Mostrar `certificacion_tipo` si existe
- En el tipo `Course` (ya definido en guest-app.tsx cerca de la línea 100), añadir los campos opcionales que falten

**En la vista Hackathons (función `Hackathons`):**
- Mostrar `localidad` además de `province`
- Mostrar badge con `prioridad`
- Mostrar `encaje_daw_1_5` como número
- Mostrar `certificacion_o_premio` si existe
- Mostrar `tags` como badges
- En el tipo `Hackathon`, añadir los campos opcionales que falten

### TAREA 4: Actualizar getGlobalStore() en lib/data.ts

Asegúrate de que la query de Supabase para `courses` y `hackathons` incluye los campos nuevos. Actualmente hace `select("*")` así que debería funcionar, pero verifica que el mapeo en `getGlobalStore()` pase los campos nuevos al store sin perderlos.

---

REGLAS ESTRICTAS:
1. TypeScript estricto — no uses `any` salvo donde ya existe
2. No añadas `revalidatePath("/dashboard")` en ninguna action
3. Los scripts de importación son Node.js puro (no Next.js) — usa `@supabase/supabase-js` directamente con `process.env`
4. El usuario del sistema es `webdaniel2025@gmail.com` — los scripts deben buscar el user_id por ese email usando `supabase.auth.admin.listUsers()` o la tabla `profiles`
5. No toques los fixes de BlocView, StoreProvider, ni news/store.ts
6. `npx tsc --noEmit` debe dar 0 errores al final
7. `npx next build` debe dar 0 warnings al final

---

VERIFICACIÓN FINAL:
Después de implementar, ejecuta:
1. `node scripts/import-courses.mjs` — verifica que importa datos
2. `node scripts/import-hackathons.mjs` — verifica que importa datos
3. Abre /courses en el browser — verifica que aparecen los cursos con todos los campos
4. Abre /hackathons en el browser — verifica que aparecen los hackathons
5. `npx tsc --noEmit` — 0 errores
6. `npx next build` — 0 warnings
```

---

## 6. Estado actual del proyecto

| Feature | Estado |
|---|---|
| Login / Auth | ✅ Funciona |
| Dashboard principal | ✅ Funciona (paste fix aplicado) |
| Tareas (board kanban) | ✅ Funciona |
| Bloc (notas rápidas) | ✅ Reescrito, persiste correctamente |
| Settings | ✅ Con displayName, defaultBucket, compactView |
| Noticias | ✅ 221 artículos, API no explota en Vercel |
| Cursos | ⚠️ Vista existe, datos vacíos (CSV no importado) |
| Hackathons | ⚠️ Vista existe, datos vacíos (CSV no importado) |
| Oportunidades Tech | ⚠️ Tabla creada, script existe, pendiente de ejecutar |
| Build | ✅ 0 errores, 0 warnings |
| TypeScript | ✅ 0 errores |
