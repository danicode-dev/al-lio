/**
 * al-lio PostgreSQL migration — import JSON al PostgreSQL sandbox.
 * No toca producción, VPS de producción ni Supabase.
 *
 * Uso:
 *   node scripts/migration/import-sandbox-data.mjs migration-artifacts/supabase-export-YYYYMMDD-HHMMSS
 *
 * Variables opcionales:
 *   POSTGRES_SANDBOX_DATABASE_URL    — override (debe ser localhost/127.0.0.1:54329)
 *   AL_LIO_SANDBOX_IMPORT_RESET=true — limpiar tablas del sandbox antes de importar
 *
 * Por defecto NO borra nada del sandbox. Con AL_LIO_SANDBOX_IMPORT_RESET=true
 * hace TRUNCATE en orden inverso antes de insertar.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ── Argumento: carpeta de artifacts ──────────────────────────────────────────

const artifactArg = process.argv[2];
if (!artifactArg) {
  console.error(
    "\nERROR: Proporciona la carpeta de export como argumento.\n" +
    "Uso: node scripts/migration/import-sandbox-data.mjs migration-artifacts/supabase-export-YYYYMMDD-HHMMSS"
  );
  process.exit(1);
}

const artifactDir = resolve(process.cwd(), artifactArg);
if (!existsSync(artifactDir)) {
  console.error(`\nERROR: Carpeta no encontrada: ${artifactDir}`);
  process.exit(1);
}

const manifestPath = join(artifactDir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error(`\nERROR: manifest.json no encontrado en ${artifactDir}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
console.log(`\nArtifact: ${artifactArg}`);
console.log(`Exportado: ${manifest.exported_at}`);
console.log(`Origen: ${manifest.source} → Destino esperado: ${manifest.expected_destination}\n`);

// ── Validar conexión sandbox ───────────────────────────────────────────────────

const SANDBOX_DEFAULT =
  "postgresql://aidraft_sandbox:aidraft_sandbox_password@127.0.0.1:54329/aidraft_sandbox";
const connectionString = process.env.POSTGRES_SANDBOX_DATABASE_URL ?? SANDBOX_DEFAULT;

let parsed;
try {
  parsed = new URL(connectionString);
} catch {
  console.error("ERROR: POSTGRES_SANDBOX_DATABASE_URL no es una URL válida.");
  process.exit(1);
}

const ALLOWED_HOSTS = ["localhost", "127.0.0.1"];
if (!ALLOWED_HOSTS.includes(parsed.hostname) || parsed.port !== "54329") {
  console.error(
    `\nERROR: Solo se permite importación en sandbox (localhost/127.0.0.1:54329).\n` +
    `Host detectado: ${parsed.hostname}:${parsed.port || "(default)"}`
  );
  process.exit(1);
}

if (parsed.pathname.slice(1) !== "aidraft_sandbox") {
  console.error(
    `\nERROR: Base de datos esperada "aidraft_sandbox", detectada "${parsed.pathname.slice(1)}".`
  );
  process.exit(1);
}

if (parsed.username !== "aidraft_sandbox") {
  console.error(
    `\nERROR: Usuario esperado "aidraft_sandbox", detectado "${parsed.username}".`
  );
  process.exit(1);
}

console.log(`Sandbox: ${parsed.hostname}:${parsed.port}/${parsed.pathname.slice(1)} (user: ${parsed.username})\n`);

// ── Orden de importación ──────────────────────────────────────────────────────

const IMPORT_ORDER = [
  "users",
  "profiles",
  "sources",
  "quick_searches",
  "opportunities",
  "hackathons",
  "courses",
  "tasks",
  "reminders",
  "quick_links",
  "tech_opportunities",
];

// Orden inverso para TRUNCATE (evitar FK violations)
const TRUNCATE_ORDER = [...IMPORT_ORDER].reverse();

// ── Leer archivos JSON ────────────────────────────────────────────────────────

const tableData = {};
for (const table of IMPORT_ORDER) {
  const filePath = join(artifactDir, `${table}.json`);
  if (!existsSync(filePath)) {
    console.error(`ERROR: Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }
  tableData[table] = JSON.parse(readFileSync(filePath, "utf-8"));
}

// ── Conectar y ejecutar en transacción ───────────────────────────────────────

const { Client } = require("pg");
const client = new Client({ connectionString });

const doReset = process.env.AL_LIO_SANDBOX_IMPORT_RESET === "true";

try {
  await client.connect();
  console.log("Conexión sandbox establecida.\n");

  await client.query("BEGIN");

  // ── Reset opcional ──────────────────────────────────────────────────────────
  if (doReset) {
    console.log("── Reset (AL_LIO_SANDBOX_IMPORT_RESET=true) ──");
    for (const table of TRUNCATE_ORDER) {
      await client.query(`TRUNCATE TABLE public.${table} RESTART IDENTITY CASCADE`);
      console.log(`  OK  TRUNCATE ${table}`);
    }
    console.log("");
  } else {
    console.log("── Sin reset (usa AL_LIO_SANDBOX_IMPORT_RESET=true para limpiar antes) ──\n");
  }

  // ── Importar tablas ─────────────────────────────────────────────────────────
  console.log("── Importando ──");
  const counts = {};

  for (const table of IMPORT_ORDER) {
    const rows = tableData[table];
    if (!rows.length) {
      console.log(`  SKIP  ${table} — 0 filas en JSON`);
      counts[table] = { read: 0, inserted: 0, skipped: 0 };
      continue;
    }

    const columns = Object.keys(rows[0]);
    const placeholderRows = rows.map(
      (_, ri) => `(${columns.map((_, ci) => `$${ri * columns.length + ci + 1}`).join(", ")})`
    );
    const values = rows.flatMap(r => columns.map(c => r[c] ?? null));

    const res = await client.query(
      `INSERT INTO public.${table} (${columns.map(c => `"${c}"`).join(", ")})
       VALUES ${placeholderRows.join(",\n")}
       ON CONFLICT DO NOTHING
       RETURNING 1`,
      values
    );

    const inserted = res.rowCount ?? 0;
    const skipped = rows.length - inserted;
    counts[table] = { read: rows.length, inserted, skipped };
    console.log(
      `  OK  ${table} — leídas: ${rows.length}, insertadas: ${inserted}, saltadas: ${skipped}`
    );
  }

  await client.query("COMMIT");

  console.log("\n── Resumen de importación ──");
  let totalRead = 0, totalInserted = 0, totalSkipped = 0;
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t}: leídas=${c.read}, insertadas=${c.inserted}, saltadas=${c.skipped}`);
    totalRead += c.read;
    totalInserted += c.inserted;
    totalSkipped += c.skipped;
  }
  console.log(`\n  Total: leídas=${totalRead}, insertadas=${totalInserted}, saltadas=${totalSkipped}`);

  console.log("\nRESULTADO: Import al sandbox completado.");

} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  const isConnRefused = err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED");
  if (isConnRefused) {
    console.error(
      "\nERROR: No se puede conectar al sandbox.\n" +
      "Levanta el sandbox: npm run postgres:sandbox:up"
    );
  } else {
    console.error("\nERROR durante el import:", err.message);
  }
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
