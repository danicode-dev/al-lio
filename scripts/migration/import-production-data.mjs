/**
 * al-lio PostgreSQL migration — importa JSON a PostgreSQL producción.
 *
 * Uso:
 *   DATABASE_URL="postgresql://al_lio:<password>@al_lio_postgres:5432/al_lio" \
 *   AL_LIO_ALLOW_PRODUCTION_IMPORT=true \
 *   AL_LIO_PRODUCTION_IMPORT_CONFIRMATION=IMPORT_TO_AL_LIO_PRODUCTION_POSTGRES \
 *   node scripts/migration/import-production-data.mjs migration-artifacts/supabase-export-YYYYMMDD-HHMMSS
 *
 * Guardias de seguridad:
 *   - Requiere DATABASE_URL explícita en entorno.
 *   - Requiere AL_LIO_ALLOW_PRODUCTION_IMPORT=true.
 *   - Requiere AL_LIO_PRODUCTION_IMPORT_CONFIRMATION=IMPORT_TO_AL_LIO_PRODUCTION_POSTGRES.
 *   - Rechaza sandbox (127.0.0.1:54329).
 *   - Exige database=al_lio y user=al_lio.
 *   - Imprime host/db/user pero NUNCA password ni URL completa.
 *   - Usa transacción completa (ROLLBACK en cualquier error).
 *   - Verifica recuentos contra manifest al final.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ── Guardias de seguridad ─────────────────────────────────────────────────────

const allowImport = process.env.AL_LIO_ALLOW_PRODUCTION_IMPORT;
if (allowImport !== "true") {
  console.error(
    "\nERROR: Importación a producción bloqueada.\n" +
    "Requiere: AL_LIO_ALLOW_PRODUCTION_IMPORT=true\n" +
    "Esta variable debe pasarse explícitamente — no configurarse en .env.\n"
  );
  process.exit(1);
}

const confirmation = process.env.AL_LIO_PRODUCTION_IMPORT_CONFIRMATION;
if (confirmation !== "IMPORT_TO_AL_LIO_PRODUCTION_POSTGRES") {
  console.error(
    "\nERROR: Confirmación de importación incorrecta o ausente.\n" +
    "Requiere: AL_LIO_PRODUCTION_IMPORT_CONFIRMATION=IMPORT_TO_AL_LIO_PRODUCTION_POSTGRES\n"
  );
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "\nERROR: DATABASE_URL no está definida en el entorno.\n" +
    "Ejemplo: DATABASE_URL=\"postgresql://al_lio:<password>@al_lio_postgres:5432/al_lio\"\n"
  );
  process.exit(1);
}

if (connectionString.includes("REPLACE_ME")) {
  console.error("\nERROR: DATABASE_URL contiene 'REPLACE_ME'. Rellena el valor real.\n");
  process.exit(1);
}

// ── Parsear y validar URL de conexión ────────────────────────────────────────

let parsed;
try {
  parsed = new URL(connectionString);
} catch {
  console.error("\nERROR: DATABASE_URL no es una URL válida.\n");
  process.exit(1);
}

// Rechazar sandbox explícitamente
const SANDBOX_HOSTS = ["127.0.0.1", "localhost"];
const isSandboxHost = SANDBOX_HOSTS.includes(parsed.hostname);
const isSandboxPort = parsed.port === "54329";
if (isSandboxHost || isSandboxPort) {
  console.error(
    `\nERROR: DATABASE_URL apunta al sandbox (${parsed.hostname}:${parsed.port || "5432"}).\n` +
    "El import de producción rechaza conexiones a sandbox.\n" +
    "Usa el DATABASE_URL del contenedor al_lio_postgres en producción.\n"
  );
  process.exit(1);
}

// Validar database
const dbName = parsed.pathname.slice(1);
if (dbName !== "al_lio") {
  console.error(
    `\nERROR: Base de datos esperada "al_lio", detectada "${dbName}".\n` +
    "DATABASE_URL debe apuntar a la base de datos al_lio de producción.\n"
  );
  process.exit(1);
}

// Validar usuario
if (parsed.username !== "al_lio") {
  console.error(
    `\nERROR: Usuario esperado "al_lio", detectado "${parsed.username}".\n`
  );
  process.exit(1);
}

// Imprimir conexión SIN password ni URL completa
console.log(`\nProducción: ${parsed.hostname}:${parsed.port || "5432"}/${dbName} (user: ${parsed.username})`);

// ── Argumento: carpeta de artifacts ──────────────────────────────────────────

const artifactArg = process.argv[2];
if (!artifactArg) {
  console.error(
    "\nERROR: Proporciona la carpeta de export como argumento.\n" +
    "Uso: node scripts/migration/import-production-data.mjs migration-artifacts/supabase-export-YYYYMMDD-HHMMSS\n"
  );
  process.exit(1);
}

const artifactDir = resolve(process.cwd(), artifactArg);
if (!existsSync(artifactDir)) {
  console.error(`\nERROR: Carpeta no encontrada: ${artifactDir}\n`);
  process.exit(1);
}

const manifestPath = join(artifactDir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error(`\nERROR: manifest.json no encontrado en ${artifactDir}\n`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
console.log(`Artifact: ${artifactArg}`);
console.log(`Exportado: ${manifest.exported_at}`);
console.log(`Origen: ${manifest.source} → Destino: producción al_lio\n`);

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
// Construir connectionString sin exponer password en logs
const client = new Client({ connectionString });

try {
  await client.connect();
  console.log("Conexión a producción establecida.\n");

  await client.query("BEGIN");

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

  // ── Resumen de importación ────────────────────────────────────────────────

  console.log("\n── Resumen de importación ──");
  let totalRead = 0, totalInserted = 0, totalSkipped = 0;
  for (const [t, c] of Object.entries(counts)) {
    console.log(`  ${t}: leídas=${c.read}, insertadas=${c.inserted}, saltadas=${c.skipped}`);
    totalRead += c.read;
    totalInserted += c.inserted;
    totalSkipped += c.skipped;
  }
  console.log(`\n  Total: leídas=${totalRead}, insertadas=${totalInserted}, saltadas=${totalSkipped}`);

  // ── Verificación de recuentos contra manifest ─────────────────────────────

  console.log("\n── Verificando recuentos contra manifest ──");
  let verifyPassed = 0;
  let verifyFailed = 0;

  for (const [table, expectedCount] of Object.entries(manifest.tables)) {
    const res2 = await client.query(`SELECT COUNT(*)::int AS cnt FROM public.${table}`);
    const actual = res2.rows[0].cnt;
    if (actual === expectedCount) {
      console.log(`  OK  ${table}: ${actual} / ${expectedCount}`);
      verifyPassed++;
    } else {
      console.error(`  FAIL  ${table}: producción=${actual} vs manifest=${expectedCount}`);
      verifyFailed++;
    }
  }

  console.log("");
  if (verifyFailed > 0) {
    console.error(
      `RESULTADO: Import completado pero ${verifyFailed} discrepancia(s) en recuentos.\n` +
      "Revisa los FAIL anteriores antes de continuar."
    );
    process.exit(1);
  }

  console.log(`RESULTADO: Import a producción completado — ${verifyPassed} tablas verificadas OK.`);

} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  const isConnRefused = err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED");
  if (isConnRefused) {
    console.error(
      "\nERROR: No se puede conectar a producción.\n" +
      "Verifica que al_lio_postgres está levantado y DATABASE_URL es correcta.\n"
    );
  } else {
    console.error("\nERROR durante el import:", err.message);
  }
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
