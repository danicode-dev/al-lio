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

const radarMigration = migrations.find((migration) => migration.version === "0002_radar_news");
check("existe migración versionada del radar", Boolean(radarMigration));
if (radarMigration) {
  check("la migración crea entregas e ítems", radarMigration.sql.includes("radar_deliveries") && radarMigration.sql.includes("radar_items"));
  check("la migración crea estado por usuario", radarMigration.sql.includes("radar_item_user_states"));
  check("la migración restringe ciclos FP", radarMigration.sql.includes("radar_items_cycle_codes_valid"));
  check("la migración exige auditoría humana", radarMigration.sql.includes("radar_items_review_audit_required"));
}

const learningMigration = migrations.find((migration) => migration.version === "0003_learning_competencies");
check("existe migración versionada de competencias", Boolean(learningMigration));
if (learningMigration) {
  check("la migración separa competencias y recursos", learningMigration.sql.includes("fp_learning_competencies") && learningMigration.sql.includes("fp_learning_resources"));
  check("la migración persiste reanudación", learningMigration.sql.includes("last_position_seconds"));
  check("la migración persiste notas privadas", learningMigration.sql.includes("fp_learning_notes"));
  check("la migración restringe recursos al español", learningMigration.sql.includes("language = 'es'"));
  check("la migración exige trazabilidad editorial", learningMigration.sql.includes("reviewed_by") && learningMigration.sql.includes("review_reason"));
}

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
check("postgres:migrate usa el runner versionado", packageJson.scripts?.["postgres:migrate"] === "node scripts/postgres/migrate.mjs");
check("existe importador versionado de competencias", packageJson.scripts?.["import:learning-competencies"] === "node scripts/import-learning-competencies.mjs");
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
const deployRunbook = readFileSync(join(root, "docs", "DEPLOY_VPS.md"), "utf8");
const webService = compose.split("  al_lio_migrator:")[0];
check("el contenedor web no recibe DATABASE_MIGRATION_URL", !/^\s+DATABASE_MIGRATION_URL:/m.test(webService));
check("las credenciales admin solo viven en el perfil ops", compose.includes('profiles: ["ops"]') && compose.includes("DATABASE_MIGRATION_URL:"));
check("el healthcheck usa readiness con PostgreSQL", compose.includes("/api/ready"));
check("la imagen también usa readiness con PostgreSQL", dockerfile.includes("/api/ready"));
check("la imagen conserva bcryptjs para operaciones controladas", dockerfile.includes("/app/node_modules/bcryptjs"));
check("Noticias ya no depende de JSON local", !compose.includes("al_lio_news_data:/app/data"));
check("la red PostgreSQL conserva su nombre estable", compose.includes("name: al_lio_backend_internal"));
check("la red PostgreSQL es interna", compose.includes("internal: true"));
check("el runtime web conserva filesystem de solo lectura", webService.includes("read_only: true"));
check("el runtime web mantiene límites de recursos", webService.includes("pids_limit:") && webService.includes("mem_limit:"));
check("el runbook importa competencias tras migrar", deployRunbook.includes("node scripts/import-learning-competencies.mjs"));

if (errors > 0) {
  console.error(`\nRESULTADO: ${errors} problema(s) de migración/despliegue.`);
  process.exit(1);
}

console.log("\nRESULTADO: contrato de migraciones y Docker OK.");
