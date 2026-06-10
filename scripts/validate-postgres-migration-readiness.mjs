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
  check("al_lio_postgres definido", compose.includes("al_lio_postgres"));
  check("al_lio_postgres_data volumen", compose.includes("al_lio_postgres_data"));
  check("al_lio_internal red interna", compose.includes("al_lio_internal"));
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

console.log("\n── Archivos Fase 2 ──");
check(
  "infra/docker-compose.postgres-sandbox.yml existe",
  existsSync(join(root, "infra/docker-compose.postgres-sandbox.yml"))
);
check(
  "scripts/validate-postgres-schema-sandbox.mjs existe",
  existsSync(join(root, "scripts/validate-postgres-schema-sandbox.mjs"))
);
check(
  "infra/postgres/fixtures/minimal-sandbox-seed.sql existe",
  existsSync(join(root, "infra/postgres/fixtures/minimal-sandbox-seed.sql"))
);
check(
  "docs/POSTGRES_MIGRATION_PHASE_2.md existe",
  existsSync(join(root, "docs/POSTGRES_MIGRATION_PHASE_2.md"))
);

const sandboxComposePath = join(root, "infra/docker-compose.postgres-sandbox.yml");
if (existsSync(sandboxComposePath)) {
  const sandboxCompose = readFileSync(sandboxComposePath, "utf8");
  check("compose sandbox: aidraft_postgres_sandbox definido", sandboxCompose.includes("aidraft_postgres_sandbox"));
  check("compose sandbox: postgres:17-alpine imagen", sandboxCompose.includes("postgres:17-alpine"));
  check("compose sandbox: pg_isready healthcheck", sandboxCompose.includes("pg_isready"));
  check("compose sandbox: puerto vinculado a 127.0.0.1 (no expuesto)", sandboxCompose.includes("127.0.0.1:54329"));
  check("compose sandbox: no hay secretos reales (aidraft_sandbox_password)",
    sandboxCompose.includes("aidraft_sandbox_password") || !sandboxCompose.match(/password:\s*[^\s]{20,}/)
  );
}

const seedPath = join(root, "infra/postgres/fixtures/minimal-sandbox-seed.sql");
if (existsSync(seedPath)) {
  const seed = readFileSync(seedPath, "utf8");
  check("fixtures: usa dominio .example.test (no email real)", seed.includes("example.test"));
  check("fixtures: no contiene emails reales obvios", !seed.match(/@(?!example\.test)[a-z0-9.-]+\.[a-z]{2,}/i));
}

console.log("\n── Archivos Fase 3A ──");
check(
  "scripts/migration/export-supabase-data.mjs existe",
  existsSync(join(root, "scripts/migration/export-supabase-data.mjs"))
);
check(
  "scripts/migration/import-sandbox-data.mjs existe",
  existsSync(join(root, "scripts/migration/import-sandbox-data.mjs"))
);
check(
  "scripts/migration/verify-sandbox-migration.mjs existe",
  existsSync(join(root, "scripts/migration/verify-sandbox-migration.mjs"))
);
check(
  "scripts/migration/validate-migration-artifacts.mjs existe",
  existsSync(join(root, "scripts/migration/validate-migration-artifacts.mjs"))
);
check(
  "docs/POSTGRES_MIGRATION_PHASE_3.md existe",
  existsSync(join(root, "docs/POSTGRES_MIGRATION_PHASE_3.md"))
);
check(
  "migration-artifacts/ en .gitignore",
  existsSync(join(root, ".gitignore")) &&
  readFileSync(join(root, ".gitignore"), "utf8").includes("migration-artifacts")
);

const exportScriptPath = join(root, "scripts/migration/export-supabase-data.mjs");
if (existsSync(exportScriptPath)) {
  const exportScript = readFileSync(exportScriptPath, "utf8");
  check(
    "export script: requiere AL_LIO_ALLOW_SUPABASE_EXPORT",
    exportScript.includes("AL_LIO_ALLOW_SUPABASE_EXPORT")
  );
  check(
    "export script: guarda exige exactamente === \"true\"",
    exportScript.includes('AL_LIO_ALLOW_SUPABASE_EXPORT') &&
    exportScript.includes('!== "true"')
  );
  check(
    "export script: requiere AL_LIO_EXPORT_CONFIRMATION",
    exportScript.includes("AL_LIO_EXPORT_CONFIRMATION")
  );
  check(
    "export script: no imprime SUPABASE_DB_URL completa",
    !exportScript.includes("console.log(supabaseUrl") &&
    !exportScript.includes("console.error(supabaseUrl")
  );
}

const importScriptPath = join(root, "scripts/migration/import-sandbox-data.mjs");
if (existsSync(importScriptPath)) {
  const importScript = readFileSync(importScriptPath, "utf8");
  check(
    "import script: valida host sandbox antes de conectar",
    importScript.includes("ALLOWED_HOSTS") && importScript.includes("127.0.0.1")
  );
  check(
    "import script: usa transacción (BEGIN/COMMIT)",
    importScript.includes("BEGIN") && importScript.includes("COMMIT")
  );
}

console.log("\n── package.json scripts ──");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
check("script postgres:setup existe", Boolean(pkg.scripts?.["postgres:setup"]));
check("script validate:postgres-migration existe", Boolean(pkg.scripts?.["validate:postgres-migration"]));
check("script postgres:sandbox:up existe", Boolean(pkg.scripts?.["postgres:sandbox:up"]));
check("script postgres:schema:validate-sandbox existe", Boolean(pkg.scripts?.["postgres:schema:validate-sandbox"]));
check("script migration:export:supabase existe", Boolean(pkg.scripts?.["migration:export:supabase"]));
check("script migration:import:sandbox existe", Boolean(pkg.scripts?.["migration:import:sandbox"]));
check("script migration:validate:artifacts existe", Boolean(pkg.scripts?.["migration:validate:artifacts"]));

console.log("\n── Seguridad ──");
const envExample = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
check("No hay allowedHosts: true", !envExample.includes("allowedHosts: true"));
// Check non-comment, non-placeholder lines for long tokens that could be real secrets.
// Skips lines starting with # and lines whose value contains REPLACE_ME.
const suspiciousToken = envExample.split(/\r?\n/).some(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return false;
  const eq = trimmed.indexOf("=");
  if (eq === -1) return false;
  const value = trimmed.slice(eq + 1).trim();
  if (!value || value.includes("REPLACE_ME")) return false;
  return /[a-z0-9]{40,}/i.test(value);
});
check("No hay secretos reales obvios en .env.production.example", !suspiciousToken);

console.log("");
if (errors > 0) {
  console.error(`RESULTADO: ${errors} problema(s) encontrado(s).`);
  process.exit(1);
} else {
  console.log("RESULTADO: PostgreSQL migration readiness OK.");
}
