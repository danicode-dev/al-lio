/**
 * Ejecutor transaccional de migraciones AL-LIO.
 *
 * - Una base vacía recibe el baseline y queda versionada.
 * - Una base con tablas pero sin historial se rechaza para evitar aplicar un
 *   schema acumulativo sobre producción sin una auditoría previa.
 * - Las migraciones aplicadas se protegen con checksum y advisory lock.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { loadMigrationFiles } from "./migration-files.mjs";

const require = createRequire(import.meta.url);
const { Client } = require("pg");

loadDotEnv();

const statusOnly = process.argv.includes("--status");
const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (!connectionString || connectionString.includes("REPLACE_ME")) {
  fail("Define DATABASE_MIGRATION_URL (recomendado) o DATABASE_URL con una URL válida.");
}

if (process.env.NODE_ENV === "production" && !process.env.DATABASE_MIGRATION_URL) {
  fail("En producción las migraciones requieren DATABASE_MIGRATION_URL; no se usará la credencial de runtime.");
}

const migrations = loadMigrationFiles();
const client = new Client({ connectionString, application_name: "al-lio-migrator" });

try {
  await client.connect();

  const existingTables = await listApplicationTables(client);
  const hasMigrationTable = existingTables.includes("schema_migrations");
  const applicationTables = existingTables.filter((table) => table !== "schema_migrations");

  if (!hasMigrationTable && applicationTables.length > 0) {
    console.error("\nBASE DE DATOS EXISTENTE SIN HISTORIAL DE MIGRACIONES.");
    console.error(`Tablas detectadas: ${applicationTables.join(", ")}`);
    console.error("No se ha modificado la base de datos.");
    console.error("Primero crea un dump, restaura una copia y ejecuta la auditoría de baseline descrita en docs/DEPLOY_VPS.md.\n");
    process.exitCode = 2;
  } else if (statusOnly) {
    await printStatus(client, hasMigrationTable, migrations);
  } else {
    await applyMigrations(client, migrations);
  }
} catch (error) {
  console.error(`ERROR de migración: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

async function applyMigrations(db, migrationFiles) {
  await db.query("SELECT pg_advisory_lock(hashtext($1))", ["al_lio_schema_migrations"]);
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const applied = await readApplied(db);
    validateAppliedChecksums(applied, migrationFiles);

    for (const migration of migrationFiles) {
      if (applied.has(migration.version)) continue;
      console.log(`Aplicando ${migration.version}...`);
      await db.query("BEGIN");
      try {
        await db.query("SET LOCAL lock_timeout = '5s'");
        await db.query("SET LOCAL statement_timeout = '2min'");
        await db.query(migration.sql);
        await db.query(
          "INSERT INTO public.schema_migrations (version, checksum) VALUES ($1, $2)",
          [migration.version, migration.checksum],
        );
        await db.query("COMMIT");
      } catch (error) {
        await db.query("ROLLBACK").catch(() => {});
        throw error;
      }
    }

    await printStatus(db, true, migrationFiles);
  } finally {
    await db.query("SELECT pg_advisory_unlock(hashtext($1))", ["al_lio_schema_migrations"]).catch(() => {});
  }
}

async function printStatus(db, hasMigrationTable, migrationFiles) {
  const applied = hasMigrationTable ? await readApplied(db) : new Map();
  validateAppliedChecksums(applied, migrationFiles);
  console.log("\nEstado de migraciones:");
  for (const migration of migrationFiles) {
    console.log(`  ${applied.has(migration.version) ? "OK       " : "PENDIENTE"}  ${migration.version}`);
  }
  const pending = migrationFiles.filter((migration) => !applied.has(migration.version));
  console.log(`\n${pending.length === 0 ? "Base de datos al día." : `${pending.length} migración(es) pendiente(s).`}\n`);
}

async function readApplied(db) {
  const result = await db.query("SELECT version, checksum FROM public.schema_migrations ORDER BY version");
  return new Map(result.rows.map((row) => [row.version, row.checksum]));
}

function validateAppliedChecksums(applied, migrationFiles) {
  const known = new Map(migrationFiles.map((migration) => [migration.version, migration.checksum]));
  for (const [version, checksum] of applied) {
    if (!known.has(version)) {
      throw new Error(`La base contiene una migración desconocida: ${version}`);
    }
    if (known.get(version) !== checksum) {
      throw new Error(`Checksum modificado para ${version}. No edites migraciones ya aplicadas.`);
    }
  }
}

async function listApplicationTables(db) {
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

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
