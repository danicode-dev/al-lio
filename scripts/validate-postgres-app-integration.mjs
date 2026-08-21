/**
 * al-lio — validador estático de integración PostgreSQL app.
 * No requiere conexión real. Solo comprueba estructura de código.
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
  "src/lib/db/repositories/quick_searches.ts",
  "src/lib/db/repositories/opportunities.ts",
  "src/lib/db/repositories/hackathons.ts",
  "src/lib/db/repositories/courses.ts",
  "src/lib/db/repositories/tasks.ts",
  "src/lib/db/repositories/reminders.ts",
  "src/lib/db/repositories/quick_links.ts",
  "src/lib/db/repositories/tech_opportunities.ts",
  "src/lib/db/repositories/fp_catalog.ts",
  "src/lib/db/repositories/fp_resource_notes.ts",
  "src/lib/db/repositories/bloc_notes.ts",
  "src/lib/db/repositories/companies.ts",
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

// Google OAuth callback creates the PostgreSQL user.

console.log("\nGoogle OAuth callback");
const googleCallback = read("src/app/api/google/calendar/callback/route.ts");
check("Google callback existe", existsSync(join(root, "src/app/api/google/calendar/callback/route.ts")));
check("Google callback usa ensureUserByEmail", googleCallback.includes("ensureUserByEmail"));
check("Google callback usa upsertProfile", googleCallback.includes("upsertProfile"));
check("Google callback crea sesion propia", googleCallback.includes("createSession"));
check("Google callback no usa Supabase", !googleCallback.includes("@supabase") && !googleCallback.includes("supabase/"));

// ── lib/data.ts usa PostgreSQL ────────────────────────────────────────────────

console.log("\n── lib/data.ts ──");
const data = read("src/lib/data.ts");
check("src/lib/data.ts importa repositorios", data.includes("@/lib/db/repositories/"));
check("src/lib/data.ts no usa .from() de Supabase para datos", !data.includes(".from(\"tasks\"") && !data.includes(".from(\"courses\"") && !data.includes(".from(\"hackathons\""));
check("Dashboard usa un loader especifico", data.includes("export async function getDashboardStore"));
check("Shell usa un loader minimo y tolerante", data.includes("export const getShellStore"));

console.log("\n── Aislamiento de contenido FP ──");
const fpCatalog = read("src/lib/db/repositories/fp_catalog.ts");
const resourceActions = read("src/lib/fp/resource-notes-actions.ts");
const dashboardLayout = read("src/app/(dashboard)/layout.tsx");
check("El catalogo filtra por cycle_code exacto", fpCatalog.includes('"fit.cycle_code = $3"'));
check("Los recursos formativos filtran por cycle_code", fpCatalog.includes("AND fit.cycle_code = $2"));
check("Existe consulta de recurso autorizada por ciclo", fpCatalog.includes("getFpContentItemBySlugForCycle"));
check("Las acciones consultan el perfil antes del recurso", resourceActions.includes("getProfileByUser") && resourceActions.includes("getFpContentItemBySlugForCycle"));
check("El layout no carga el store global completo", dashboardLayout.includes("getShellStore") && !dashboardLayout.includes("getGlobalStore"));
check("Existe boundary de error del dashboard", existsSync(join(root, "src/app/(dashboard)/error.tsx")));

// ── lib/actions.ts usa repositorios para datos ────────────────────────────────

console.log("\n── lib/actions.ts ──");
const actions = read("src/lib/actions.ts");
check("src/lib/actions.ts importa repositorios", actions.includes("@/lib/db/repositories/"));
check("src/lib/actions.ts importa getCurrentUserId", actions.includes("getCurrentUserId"));
check("src/lib/actions.ts no usa .from() de Supabase para datos (tasks/courses/etc)", !actions.includes('.from("tasks")') && !actions.includes('.from("courses")') && !actions.includes('.from("hackathons")'));
check(
  "src/lib/actions.ts no upsertea profiles en Supabase",
  !actions.includes('.from("profiles")') &&
  !actions.includes(".from('profiles')") &&
  !actions.includes(".from(`profiles`)") &&
  !actions.includes('profiles").upsert') &&
  !actions.includes("profiles').upsert")
);

// ── lib/db.ts usa PostgreSQL ──────────────────────────────────────────────────

console.log("\n── lib/db.ts ──");
const db = read("src/lib/db.ts");
check("src/lib/db.ts usa query de pool", db.includes('from "@/lib/db/pool"'));
check("src/lib/db.ts tiene whitelist de tablas", db.includes("WRITABLE_TABLES"));
check("src/lib/db.ts no usa supabase", !db.includes("createClient") || db.includes("// createClient"));
check("src/lib/db.ts no imprime connectionString", !db.includes("console.log(connectionString"));

// ── set-user-password requiere confirmación ───────────────────────────────────

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
