/** Statically validates the migration and Docker security contract. */

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

const learningBlocMigration = migrations.find((migration) => migration.version === "0004_learning_notes_to_bloc");
check("learning notes have a versioned Bloc migration", Boolean(learningBlocMigration));
if (learningBlocMigration) {
  check("Bloc notes keep a stable learning resource source", learningBlocMigration.sql.includes("source_type") && learningBlocMigration.sql.includes("source_id"));
  check("each user has one Bloc note per learning resource", learningBlocMigration.sql.includes("bloc_notes_user_source_unique_idx"));
  check("existing learning notes are backfilled into Bloc", learningBlocMigration.sql.includes("learning_note_groups") && learningBlocMigration.sql.includes("fp_learning_notes"));
}

const radarMultidestinationMigration = migrations.find((migration) => migration.version === "0005_radar_multidestination");
check("multidestination Radar migration exists", Boolean(radarMultidestinationMigration));
if (radarMultidestinationMigration) {
  check("Radar destinations and semantic keys are persisted", radarMultidestinationMigration.sql.includes("destination") && radarMultidestinationMigration.sql.includes("semantic_key"));
  check("global catalogue content is deduplicated", radarMultidestinationMigration.sql.includes("radar_semantic_key") && radarMultidestinationMigration.sql.includes("unique index"));
  check("course and event content is cycle-scoped", radarMultidestinationMigration.sql.includes("fp_content_cycle_fit") && radarMultidestinationMigration.sql.includes("target_cycle_codes"));
  check("existing Radar content is backfilled", radarMultidestinationMigration.sql.includes("insert into public.fp_content_items") && radarMultidestinationMigration.sql.includes("update public.radar_items"));
}

const competencyStateMigration = migrations.find((migration) => migration.version === "0006_fp_user_competency_state");
check("competency completion migration exists", Boolean(competencyStateMigration));
if (competencyStateMigration) {
  check("the migration creates fp_user_competency_state", competencyStateMigration.sql.includes("fp_user_competency_state"));
  check("completion is scoped to a user and a skill", competencyStateMigration.sql.includes("references public.users(id)") && competencyStateMigration.sql.includes("references public.fp_skills(id)"));
  check("the migration uses a composite primary key", competencyStateMigration.sql.includes("primary key (user_id, skill_id)"));
  check("the migration keeps updated_at current via a trigger", competencyStateMigration.sql.includes("set_fp_user_competency_state_updated_at"));
}

const radarV4Migration = migrations.find((migration) => migration.version === "0011_radar_v4_canonical_content");
check("Radar v4 canonical-content migration exists", Boolean(radarV4Migration));
if (radarV4Migration) {
  check(
    "Radar v4 separates entities, occurrences, immutable revisions and evidence",
    ["radar_content_entities", "radar_content_occurrences", "radar_content_revisions", "radar_content_field_evidence"]
      .every((table) => radarV4Migration.sql.includes(table)),
  );
  check(
    "Radar v4 stores typed targets and bounded current facts",
    radarV4Migration.sql.includes("radar_content_targets")
      && radarV4Migration.sql.includes("radar_content_current_facts"),
  );
  check(
    "publication, source lifecycle and ranking domains remain independent",
    radarV4Migration.sql.includes("publication_decision")
      && radarV4Migration.sql.includes("source_lifecycle_status")
      && radarV4Migration.sql.includes("ranking_priority"),
  );
  check(
    "identity aliases and compatibility links preserve student state",
    radarV4Migration.sql.includes("radar_content_identity_aliases")
      && radarV4Migration.sql.includes("legacy_fp_content_item_id"),
  );
  check(
    "ingest and projector outcomes are observable without raw secret storage",
    radarV4Migration.sql.includes("radar_ingest_events")
      && radarV4Migration.sql.includes("radar_projector_events")
      && !radarV4Migration.sql.includes("webhook_secret"),
  );
}

const trustworthyCatalogueMigration = migrations.find((migration) => migration.version === "0013_trustworthy_opportunity_catalogue");
check("trustworthy opportunity migration exists", Boolean(trustworthyCatalogueMigration));
if (trustworthyCatalogueMigration) {
  check(
    "legacy rows have an auditable classification instead of implicit publication",
    trustworthyCatalogueMigration.sql.includes("legacy_opportunity_migration_audit")
      && trustworthyCatalogueMigration.sql.includes("candidate_reverification")
      && trustworthyCatalogueMigration.sql.includes("source_only")
      && trustworthyCatalogueMigration.sql.includes("rejected_unverifiable"),
  );
  check(
    "verified legacy rows require a canonical occurrence",
    trustworthyCatalogueMigration.sql.includes("legacy_opportunity_verified_target_check")
      && trustworthyCatalogueMigration.sql.includes("canonical_occurrence_id is not null"),
  );
}

const verifiedJobsMigration = migrations.find((migration) => migration.version === "0015_verified_job_catalogue");
check("verified job catalogue migration exists", Boolean(verifiedJobsMigration));
if (verifiedJobsMigration) {
  check(
    "verified vacancies and student application state remain separate",
    verifiedJobsMigration.sql.includes("radar_verified_jobs")
      && verifiedJobsMigration.sql.includes("job_applications")
      && verifiedJobsMigration.sql.includes("canonical_occurrence_id"),
  );
  check(
    "job evidence and objective lifecycle are persisted",
    verifiedJobsMigration.sql.includes("radar_job_field_evidence")
      && verifiedJobsMigration.sql.includes("'open','closed','expired','unknown'"),
  );
  check(
    "one user cannot duplicate private state for one canonical vacancy",
    verifiedJobsMigration.sql.includes("job_applications_user_entity_uidx"),
  );
}

const preparationResourcesMigration = migrations.find((migration) => migration.version === "0014_canonical_preparation_resources");
check("canonical preparation-resource migration exists", Boolean(preparationResourcesMigration));
if (preparationResourcesMigration) {
  check(
    "preparation resources reuse stable learning identities and canonical FP skills",
    preparationResourcesMigration.sql.includes("alter table public.fp_learning_resources")
      && preparationResourcesMigration.sql.includes("fp_skill_learning_resources")
      && preparationResourcesMigration.sql.includes("references public.fp_cycle_skills"),
  );
  check(
    "approved resources require exact identity, availability and verification",
    preparationResourcesMigration.sql.includes("fp_learning_resources_exact_identity_check")
      && preparationResourcesMigration.sql.includes("provider_resource_id")
      && preparationResourcesMigration.sql.includes("source_verified_at")
      && preparationResourcesMigration.sql.includes("availability_state = 'available'")
      && preparationResourcesMigration.sql.includes("canonical_url = 'https://www.youtube.com/watch?v=' || provider_resource_id"),
  );
  check(
    "legacy resources remain candidates and user progress is preserved with honest evidence",
    preparationResourcesMigration.sql.includes("candidate_reverification")
      && preparationResourcesMigration.sql.includes("legacy_unspecified")
      && preparationResourcesMigration.sql.includes("completion_method"),
  );
  check(
    "coverage gaps and revision history are explicit",
    preparationResourcesMigration.sql.includes("fp_learning_coverage_gaps")
      && preparationResourcesMigration.sql.includes("fp_learning_resource_revisions"),
  );
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
