/**
 * Validates the PostgreSQL schema against a temporary PostgreSQL sandbox.
 * It does not require Supabase or touch real data or the production VPS.
 *
 * Uso: node scripts/validate-postgres-schema-sandbox.mjs
 * Requiere: sandbox levantado (npm run postgres:sandbox:up)
 * Default: postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox
 *
 * IMPORTANT: This script never loads .env or uses DATABASE_URL, preventing an
 * accidental connection to Supabase, the VPS or production.
 * Override seguro: POSTGRES_SANDBOX_DATABASE_URL=postgresql://...@127.0.0.1:54329/aidraft_sandbox
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { loadMigrationFiles } from "./postgres/migration-files.mjs";

const require = createRequire(import.meta.url);
const root = process.cwd();

// Do not load .env or read DATABASE_URL; use POSTGRES_SANDBOX_DATABASE_URL only.
const SANDBOX_DEFAULT =
  "postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox";
const connectionString = process.env.POSTGRES_SANDBOX_DATABASE_URL ?? SANDBOX_DEFAULT;

// ── Validate the sandbox URL before connecting ────────────────────────────────
let parsed;
try {
  parsed = new URL(connectionString);
} catch {
  console.error("ERROR: POSTGRES_SANDBOX_DATABASE_URL no es una URL válida.");
  process.exit(1);
}

const ALLOWED_HOSTS = ["localhost", "127.0.0.1"];
const EXPECTED_PORT = "54329";
const EXPECTED_DB   = "aidraft_sandbox";
const EXPECTED_USER = "aidraft_sandbox";

if (!ALLOWED_HOSTS.includes(parsed.hostname) || parsed.port !== EXPECTED_PORT) {
  console.error(
    `ERROR: Solo se permite conexión sandbox (localhost/127.0.0.1:${EXPECTED_PORT}).\n` +
    `Host detectado: ${parsed.hostname}:${parsed.port || "(default)"}\n` +
    `Usa POSTGRES_SANDBOX_DATABASE_URL apuntando a 127.0.0.1:${EXPECTED_PORT}.`
  );
  process.exit(1);
}

const detectedDb   = parsed.pathname.slice(1);
const detectedUser = parsed.username;

if (detectedDb !== EXPECTED_DB) {
  console.error(
    `ERROR: Base de datos esperada "${EXPECTED_DB}", detectada "${detectedDb}".\n` +
    "Usa infra/docker-compose.postgres-sandbox.yml para el sandbox correcto."
  );
  process.exit(1);
}

if (detectedUser !== EXPECTED_USER) {
  console.error(
    `ERROR: Usuario esperado "${EXPECTED_USER}", detectado "${detectedUser}".\n` +
    "Usa infra/docker-compose.postgres-sandbox.yml para el sandbox correcto."
  );
  process.exit(1);
}

console.log(`\nConectando a: ${parsed.hostname}:${parsed.port}/${detectedDb} (user: ${detectedUser})`);

// ── Validate schema.sql ───────────────────────────────────────────────────────
const schemaPath = join(root, "infra", "postgres", "schema.sql");
if (!existsSync(schemaPath)) {
  console.error("ERROR: infra/postgres/schema.sql no encontrado.");
  process.exit(1);
}

const schema = readFileSync(schemaPath, "utf-8");
const migrationFiles = loadMigrationFiles(root).filter((migration) => !migration.baseline);

const { Client } = require("pg");
const client = new Client({ connectionString });

const EXPECTED_TABLES = [
  "users", "profiles", "sources", "quick_searches", "opportunities",
  "hackathons", "courses", "tech_opportunities", "tasks", "reminders", "quick_links",
  "fp_cycles", "fp_content_items", "fp_content_cycle_fit", "fp_user_content_state",
  "fp_skills", "fp_user_competency_state",
  "radar_deliveries", "radar_items", "radar_delivery_items", "radar_item_user_states",
  "fp_learning_competencies", "fp_learning_resources", "fp_learning_competency_resources",
  "fp_user_learning_state", "fp_learning_notes",
];

const EXPECTED_INDEXES = [
  "sources_user_id_idx",
  "opportunities_user_status_idx",
  "profiles_cycle_filter_idx",
  "fp_content_cycle_fit_cycle_idx",
  "fp_user_content_state_user_idx",
  "tasks_user_due_idx",
  "reminders_user_remind_idx",
  "radar_items_cycles_idx",
  "radar_items_active_date_idx",
  "radar_item_user_states_user_idx",
  "fp_learning_competencies_cycle_idx",
  "fp_user_learning_state_user_idx",
  "fp_learning_notes_user_resource_idx",
  "bloc_notes_user_source_unique_idx",
];

let passed = 0;
let failed = 0;

function ok(msg)   { console.log(`  OK  ${msg}`); passed++; }
function fail(msg) { console.error(`  FAIL  ${msg}`); failed++; }

try {
  await client.connect();
  console.log("Conexión establecida.\n");

  // ── Apply schema ────────────────────────────────────────────────────────────
  console.log("── Aplicando schema ──");
  await client.query(schema);
  ok("schema.sql aplicado sin errores");
  for (const migration of migrationFiles) {
    await client.query(migration.sql);
    ok(`migración ${migration.version} aplicada sin errores`);
  }

  // ── Validate tables ─────────────────────────────────────────────────────────
  console.log("\n── Tablas ──");
  const tablesRes = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const existingTables = new Set(tablesRes.rows.map(r => r.table_name));
  for (const t of EXPECTED_TABLES) {
    existingTables.has(t) ? ok(`tabla ${t}`) : fail(`tabla ${t} no existe`);
  }

  // ── Verify indexes ──────────────────────────────────────────────────────────
  console.log("\n── Índices ──");
  const idxRes = await client.query(`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
  `);
  const existingIdx = new Set(idxRes.rows.map(r => r.indexname));
  for (const idx of EXPECTED_INDEXES) {
    existingIdx.has(idx) ? ok(`índice ${idx}`) : fail(`índice ${idx} no existe`);
  }

  // ── Verify the set_updated_at function ─────────────────────────────────────
  console.log("\n── Función y trigger ──");
  const fnRes = await client.query(`
    SELECT proname FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `);
  fnRes.rows.length > 0
    ? ok("función set_updated_at existe")
    : fail("función set_updated_at no existe");

  const trgRes = await client.query(`
    SELECT trigger_name FROM information_schema.triggers
    WHERE trigger_schema = 'public' AND trigger_name LIKE 'set_%_updated_at'
  `);
  trgRes.rows.length >= 16
    ? ok(`triggers updated_at presentes (${trgRes.rows.length} encontrados)`)
    : fail(`triggers updated_at insuficientes (${trgRes.rows.length}/16+)`);

  // ── Insert minimal test data ────────────────────────────────────────────────
  console.log("\n── Datos de prueba ──");
  const testEmail = `sandbox-test-${Date.now()}@example.test`;
  const userRes = await client.query(`
    INSERT INTO public.users (email, display_name, role)
    VALUES ($1, 'Sandbox User', 'user')
    RETURNING id, created_at, updated_at
  `, [testEmail]);
  const userId = userRes.rows[0].id;
  ok(`INSERT users (${testEmail})`);

  await client.query("SELECT pg_sleep(0.01)");

  const beforeUpdate = userRes.rows[0].updated_at;
  await client.query(
    `UPDATE public.users SET display_name = 'Sandbox User Updated' WHERE id = $1`,
    [userId]
  );
  const afterRes = await client.query(
    `SELECT updated_at FROM public.users WHERE id = $1`,
    [userId]
  );
  const afterUpdate = afterRes.rows[0].updated_at;
  afterUpdate > beforeUpdate
    ? ok("trigger updated_at se actualizó tras UPDATE en users")
    : fail("trigger updated_at NO se actualizó tras UPDATE en users");

  await client.query(`
    INSERT INTO public.tasks (user_id, title, status, priority)
    VALUES ($1, 'Tarea sandbox', 'pendiente', 'media')
  `, [userId]);
  ok("INSERT tasks (FK user_id OK)");

  await client.query(`
    INSERT INTO public.profiles (user_id, full_name)
    VALUES ($1, 'Sandbox User')
  `, [userId]);
  ok("INSERT profiles (FK user_id OK)");

  // ── fp_user_competency_state: insert, upsert, trigger, FK, cascade (issue #96) ──
  console.log("\n── fp_user_competency_state ──");
  const skillId = `sandbox-skill-${Date.now()}`;
  await client.query(`INSERT INTO public.fp_skills (id, titulo) VALUES ($1, 'Sandbox skill')`, [skillId]);
  ok("INSERT fp_skills (sandbox skill)");

  const competencyInsertRes = await client.query(
    `INSERT INTO public.fp_user_competency_state (user_id, skill_id) VALUES ($1, $2) RETURNING updated_at`,
    [userId, skillId],
  );
  ok("INSERT fp_user_competency_state (row existence marks the competency completed)");

  await client.query("SELECT pg_sleep(0.01)");
  const beforeTriggerUpdate = competencyInsertRes.rows[0].updated_at;
  await client.query(
    `UPDATE public.fp_user_competency_state SET completed_at = now() WHERE user_id = $1 AND skill_id = $2`,
    [userId, skillId],
  );
  const afterTriggerRes = await client.query(
    `SELECT updated_at FROM public.fp_user_competency_state WHERE user_id = $1 AND skill_id = $2`,
    [userId, skillId],
  );
  afterTriggerRes.rows[0].updated_at > beforeTriggerUpdate
    ? ok("trigger set_fp_user_competency_state_updated_at fires on UPDATE")
    : fail("updated_at did NOT advance on UPDATE - trigger missing or broken");

  await client.query(
    `INSERT INTO public.fp_user_competency_state (user_id, skill_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, skill_id) DO UPDATE SET updated_at = now()`,
    [userId, skillId],
  );
  const competencyRowCount = await client.query(
    `SELECT count(*)::int AS count FROM public.fp_user_competency_state WHERE user_id = $1 AND skill_id = $2`,
    [userId, skillId],
  );
  competencyRowCount.rows[0].count === 1
    ? ok("ON CONFLICT (user_id, skill_id) upserts in place instead of duplicating the row")
    : fail(`expected exactly 1 row after upsert, found ${competencyRowCount.rows[0].count}`);

  let competencyFkRejected = false;
  try {
    await client.query(
      `INSERT INTO public.fp_user_competency_state (user_id, skill_id) VALUES ($1, 'sandbox-skill-does-not-exist')`,
      [userId],
    );
  } catch (err) {
    competencyFkRejected = err.code === "23503"; // foreign_key_violation
  }
  competencyFkRejected
    ? ok("FK rejects an unknown skill_id")
    : fail("FK did not reject an unknown skill_id");

  await client.query(`DELETE FROM public.fp_skills WHERE id = $1`, [skillId]);
  const competencyAfterSkillDelete = await client.query(
    `SELECT count(*)::int AS count FROM public.fp_user_competency_state WHERE user_id = $1 AND skill_id = $2`,
    [userId, skillId],
  );
  competencyAfterSkillDelete.rows[0].count === 0
    ? ok("ON DELETE CASCADE removes competency state when the skill is deleted")
    : fail("competency state row survived skill deletion (cascade broken)");

  const learningResourceId = `sandbox-learning-${Date.now()}`;
  await client.query(
    `INSERT INTO public.fp_learning_resources (
       id, slug, title, description, provider, language, level, youtube_url,
       review_status, reviewed_at, reviewed_by, review_reason
     ) VALUES ($1, $1, 'Curso sandbox', 'Recurso para validar notas', 'Canal sandbox',
       'es', 'inicial', 'https://youtube.com/watch?v=sandbox123', 'approved',
       current_date, 'sandbox', 'Validación automatizada')`,
    [learningResourceId],
  );
  await client.query(
    `INSERT INTO public.fp_learning_notes (user_id, resource_id, timestamp_seconds, body)
     VALUES ($1, $2, 75, $3)`,
    [userId, learningResourceId, "Nota <segura> & exportable"],
  );
  const learningBlocMigration = migrationFiles.find((migration) => migration.version === "0004_learning_notes_to_bloc");
  if (!learningBlocMigration) throw new Error("Migration 0004_learning_notes_to_bloc is missing");
  await client.query(learningBlocMigration.sql);
  const blocLearningNote = await client.query(
    `SELECT title, content_html, content_text
     FROM public.bloc_notes
     WHERE user_id=$1 AND source_type='learning_resource' AND source_id=$2`,
    [userId, learningResourceId],
  );
  blocLearningNote.rowCount === 1
    && blocLearningNote.rows[0].title === "Curso sandbox"
    && blocLearningNote.rows[0].content_html.includes("Nota &lt;segura&gt; &amp; exportable")
    && blocLearningNote.rows[0].content_text.includes("[1:15]")
    ? ok("learning notes are backfilled into one safe, exportable Bloc note")
    : fail("learning notes were not backfilled into Bloc correctly");

  const deliveryId = randomUUID();
  await client.query(
    `INSERT INTO public.radar_deliveries (delivery_id, schema_version, payload_hash, item_count)
     VALUES ($1, 3, repeat('a', 64), 1)`,
    [deliveryId],
  );
  const radarItemRes = await client.query(
    `INSERT INTO public.radar_items (
       schema_version, source_id, source_name, external_id, canonical_url, title, summary,
       fetched_at, kind, target_cycle_codes, module_codes, topics, matched_rule_ids,
       matched_keywords, trust_tier, review_status, reviewed_by, reviewed_at, review_reason,
       source_url, content_hash, destination, semantic_key
     ) VALUES (
       3, 'sandbox-source', 'Sandbox Source', 'external-1', $1, 'Noticia DAW de prueba', '',
       now(), 'news', array['DAW'], array['CLIENTE'], array['javascript'], array['sandbox-rule'],
       array['javascript'], 'official', 'approved', 'sandbox', now(), 'Contenido verificado',
       'https://example.test/feed', repeat('b', 64), 'news', repeat('c', 64)
     ) RETURNING id`,
    [`https://example.test/${deliveryId}`],
  );
  const radarItemId = radarItemRes.rows[0].id;
  await client.query(
    `INSERT INTO public.radar_delivery_items (delivery_id, radar_item_id) VALUES ($1, $2)`,
    [deliveryId, radarItemId],
  );
  await client.query(
    `INSERT INTO public.radar_item_user_states (user_id, radar_item_id, status) VALUES ($1, $2, 'saved')`,
    [userId, radarItemId],
  );
  ok("INSERT radar delivery/item/user state (constraints y FK OK)");

  // ── Limpiar datos de prueba ────────────────────────────────────────────────
  console.log("\n── Limpieza ──");
  await client.query(`DELETE FROM public.users WHERE id = $1`, [userId]);
  await client.query(`DELETE FROM public.fp_learning_resources WHERE id = $1`, [learningResourceId]);
  await client.query(`DELETE FROM public.radar_items WHERE id = $1`, [radarItemId]);
  await client.query(`DELETE FROM public.radar_deliveries WHERE delivery_id = $1`, [deliveryId]);
  ok("datos de prueba eliminados (CASCADE en tablas dependientes)");

} catch (err) {
  const isConnRefused = err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED");
  if (isConnRefused) {
    console.error(
      "\nERROR: No se puede conectar al sandbox PostgreSQL.\n" +
      "Levanta el sandbox primero:\n" +
      "  npm run postgres:sandbox:up\n" +
      "Espera unos segundos a que pg_isready pase y vuelve a ejecutar este script."
    );
  } else {
    console.error("\nERROR inesperado:", err.message);
  }
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}

console.log("");
if (failed > 0) {
  console.error(`RESULTADO: ${failed} comprobación(es) fallida(s) de ${passed + failed}.`);
  process.exit(1);
} else {
  console.log(`RESULTADO: Schema sandbox OK — ${passed} comprobaciones pasadas.`);
}
