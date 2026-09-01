/**
 * AL-LIO static PostgreSQL application-integration validator.
 * It requires no live connection and checks code structure only.
 * Uso: node scripts/validate-postgres-app-integration.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
let errors = 0;

function ok(msg)   { console.log(`  OK  ${msg}`); }
function fail(msg) { console.error(`  FAIL  ${msg}`); errors++; }
function check(label, condition) { condition ? ok(label) : fail(label); }
function read(path) { return existsSync(join(root, path)) ? readFileSync(join(root, path), "utf-8") : ""; }

// ── Repositorios existen ──────────────────────────────────────────────────────

console.log("\n── Repositorios PostgreSQL ──");
const REPOS = [
  "src/lib/db/repositories/users.ts",
  "src/lib/db/repositories/profiles.ts",
  "src/lib/db/repositories/sources.ts",
  "src/lib/db/repositories/reminders.ts",
  "src/lib/db/repositories/tech_opportunities.ts",
  "src/features/tasks/server/repository.ts",
  "src/features/courses/server/repository.ts",
  "src/features/events/server/repository.ts",
  "src/features/bloc/server/repository.ts",
  "src/features/work/server/repository.ts",
  "src/features/work/server/opportunity-repository.ts",
  "src/features/resources/server/repository.ts",
  "src/features/learning/server/catalogue-repository.ts",
  "src/features/learning/server/repository.ts",
];
for (const repo of REPOS) {
  check(`${repo} existe`, existsSync(join(root, repo)));
  const content = read(repo);
  check(`${repo}: import server-only`, content.includes("server-only"));
  check(`${repo}: no usa supabase`, !content.includes("@supabase") && !content.includes("supabase/"));
  check(`${repo}: usa query de pool`, content.includes('from "@/lib/db/pool"'));
}

// ── lib/auth/current-user.ts ──────────────────────────────────────────────────

console.log("\n── lib/auth/current-user.ts ──");
const cu = read("src/lib/auth/current-user.ts");
check("src/lib/auth/current-user.ts existe", existsSync(join(root, "src/lib/auth/current-user.ts")));
check("getCurrentUserId exportado", cu.includes("export async function getCurrentUserId"));
check("tryGetCurrentUserId exportado", cu.includes("export async function tryGetCurrentUserId"));
check("server-only importado", cu.includes("server-only"));

// Issue #132: identity (login) and Calendar consent are separate trust
// boundaries. Only the identity callback may create a PostgreSQL user or a
// session; the Calendar callback must require one to already exist.

console.log("\nGoogle identity callback (login)");
const googleIdentityCallback = read("src/app/api/auth/google/callback/route.ts");
check("Google identity callback existe", existsSync(join(root, "src/app/api/auth/google/callback/route.ts")));
check("Google identity callback resuelve/crea el usuario", googleIdentityCallback.includes("resolveOrProvisionGoogleUser"));
check("Google identity callback crea sesion propia", googleIdentityCallback.includes("createSession"));
check("Google identity callback no usa Supabase", !googleIdentityCallback.includes("@supabase") && !googleIdentityCallback.includes("supabase/"));

console.log("\nGoogle Calendar callback (consent only)");
const googleCalendarCallback = read("src/app/api/google/calendar/callback/route.ts");
check("Google Calendar callback existe", existsSync(join(root, "src/app/api/google/calendar/callback/route.ts")));
check("Google Calendar callback exige sesion validada contra PostgreSQL", googleCalendarCallback.includes("getValidatedSession"));
check("Google Calendar callback ya no crea el usuario", !googleCalendarCallback.includes("ensureUserByEmail"));
check("Google Calendar callback ya no crea sesion", !googleCalendarCallback.includes("createSession"));
check("Google Calendar callback no usa Supabase", !googleCalendarCallback.includes("@supabase") && !googleCalendarCallback.includes("supabase/"));

// ── lib/data.ts usa PostgreSQL ────────────────────────────────────────────────

console.log("\n── lib/data.ts ──");
const data = read("src/lib/data.ts");
const dashboardLayout = read("src/app/(dashboard)/layout.tsx");
const dashboardPage = read("src/app/(dashboard)/dashboard/page.tsx");
const tasksLayout = read("src/app/(tasks)/layout.tsx");
const privateAppLayout = read("src/components/private-app-layout.tsx");
check("src/lib/data.ts importa repositorios con dueño", data.includes("@/features/") && data.includes("/server/"));
check("src/lib/data.ts no usa .from() de Supabase para datos", !data.includes(".from(\"tasks\"") && !data.includes(".from(\"courses\"") && !data.includes(".from(\"hackathons\""));
check("La aplicacion autenticada usa un loader global cacheado", data.includes("export const getGlobalStore = cache(async () =>"));
check("El loader global deriva el usuario de la sesion", data.includes("const userId = session.uid"));
check("El loader global conserva fallbacks por seccion", data.includes("loadStoreSection") && data.includes("loadIssues: [...new Set(issues)]"));
check("El shell privado monta el store autenticado una sola vez", privateAppLayout.includes("<ApplicationStoreProvider initialStore={store}>") && !privateAppLayout.includes("getShellStore") && dashboardLayout.includes("<PrivateAppLayout loadStore={getGlobalStore}>") && !dashboardLayout.includes("<ApplicationStoreProvider"));
check("Dashboard reutiliza el store del layout", !dashboardPage.includes("getGlobalStore") && !dashboardPage.includes("getDashboardStore") && dashboardPage.includes("<DashboardClient />"));

console.log("\n── Aislamiento de contenido FP ──");
const fpCatalog = read("src/features/learning/server/catalogue-repository.ts");
const manifest = read("src/app/manifest.ts");
const resourceActions = read("src/features/learning/server/actions.ts");
const learningRepository = read("src/features/learning/server/repository.ts");
const learningActions = read("src/features/learning/server/player-actions.ts");
const techOpportunities = read("src/lib/db/repositories/tech_opportunities.ts");
check("El catalogo filtra por cycle_code exacto", fpCatalog.includes('"fit.cycle_code = $3"'));
check("Los recursos formativos filtran por cycle_code", fpCatalog.includes("AND fit.cycle_code = $2"));
check("El manifiesto PWA fuerza una apariencia clara", manifest.includes("background_color: '#f8f6f1'") && manifest.includes("theme_color: '#ffffff'"));
check("Existe consulta de recurso autorizada por ciclo", fpCatalog.includes("getFpContentItemBySlugForCycle"));
check("Las acciones consultan el perfil antes del recurso", resourceActions.includes("getProfileByUser") && resourceActions.includes("getFpContentItemBySlugForCycle"));
check("Los cursos de competencias filtran por ciclo", learningRepository.includes("competency.cycle_code=$3"));
check("El progreso valida usuario y ciclo antes de escribir", learningActions.includes("getAuthorizedResource") && learningActions.includes("getLearningResourceForCycle"));
check("La reproducción persiste la posición", learningRepository.includes("last_position_seconds"));
check("Cada grupo de rutas autenticadas renderiza a traves del shell privado compartido", dashboardLayout.includes("<PrivateAppLayout loadStore={getGlobalStore}>") && tasksLayout.includes("<PrivateAppLayout loadStore={") && privateAppLayout.includes("ApplicationStoreProvider"));
check("Existe boundary de error del dashboard", existsSync(join(root, "src/app/(dashboard)/error.tsx")));
check("Los grados FP no se sirven como cursos complementarios", techOpportunities.includes("<> 'fp'"));

// Product mutations must be explicit and feature-owned. The former generic
// table/column write surface is intentionally forbidden.
console.log("\n── Feature-owned mutations ──");
check("src/lib/actions.ts no existe", !existsSync(join(root, "src/lib/actions.ts")));
check("src/lib/db.ts no existe", !existsSync(join(root, "src/lib/db.ts")));
for (const feature of ["tasks", "courses", "events", "bloc", "work"]) {
  const featureActions = read(`src/features/${feature}/server/actions.ts`);
  check(`${feature}: acciones validan con Zod`, featureActions.includes('from "zod"'));
  check(`${feature}: acciones derivan el usuario de sesión`, featureActions.includes("getCurrentUserId") || featureActions.includes("getValidatedSession"));
  check(`${feature}: no acepta tabla o columna del cliente`, !featureActions.includes("table:") && !featureActions.includes("Object.keys(data)"));
}

// ── set-user-password requires explicit confirmation ─────────────────────────

console.log("\n── scripts/postgres/set-user-password.mjs ──");
const setpwd = read("scripts/postgres/set-user-password.mjs");
check("set-user-password.mjs existe", existsSync(join(root, "scripts/postgres/set-user-password.mjs")));
check("set-user-password: requiere AL_LIO_SET_PASSWORD_CONFIRMATION", setpwd.includes("AL_LIO_SET_PASSWORD_CONFIRMATION"));
check("set-user-password: no imprime password", !setpwd.includes("console.log(password") && !setpwd.includes("console.log(AL_LIO_USER_PASSWORD"));
check("set-user-password: no imprime DATABASE_URL", !setpwd.includes("console.log(dbUrl") && !setpwd.includes("console.log(DATABASE_URL"));
check("set-user-password: usa bcryptjs", setpwd.includes("bcryptjs"));

// ── Seguridad staged ──────────────────────────────────────────────────────────

console.log("\n── Git staged — seguridad ──");
let staged = "";
try {
  staged = execSync("git diff --cached --name-only", { cwd: root, encoding: "utf-8" });
} catch {
  // ok if not in git
}
const stagedFiles = staged.split("\n").filter(Boolean);
check("No hay .env staged", !stagedFiles.includes(".env"));
check("No hay migration-artifacts/ staged", !stagedFiles.some(f => f.startsWith("migration-artifacts/")));
check("No hay dumps staged", !stagedFiles.some(f => f.endsWith(".dump") || f.endsWith(".backup")));

// ── Resultado ─────────────────────────────────────────────────────────────────

console.log("");
if (errors > 0) {
  console.error(`RESULTADO: ${errors} problema(s) encontrado(s).`);
  process.exit(1);
} else {
  console.log("RESULTADO: PostgreSQL app integration OK.");
}
