/**
 * Verifica que los recuentos del manifest coinciden con el sandbox.
 * Solo conecta al sandbox. No toca Supabase ni producción.
 *
 * Uso:
 *   node scripts/migration/verify-sandbox-migration.mjs migration-artifacts/supabase-export-YYYYMMDD-HHMMSS
 *
 * Variables opcionales:
 *   POSTGRES_SANDBOX_DATABASE_URL — override (debe ser localhost/127.0.0.1:54329)
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
    "Uso: node scripts/migration/verify-sandbox-migration.mjs migration-artifacts/supabase-export-YYYYMMDD-HHMMSS"
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

// ── Validar conexión sandbox ──────────────────────────────────────────────────

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
    `\nERROR: Solo se permite verificación en sandbox (localhost/127.0.0.1:54329).\n` +
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

console.log(`\nManifest: ${artifactArg}`);
console.log(`Exportado: ${manifest.exported_at}`);
console.log(`Sandbox: ${parsed.hostname}:${parsed.port}/${parsed.pathname.slice(1)}\n`);

// ── Comparar recuentos ────────────────────────────────────────────────────────

const { Client } = require("pg");
const client = new Client({ connectionString });

let passed = 0;
let failed = 0;

function ok(msg)   { console.log(`  OK  ${msg}`); passed++; }
function fail(msg) { console.error(`  FAIL  ${msg}`); failed++; }

try {
  await client.connect();
  console.log("Conexión sandbox establecida.\n── Verificando recuentos ──");

  for (const [table, expectedCount] of Object.entries(manifest.tables)) {
    const res = await client.query(`SELECT COUNT(*)::int AS cnt FROM public.${table}`);
    const actualCount = res.rows[0].cnt;
    if (actualCount === expectedCount) {
      ok(`${table}: ${actualCount} / ${expectedCount}`);
    } else {
      fail(`${table}: sandbox=${actualCount} vs manifest=${expectedCount}`);
    }
  }

} catch (err) {
  const isConnRefused = err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED");
  if (isConnRefused) {
    console.error(
      "\nERROR: No se puede conectar al sandbox.\n" +
      "Levanta el sandbox: npm run postgres:sandbox:up"
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
  console.error(`RESULTADO: ${failed} discrepancia(s) encontrada(s) de ${passed + failed} tablas.`);
  process.exit(1);
} else {
  console.log(`RESULTADO: Verificación OK — ${passed} tablas coinciden con el manifest.`);
}
