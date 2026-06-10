/**
 * Validador estático de migración PostgreSQL — Fase 1.
 * No requiere conexión real. Solo comprueba estructura local.
 * Uso: node scripts/validate-postgres-migration-readiness.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let errors = 0;

function ok(msg) { console.log(`  OK  ${msg}`); }
function fail(msg) { console.error(`  FAIL  ${msg}`); errors++; }
function check(label, condition, hint) {
  condition ? ok(label) : fail(hint || label);
}

console.log("\n── Archivos de infraestructura ──");
check("infra/postgres/schema.sql existe", existsSync(join(root, "infra/postgres/schema.sql")));
check("lib/db/pool.ts existe", existsSync(join(root, "lib/db/pool.ts")));
check("scripts/setup-postgres-schema.mjs existe", existsSync(join(root, "scripts/setup-postgres-schema.mjs")));

console.log("\n── docker-compose.prod.yml ──");
const composePath = join(root, "infra/docker-compose.prod.yml");
if (existsSync(composePath)) {
  const compose = readFileSync(composePath, "utf8");
  check("aidraft_postgres definido", compose.includes("aidraft_postgres"));
  check("aidraft_postgres_data volumen", compose.includes("aidraft_postgres_data"));
  check("aidraft_internal red interna", compose.includes("aidraft_internal"));
  check("postgres:17-alpine imagen", compose.includes("postgres:17-alpine"));
  check("pg_isready healthcheck", compose.includes("pg_isready"));
  check("POSTGRES_PASSWORD variable", compose.includes("POSTGRES_PASSWORD"));
} else {
  fail("infra/docker-compose.prod.yml no existe");
}

console.log("\n── .env.production.example ──");
const envPath = join(root, ".env.production.example");
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf8");
  check("DATABASE_URL definida", env.includes("DATABASE_URL"));
  check("POSTGRES_PASSWORD definida", env.includes("POSTGRES_PASSWORD"));
  check("Nota de migración Supabase presente", env.includes("Supabase variables are kept temporarily"));
  check("No hay secretos reales (no REPLACE_ME vacío)", !env.match(/^[A-Z_]+=$/m));
} else {
  fail(".env.production.example no existe");
}

console.log("\n── schema SQL ──");
const schemaPath = join(root, "infra/postgres/schema.sql");
if (existsSync(schemaPath)) {
  const schema = readFileSync(schemaPath, "utf8");
  // Strip SQL line comments before checking for forbidden patterns
  const schemaNoComments = schema.split("\n").filter(l => !l.trimStart().startsWith("--")).join("\n");
  check("Tabla users creada", schema.includes("create table if not exists public.users"));
  check("Sin referencias a auth.users", !schemaNoComments.includes("auth.users"));
  check("Sin auth.uid()", !schemaNoComments.includes("auth.uid()"));
  check("Sin RLS (enable row level security)", !schema.includes("enable row level security"));
  check("Trigger updated_at presente", schema.includes("set_updated_at"));
  check("Tabla tasks presente", schema.includes("create table if not exists public.tasks"));
  check("Tabla opportunities presente", schema.includes("create table if not exists public.opportunities"));
  check("users.password_hash columna", schema.includes("password_hash"));
}

console.log("\n── lib/db/pool.ts ──");
const poolPath = join(root, "lib/db/pool.ts");
if (existsSync(poolPath)) {
  const pool = readFileSync(poolPath, "utf8");
  check("Importa Pool de pg", pool.includes("from \"pg\""));
  check("Lee DATABASE_URL", pool.includes("DATABASE_URL"));
  check("Lanza error si falta DATABASE_URL", pool.includes("throw new Error"));
  check("Exporta query helper", pool.includes("export async function query"));
  check("No loguea connectionString", !pool.includes("console.log(connectionString"));
}

console.log("\n── package.json scripts ──");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
check("script postgres:setup existe", Boolean(pkg.scripts?.["postgres:setup"]));
check("script validate:postgres-migration existe", Boolean(pkg.scripts?.["validate:postgres-migration"]));

console.log("\n── Seguridad ──");
const envExample = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
check("No hay allowedHosts: true", !envExample.includes("allowedHosts: true"));
const noSecrets = !envExample.match(/[a-z0-9]{40,}/i) || envExample.includes("REPLACE_ME");
check("No hay secretos reales obvios en .env.production.example", noSecrets);

console.log("");
if (errors > 0) {
  console.error(`RESULTADO: ${errors} problema(s) encontrado(s).`);
  process.exit(1);
} else {
  console.log("RESULTADO: PostgreSQL migration readiness OK.");
}
