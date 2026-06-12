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
const guestApp = read("components/guest-app.tsx");
const actions = read("lib/actions.ts");

const requiredTables = ["tasks", "courses", "hackathons", "tech_opportunities", "quick_links", "opportunities"];
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

requireIncludes("components/guest-app.tsx", guestApp, 'type TaskPriority = "alta" | "media" | "baja" | "critica"');
requireIncludes("components/guest-app.tsx", guestApp, 'return normalized === "critica" ? "alta" : normalized');
requireIncludes("components/guest-app.tsx", guestApp, "getDisplayCourses(store.courses, store.techOpportunities)");
requireIncludes("components/guest-app.tsx", guestApp, "getDisplayHackathons(store.hackathons, store.techOpportunities)");
requireIncludes("components/guest-app.tsx", guestApp, "...store.techOpportunities.flatMap(techOpportunityToCalendarEvents)");

if (actions.includes('revalidatePath("/dashboard")') || guestApp.includes('revalidatePath("/dashboard")')) {
  fail('No debe existir revalidatePath("/dashboard"); rompe foco y refresca el layout completo');
}

if (process.exitCode) process.exit(process.exitCode);

console.log("OK: auditoria schema/codigo completada.");
