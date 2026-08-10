/**
 * Reconcilia una instalación PostgreSQL antigua y sin historial con el
 * baseline inmutable 0001_initial_schema.
 *
 * Este comando es deliberadamente distinto de migrate.mjs:
 * - solo acepta una base existente con tablas y sin schema_migrations;
 * - exige confirmación explícita;
 * - aplica el baseline completo dentro de una única transacción;
 * - no registra el baseline: después deben ejecutarse audit y adopt.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { BASELINE_VERSION, loadMigrationFiles } from "./migration-files.mjs";

const require = createRequire(import.meta.url);
const { Client } = require("pg");
const CONFIRMATION = "RECONCILE_0001_INITIAL_SCHEMA";

loadDotEnv();

if (process.env.AL_LIO_BASELINE_RECONCILIATION !== CONFIRMATION) {
  fail(`Define AL_LIO_BASELINE_RECONCILIATION=${CONFIRMATION} para confirmar la reconciliación.`);
}

const connectionString = process.env.DATABASE_MIGRATION_URL;
if (!connectionString || connectionString.includes("REPLACE_ME")) {
  fail("DATABASE_MIGRATION_URL es obligatoria para reconciliar el baseline.");
}

const baseline = loadMigrationFiles().find((migration) => migration.version === BASELINE_VERSION);
if (!baseline) fail("No se encontró 0001_initial_schema.");

const client = new Client({ connectionString, application_name: "al-lio-baseline-reconciler" });

try {
  await client.connect();
  const tables = await listPublicTables(client);
  if (tables.includes("schema_migrations")) {
    failConnected("La base ya tiene historial de migraciones; usa postgres:migrate.");
  }
  if (tables.length === 0) {
    failConnected("La base está vacía; usa postgres:migrate para aplicar el baseline.");
  }

  await client.query("SELECT pg_advisory_lock(hashtext($1))", ["al_lio_schema_migrations"]);
  try {
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query("SET LOCAL statement_timeout = '2min'");
      await client.query(baseline.sql);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    }
  } finally {
    await client
      .query("SELECT pg_advisory_unlock(hashtext($1))", ["al_lio_schema_migrations"])
      .catch(() => {});
  }

  const reconciledTables = await listPublicTables(client);
  console.log(
    `OK: ${BASELINE_VERSION} reconciliado transaccionalmente (${tables.length} -> ${reconciledTables.length} tablas).`,
  );
  console.log("El baseline todavía NO está registrado. Ejecuta audit y, solo si pasa, adopt.");
} catch (error) {
  console.error(`ERROR reconciliando baseline: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

async function listPublicTables(db) {
  const result = await db.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return result.rows.map((row) => row.tablename);
}

function loadDotEnv() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function failConnected(message) {
  throw new Error(message);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
