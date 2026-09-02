import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function requireIncludes(file, content, expected) {
  if (!content.includes(expected)) fail(`${file} debe contener: ${expected}`);
}

const schema = read("infra/postgres/schema.sql");
const coursesFeature = read("src/features/courses/client/courses-catalogue.tsx");
const eventsFeature = read("src/features/events/client/hackathons-catalogue.tsx");
const calendarFeature = read("src/features/calendar/client/calendar-event-source.ts");
const applicationStore = read("src/shared/store/application-store.tsx");
const storeTypes = read("src/components/store/types.ts");
const taskActions = read("src/features/tasks/server/actions.ts");

const requiredTables = [
  "tasks",
  "courses",
  "hackathons",
  "tech_opportunities",
  "quick_links",
  "opportunities",
  "fp_cycles",
  "fp_content_items",
  "fp_content_cycle_fit",
  "fp_user_content_state",
];
for (const table of requiredTables) {
  requireIncludes("infra/postgres/schema.sql", schema, `create table if not exists public.${table}`);
}

const requiredCourseColumns = [
  "id_slug",
  "entidad",
  "area",
  "modalidad",
  "localidad",
  "provincia",
  "certificacion_tipo",
  "practicas_empresa",
  "horas_totales",
  "horas_practicas",
  "fecha_inicio",
  "fecha_fin",
  "encaje_daw_1_5",
  "prioridad",
  "tags",
  "fuente_url",
];

const requiredHackathonColumns = [
  "id_slug",
  "modalidad",
  "localidad",
  "inscripcion_hasta",
  "certificacion_o_premio",
  "practicas_empresa",
  "encaje_daw_1_5",
  "tags",
];

const requiredTechOpportunityColumns = [
  "id_slug",
  "categoria",
  "nombre",
  "entidad",
  "area_o_tipo",
  "fecha_inicio",
  "fecha_fin",
  "prioridad",
  "fuente_url",
];

for (const column of requiredCourseColumns) requireIncludes("infra/postgres/schema.sql", schema, column);
for (const column of requiredHackathonColumns) requireIncludes("infra/postgres/schema.sql", schema, column);
for (const column of requiredTechOpportunityColumns) requireIncludes("infra/postgres/schema.sql", schema, column);

for (const column of ["cycle_code", "cycle_group", "academic_year", "interests", "onboarding_completed_at"]) {
  requireIncludes("infra/postgres/schema.sql", schema, column);
}

requireIncludes("src/components/store/types.ts", storeTypes, 'export type TaskPriority = "alta" | "media" | "baja" | "critica"');
requireIncludes("src/features/tasks/server/actions.ts", taskActions, 'patch.priority === "critica" ? "alta" : patch.priority');
requireIncludes("src/shared/store/application-store.tsx", applicationStore, "export function ApplicationStoreProvider");
requireIncludes("src/shared/store/application-store.tsx", applicationStore, "export function useApplicationStore");
requireIncludes("src/features/courses/client/courses-catalogue.tsx", coursesFeature, "getDisplayCourses(store.courses, store.techOpportunities, store.fpContent)");
requireIncludes("src/features/events/client/hackathons-catalogue.tsx", eventsFeature, "getDisplayHackathons(store.hackathons, store.techOpportunities, store.fpContent)");
requireIncludes("src/features/calendar/client/calendar-event-source.ts", calendarFeature, "...store.techOpportunities.flatMap(techOpportunityToCalendarEvents)");

const featureSources = coursesFeature + eventsFeature + calendarFeature;
if (featureSources.includes("createContext") || featureSources.includes("function StoreProvider") || featureSources.includes("function useStore")) {
  fail("Las features no deben volver a definir el store autenticado");
}

if (taskActions.includes('revalidatePath("/dashboard")') || featureSources.includes('revalidatePath("/dashboard")')) {
  fail('No debe existir revalidatePath("/dashboard"); rompe foco y refresca el layout completo');
}

if (process.exitCode) process.exit(process.exitCode);

console.log("OK: auditoria schema/codigo completada.");
