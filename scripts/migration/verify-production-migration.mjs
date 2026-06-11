/**
 * al-lio PostgreSQL migration — verifica recuentos en producción vs manifest.
 *
 * Uso:
 *   DATABASE_URL="postgresql://al_lio:<password>@al_lio_postgres:5432/al_lio" \
 *   AL_LIO_ALLOW_PRODUCTION_IMPORT=true \
 *   AL_LIO_PRODUCTION_IMPORT_CONFIRMATION=IMPORT_TO_AL_LIO_PRODUCTION_POSTGRES \
 *   node scripts/migration/verify-production-migration.mjs migration-artifacts/supabase-export-YYYYMMDD-HHMMSS
 *
 * Guardias de seguridad:
 *   - Requiere DATABASE_URL explícita en entorno.
 *   - Requiere AL_LIO_ALLOW_PRODUCTION_IMPORT=true.
 *   - Requiere AL_LIO_PRODUCTION_IMPORT_CONFIRMATION=IMPORT_TO_AL_LIO_PRODUCTION_POSTGRES.
 *   - Rechaza sandbox (127.0.0.1:54329).
 *   - Exige database=al_lio y user=al_lio.
 *   - Imprime host/db/user pero NUNCA password ni URL completa.
 *   - Usa whitelist fija de tablas — no interpola nombres externos en SQL.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ── Guardias de seguridad ─────────────────────────────────────────────────────

const allowImport = process.env.AL_LIO_ALLOW_PRODUCTION_IMPORT;
if (allowImport !== "true") {
  console.error(
    "\nERROR: Verificación de producción bloqueada.\n" +
    "Requiere: AL_LIO_ALLOW_PRODUCTION_IMPORT=true\n"
  );
  process.exit(1);
}

const confirmation = process.env.AL_LIO_PRODUCTION_IMPORT_CONFIRMATION;
if (confirmation !== "IMPORT_TO_AL_LIO_PRODUCTION_POSTGRES") {
  console.error(
    "\nERROR: Confirmación de producción incorrecta o ausente.\n" +
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
if (SANDBOX_HOSTS.includes(parsed.hostname) || parsed.port === "54329") {
  console.error(
    `\nERROR: DATABASE_URL apunta al sandbox (${parsed.hostname}:${parsed.port || "5432"}).\n` +
    "La verificación de producción rechaza conexiones a sandbox.\n"
  );
  process.exit(1);
}

// Validar database
const dbName = parsed.pathname.slice(1);
if (dbName !== "al_lio") {
  console.error(
    `\nERROR: Base de datos esperada "al_lio", detectada "${dbName}".\n`
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
    "Uso: node scripts/migration/verify-production-migration.mjs migration-artifacts/supabase-export-YYYYMMDD-HHMMSS\n"
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
console.log(`Manifest: ${artifactArg}`);
console.log(`Exportado: ${manifest.exported_at}\n`);

// ── Whitelist fija de tablas ──────────────────────────────────────────────────
// Solo se verifican estas tablas. No se interpolan nombres externos en SQL.

const TABLES = [
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

// ── Verificar recuentos contra manifest ──────────────────────────────────────

const { Client } = require("pg");
const client = new Client({ connectionString });

let passed = 0;
let failed = 0;

function ok(msg)   { console.log(`  OK  ${msg}`); passed++; }
function fail(msg) { console.error(`  FAIL  ${msg}`); failed++; }

try {
  await client.connect();
  console.log("Conexión a producción establecida.\n── Verificando recuentos ──");

  for (const table of TABLES) {
    const expectedCount = manifest.tables[table];
    if (expectedCount === undefined) {
      fail(`${table}: tabla no encontrada en manifest`);
      continue;
    }
    const res = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM public.${table}`
    );
    const actualCount = res.rows[0].cnt;
    if (actualCount === expectedCount) {
      ok(`${table}: ${actualCount} / ${expectedCount}`);
    } else {
      fail(`${table}: producción=${actualCount} vs manifest=${expectedCount}`);
    }
  }

} catch (err) {
  const isConnRefused = err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED");
  if (isConnRefused) {
    console.error(
      "\nERROR: No se puede conectar a producción.\n" +
      "Verifica que al_lio_postgres está levantado y DATABASE_URL es correcta.\n"
    );
  } else {
    console.error("\nERROR durante la verificación:", err.message);
  }
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}

console.log("");
if (failed > 0) {
  console.error(`RESULTADO: ${failed} discrepancia(s) de ${passed + failed} tablas. Revisar antes de abrir al público.`);
  process.exit(1);
} else {
  console.log(`RESULTADO: Verificación de producción OK — ${passed} tablas coinciden con el manifest.`);
}
