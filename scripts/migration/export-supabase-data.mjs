/**
 * Exporta datos desde Supabase (conexión PostgreSQL directa) a JSON locales.
 * Los archivos se guardan en migration-artifacts/ (ignorada por git).
 *
 * AVISO: Este script conecta a Supabase REMOTO. Nunca lo ejecutes sin
 * revisar las variables de entorno y confirmar que es lo que quieres hacer.
 *
 * Variables obligatorias:
 *   SUPABASE_DB_URL                    — URL de conexión directa a Supabase
 *   AIDRAFT_ALLOW_SUPABASE_EXPORT=true — confirmación explícita de la operación
 *   AIDRAFT_EXPORT_CONFIRMATION=EXPORT_SUPABASE_TO_LOCAL_JSON — segunda confirmación
 *
 * Uso:
 *   AIDRAFT_ALLOW_SUPABASE_EXPORT=true \
 *   AIDRAFT_EXPORT_CONFIRMATION=EXPORT_SUPABASE_TO_LOCAL_JSON \
 *   SUPABASE_DB_URL=postgresql://... \
 *   node scripts/migration/export-supabase-data.mjs
 *
 * No modifica nada en Supabase. Solo lectura.
 * No toca VPS, sandbox ni producción propia.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ── Guardias de seguridad ─────────────────────────────────────────────────────

if (!process.env.AIDRAFT_ALLOW_SUPABASE_EXPORT) {
  console.error(
    "\n⛔  OPERACIÓN BLOQUEADA\n\n" +
    "Este script conecta a Supabase remoto y exporta datos reales.\n" +
    "Para continuar, define las siguientes variables explícitamente:\n\n" +
    "  AIDRAFT_ALLOW_SUPABASE_EXPORT=true\n" +
    "  AIDRAFT_EXPORT_CONFIRMATION=EXPORT_SUPABASE_TO_LOCAL_JSON\n\n" +
    "Asegúrate de que estás en un entorno seguro y has revisado las variables."
  );
  process.exit(1);
}

if (process.env.AIDRAFT_EXPORT_CONFIRMATION !== "EXPORT_SUPABASE_TO_LOCAL_JSON") {
  console.error(
    "\n⛔  CONFIRMACIÓN INCORRECTA\n\n" +
    "Define la variable:\n" +
    "  AIDRAFT_EXPORT_CONFIRMATION=EXPORT_SUPABASE_TO_LOCAL_JSON\n"
  );
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_DB_URL;
if (!supabaseUrl) {
  console.error(
    "\nERROR: SUPABASE_DB_URL no está definida.\n" +
    "Define la URL de conexión directa de Supabase DB antes de ejecutar."
  );
  process.exit(1);
}

// Confirmar que es Supabase (evitar apuntar accidentalmente al sandbox o producción propia)
const parsedUrl = new URL(supabaseUrl);
const isSandbox = ["localhost", "127.0.0.1"].includes(parsedUrl.hostname) && parsedUrl.port === "54329";
if (isSandbox) {
  console.error(
    "\nERROR: SUPABASE_DB_URL apunta al sandbox local (127.0.0.1:54329).\n" +
    "Usa POSTGRES_SANDBOX_DATABASE_URL para el sandbox, no SUPABASE_DB_URL."
  );
  process.exit(1);
}

console.log(
  "\n⚠️  AVISO: Conectando a Supabase REMOTO.\n" +
  `   Host: ${parsedUrl.hostname}\n` +
  "   Solo lectura. No se modificará nada en Supabase.\n"
);

// ── Preparar directorio de salida ─────────────────────────────────────────────

const { Client } = require("pg");
const root = process.cwd();
const now = new Date();
const ts = now.toISOString().replace(/[-:T]/g, "").slice(0, 15);
const outDir = join(root, "migration-artifacts", `supabase-export-${ts}`);
mkdirSync(outDir, { recursive: true });
console.log(`Exportando a: migration-artifacts/supabase-export-${ts}/\n`);

// ── Tablas de negocio a exportar ──────────────────────────────────────────────

const BUSINESS_TABLES = [
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

const client = new Client({ connectionString: supabaseUrl });
const manifest = {
  exported_at: now.toISOString(),
  source: "supabase",
  expected_destination: "sandbox",
  auth_users_accessible: false,
  warnings: [],
  tables: {},
};

try {
  await client.connect();
  console.log("Conexión a Supabase establecida.\n");

  // ── Intentar exportar auth.users ────────────────────────────────────────────
  console.log("── Usuarios ──");
  let usersData = [];
  let authAccessible = false;

  try {
    const authRes = await client.query(
      `SELECT id, email FROM auth.users ORDER BY created_at`
    );
    usersData = authRes.rows.map(r => ({
      id: r.id,
      email: r.email,
      password_hash: null,
      display_name: null,
      role: "user",
    }));
    authAccessible = true;
    console.log(`  OK  auth.users accesible — ${usersData.length} usuarios`);
  } catch {
    console.log("  WARN  auth.users no accesible — usando fallback desde user_id en tablas");
    manifest.warnings.push("auth.users no fue accesible; emails generados con placeholder migrated-<uuid>@example.test");

    // Fallback: recoger distinct user_id de tablas user-scoped
    const userScopedTables = BUSINESS_TABLES.filter(t => t !== "tech_opportunities");
    const idSet = new Set();
    for (const table of userScopedTables) {
      try {
        const res = await client.query(`SELECT DISTINCT user_id FROM public.${table} WHERE user_id IS NOT NULL`);
        res.rows.forEach(r => idSet.add(r.user_id));
      } catch {
        // tabla podría no tener user_id o no existir en este schema
      }
    }
    usersData = Array.from(idSet).map(id => ({
      id,
      email: `migrated-${id}@example.test`,
      password_hash: null,
      display_name: null,
      role: "user",
    }));
    console.log(`  OK  ${usersData.length} usuarios construidos desde user_id distintos`);
  }

  manifest.auth_users_accessible = authAccessible;
  manifest.tables.users = usersData.length;
  writeFileSync(join(outDir, "users.json"), JSON.stringify(usersData, null, 2));
  console.log(`  OK  users.json — ${usersData.length} filas`);

  // ── Exportar tablas de negocio ──────────────────────────────────────────────
  console.log("\n── Tablas de negocio ──");
  for (const table of BUSINESS_TABLES) {
    try {
      const res = await client.query(`SELECT * FROM public.${table} ORDER BY created_at NULLS LAST`);
      const rows = res.rows;
      manifest.tables[table] = rows.length;
      writeFileSync(join(outDir, `${table}.json`), JSON.stringify(rows, null, 2));
      console.log(`  OK  ${table}.json — ${rows.length} filas`);
    } catch (err) {
      console.log(`  WARN  ${table}: ${err.message}`);
      manifest.warnings.push(`tabla ${table}: ${err.message}`);
      manifest.tables[table] = 0;
      writeFileSync(join(outDir, `${table}.json`), JSON.stringify([], null, 2));
    }
  }

  // ── Escribir manifest ───────────────────────────────────────────────────────
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("\n── Manifest ──");
  console.log(`  OK  manifest.json`);
  console.log(`\nTablas exportadas:`);
  for (const [t, count] of Object.entries(manifest.tables)) {
    console.log(`  ${t}: ${count}`);
  }
  if (manifest.warnings.length) {
    console.log("\nAvisos:");
    manifest.warnings.forEach(w => console.log(`  WARN  ${w}`));
  }

  console.log(
    `\nRESULTADO: Export completado en migration-artifacts/supabase-export-${ts}/\n` +
    "Recuerda: migration-artifacts/ está en .gitignore. No commitees estos archivos."
  );

} catch (err) {
  console.error("\nERROR durante el export:", err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
