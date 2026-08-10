/**
 * Compara una base existente con el baseline 0001 usando una base temporal.
 * Solo permite adoptar el baseline si tablas, columnas, constraints, índices
 * y triggers esperados están presentes con el mismo contrato.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { BASELINE_VERSION, loadMigrationFiles } from "./migration-files.mjs";

const require = createRequire(import.meta.url);
const { Client } = require("pg");
const ADOPTION_CONFIRMATION = "ADOPT_0001_INITIAL_SCHEMA";

loadDotEnv();

const shouldAdopt = process.argv.includes("--adopt");
const adminValue = process.env.DATABASE_MIGRATION_URL;
if (!adminValue || adminValue.includes("REPLACE_ME")) fail("DATABASE_MIGRATION_URL no está configurada.");
if (shouldAdopt && process.env.AL_LIO_BASELINE_CONFIRMATION !== ADOPTION_CONFIRMATION) {
  fail(`Para adoptar define AL_LIO_BASELINE_CONFIRMATION=${ADOPTION_CONFIRMATION}.`);
}

const baseline = loadMigrationFiles().find((migration) => migration.version === BASELINE_VERSION);
if (!baseline) fail("No se encontró el baseline 0001.");

const targetUrl = new URL(adminValue);
const temporaryDatabase = `al_lio_baseline_audit_${Date.now()}_${process.pid}`.slice(0, 62);
const temporaryUrl = new URL(targetUrl);
temporaryUrl.pathname = `/${temporaryDatabase}`;

const admin = new Client({ connectionString: targetUrl.toString(), application_name: "al-lio-baseline-audit" });
let temporary = null;
let temporaryCreated = false;

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE ${quoteIdentifier(temporaryDatabase)}`);
  temporaryCreated = true;

  temporary = new Client({ connectionString: temporaryUrl.toString(), application_name: "al-lio-baseline-reference" });
  await temporary.connect();
  await temporary.query(baseline.sql);

  const [expected, actual] = await Promise.all([readContract(temporary), readContract(admin)]);
  const differences = compareContracts(expected, actual);
  const recordedBaseline = await readRecordedBaseline(admin);

  if (differences.length > 0) {
    console.error("La base existente NO coincide con 0001_initial_schema:");
    for (const difference of differences.slice(0, 100)) console.error(`  - ${difference}`);
    if (differences.length > 100) console.error(`  - ... y ${differences.length - 100} diferencia(s) más`);
    console.error("No se ha modificado la base objetivo. Crea una reconciliación revisada y repite la auditoría.");
    process.exitCode = 2;
  } else if (!shouldAdopt) {
    console.log("OK: la base existente cumple el contrato del baseline.");
    if (recordedBaseline === baseline.checksum) {
      console.log("El baseline ya está registrado con el checksum correcto.");
    } else {
      console.log(`Para registrarlo: AL_LIO_BASELINE_CONFIRMATION=${ADOPTION_CONFIRMATION} npm run postgres:baseline:adopt`);
    }
  } else {
    await admin.query("BEGIN");
    try {
      await admin.query(`
        CREATE TABLE IF NOT EXISTS public.schema_migrations (
          version text PRIMARY KEY,
          checksum text NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      const existing = await admin.query(
        "SELECT checksum FROM public.schema_migrations WHERE version = $1",
        [BASELINE_VERSION],
      );
      if (existing.rows[0] && existing.rows[0].checksum !== baseline.checksum) {
        throw new Error("El baseline ya existe con otro checksum.");
      }
      await admin.query(
        `INSERT INTO public.schema_migrations (version, checksum)
         VALUES ($1, $2)
         ON CONFLICT (version) DO NOTHING`,
        [BASELINE_VERSION, baseline.checksum],
      );
      await admin.query("COMMIT");
      console.log("OK: baseline auditado y registrado sin reaplicar DDL.");
    } catch (error) {
      await admin.query("ROLLBACK").catch(() => {});
      throw error;
    }
  }
} catch (error) {
  console.error(`ERROR auditando baseline: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (temporary) await temporary.end().catch(() => {});
  if (temporaryCreated) {
    await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(temporaryDatabase)} WITH (FORCE)`).catch(() => {});
  }
  await admin.end().catch(() => {});
}

async function readContract(db) {
  const columns = await db.query(`
      SELECT c.relname AS table_name, a.attname AS column_name,
             format_type(a.atttypid, a.atttypmod) AS data_type, a.attnotnull
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        AND a.attnum > 0 AND NOT a.attisdropped
        AND c.relname <> 'schema_migrations'
      ORDER BY c.relname, a.attnum
    `);
  const constraints = await db.query(`
      SELECT c.relname AS table_name, con.conname,
             pg_get_constraintdef(con.oid, true) AS definition
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname <> 'schema_migrations'
      ORDER BY c.relname, con.conname
    `);
  const indexes = await db.query(`
      SELECT tablename AS table_name, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename <> 'schema_migrations'
      ORDER BY tablename, indexname
    `);
  const triggers = await db.query(`
      SELECT c.relname AS table_name, t.tgname,
             pg_get_triggerdef(t.oid, true) AS definition
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT t.tgisinternal
      ORDER BY c.relname, t.tgname
    `);

  return {
    columns: toMap(columns.rows, (row) => `${row.table_name}.${row.column_name}`, (row) => `${row.data_type}|${row.attnotnull}`),
    constraints: toMap(constraints.rows, (row) => `${row.table_name}.${row.conname}`, (row) => normalize(row.definition)),
    indexes: toMap(indexes.rows, (row) => `${row.table_name}.${row.indexname}`, (row) => normalize(row.indexdef)),
    triggers: toMap(triggers.rows, (row) => `${row.table_name}.${row.tgname}`, (row) => normalize(row.definition)),
  };
}

async function readRecordedBaseline(db) {
  const relation = await db.query("SELECT to_regclass('public.schema_migrations') AS name");
  if (!relation.rows[0]?.name) return null;
  const result = await db.query(
    "SELECT checksum FROM public.schema_migrations WHERE version = $1",
    [BASELINE_VERSION],
  );
  return result.rows[0]?.checksum ?? null;
}

function compareContracts(expected, actual) {
  const differences = [];
  for (const section of ["columns", "constraints", "indexes", "triggers"]) {
    for (const [key, expectedValue] of expected[section]) {
      const actualValue = actual[section].get(key);
      if (actualValue === undefined) differences.push(`${section}: falta ${key}`);
      else if (actualValue !== expectedValue) differences.push(`${section}: contrato distinto en ${key}`);
    }
  }
  return differences;
}

function toMap(rows, key, value) {
  return new Map(rows.map((row) => [key(row), value(row)]));
}

function normalize(value) {
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
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

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
