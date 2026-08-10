/** Validación estática del contrato de migraciones y seguridad Docker. */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadMigrationFiles } from "./postgres/migration-files.mjs";

const root = process.cwd();
let errors = 0;

function check(label, condition) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`  FAIL  ${label}`);
    errors += 1;
  }
}

let migrations = [];
try {
  migrations = loadMigrationFiles(root);
  check("baseline y migraciones cargan con checksum válido", true);
} catch (error) {
  console.error(`  FAIL  ${error instanceof Error ? error.message : String(error)}`);
  errors += 1;
}

for (const migration of migrations) {
  const destructive = /\b(drop\s+(table|schema)|truncate\s+table)\b/i.test(migration.sql);
  check(`${migration.version} no contiene DDL destructivo`, !destructive);
}

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
check("postgres:migrate usa el runner versionado", packageJson.scripts?.["postgres:migrate"] === "node scripts/postgres/migrate.mjs");
check("postgres:setup ya no aplica schema.sql directamente", !packageJson.scripts?.["postgres:setup"]?.includes("setup-postgres-schema"));
check(
  "la reconciliación legacy usa un comando explícito",
  packageJson.scripts?.["postgres:baseline:reconcile"] === "node scripts/postgres/reconcile-baseline.mjs",
);

const reconciler = readFileSync(join(root, "scripts", "postgres", "reconcile-baseline.mjs"), "utf8");
check("la reconciliación exige confirmación", reconciler.includes("RECONCILE_0001_INITIAL_SCHEMA"));
check("la reconciliación no registra el baseline", !reconciler.includes("INSERT INTO public.schema_migrations"));

const dockerignorePath = join(root, ".dockerignore");
check(".dockerignore existe", existsSync(dockerignorePath));
if (existsSync(dockerignorePath)) {
  const dockerignore = readFileSync(dockerignorePath, "utf8");
  check(".dockerignore excluye .env", /^\.env$/m.test(dockerignore));
  check(".dockerignore excluye .git", /^\.git$/m.test(dockerignore));
  check(".dockerignore excluye dumps", /^\*\.dump$/m.test(dockerignore));
  check(".dockerignore excluye node_modules", /^node_modules$/m.test(dockerignore));
}

const compose = readFileSync(join(root, "infra", "docker-compose.prod.yml"), "utf8");
const dockerfile = readFileSync(join(root, "infra", "Dockerfile"), "utf8");
const webService = compose.split("  al_lio_migrator:")[0];
check("el contenedor web no recibe DATABASE_MIGRATION_URL", !/^\s+DATABASE_MIGRATION_URL:/m.test(webService));
check("las credenciales admin solo viven en el perfil ops", compose.includes('profiles: ["ops"]') && compose.includes("DATABASE_MIGRATION_URL:"));
check("el healthcheck usa readiness con PostgreSQL", compose.includes("/api/ready"));
check("la imagen también usa readiness con PostgreSQL", dockerfile.includes("/api/ready"));
check("Noticias usa un volumen persistente", compose.includes("al_lio_news_data:/app/data"));
check("la red PostgreSQL conserva su nombre estable", compose.includes("name: al_lio_backend_internal"));
check("la red PostgreSQL es interna", compose.includes("internal: true"));
check("el runtime web conserva filesystem de solo lectura", webService.includes("read_only: true"));
check("el runtime web mantiene límites de recursos", webService.includes("pids_limit:") && webService.includes("mem_limit:"));

if (errors > 0) {
  console.error(`\nRESULTADO: ${errors} problema(s) de migración/despliegue.`);
  process.exit(1);
}

console.log("\nRESULTADO: contrato de migraciones y Docker OK.");
