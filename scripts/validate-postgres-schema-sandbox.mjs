/**
 * Valida el schema PostgreSQL contra un PostgreSQL sandbox temporal.
 * No requiere Supabase. No toca datos reales. No toca VPS de producción.
 *
 * Uso: node scripts/validate-postgres-schema-sandbox.mjs
 * Requiere: sandbox levantado (npm run postgres:sandbox:up)
 * Por defecto: postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox
 *
 * IMPORTANTE: Este script no carga .env ni usa DATABASE_URL para evitar
 * conectar accidentalmente a Supabase, VPS o producción.
 * Override seguro: POSTGRES_SANDBOX_DATABASE_URL=postgresql://...@127.0.0.1:54329/aidraft_sandbox
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();

// No se carga .env ni se lee DATABASE_URL — solo POSTGRES_SANDBOX_DATABASE_URL.
const SANDBOX_DEFAULT =
  "postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox";
const connectionString = process.env.POSTGRES_SANDBOX_DATABASE_URL ?? SANDBOX_DEFAULT;

// ── Validar que la URL es sandbox antes de conectar ───────────────────────────
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

// ── Verificar schema.sql ──────────────────────────────────────────────────────
const schemaPath = join(root, "infra", "postgres", "schema.sql");
if (!existsSync(schemaPath)) {
  console.error("ERROR: infra/postgres/schema.sql no encontrado.");
  process.exit(1);
}

const schema = readFileSync(schemaPath, "utf-8");

const { Client } = require("pg");
const client = new Client({ connectionString });

const EXPECTED_TABLES = [
  "users", "profiles", "sources", "quick_searches", "opportunities",
  "hackathons", "courses", "tech_opportunities", "tasks", "reminders", "quick_links",
];

const EXPECTED_INDEXES = [
  "sources_user_id_idx",
  "opportunities_user_status_idx",
  "tasks_user_due_idx",
  "reminders_user_remind_idx",
];

let passed = 0;
let failed = 0;

function ok(msg)   { console.log(`  OK  ${msg}`); passed++; }
function fail(msg) { console.error(`  FAIL  ${msg}`); failed++; }

try {
  await client.connect();
  console.log("Conexión establecida.\n");

  // ── Aplicar schema ──────────────────────────────────────────────────────────
  console.log("── Aplicando schema ──");
  await client.query(schema);
  ok("schema.sql aplicado sin errores");

  // ── Verificar tablas ────────────────────────────────────────────────────────
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

  // ── Verificar índices ───────────────────────────────────────────────────────
  console.log("\n── Índices ──");
  const idxRes = await client.query(`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
  `);
  const existingIdx = new Set(idxRes.rows.map(r => r.indexname));
  for (const idx of EXPECTED_INDEXES) {
    existingIdx.has(idx) ? ok(`índice ${idx}`) : fail(`índice ${idx} no existe`);
  }

  // ── Verificar función set_updated_at ───────────────────────────────────────
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
  trgRes.rows.length >= 10
    ? ok(`triggers updated_at presentes (${trgRes.rows.length} encontrados)`)
    : fail(`triggers updated_at insuficientes (${trgRes.rows.length}/10+)`);

  // ── Insertar datos mínimos de prueba ───────────────────────────────────────
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

  // ── Limpiar datos de prueba ────────────────────────────────────────────────
  console.log("\n── Limpieza ──");
  await client.query(`DELETE FROM public.users WHERE id = $1`, [userId]);
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
