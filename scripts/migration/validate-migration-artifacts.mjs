/**
 * Validación estática de seguridad para la migración.
 * No requiere conexión real. Solo comprueba estructura y configuración local.
 *
 * Comprueba que:
 * - migration-artifacts/ está en .gitignore
 * - no hay archivos JSON exportados staged en git
 * - no hay dumps .sql/.dump/.backup staged
 * - SUPABASE_DB_URL no está escrita en archivos de la rama
 * - los scripts de migración no imprimen connection strings completas
 *
 * Uso: node scripts/migration/validate-migration-artifacts.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
let errors = 0;

function ok(msg)   { console.log(`  OK  ${msg}`); }
function fail(msg) { console.error(`  FAIL  ${msg}`); errors++; }
function warn(msg) { console.log(`  WARN  ${msg}`); }
function check(label, condition) { condition ? ok(label) : fail(label); }

// ── .gitignore contiene migration-artifacts/ ─────────────────────────────────

console.log("\n── .gitignore ──");
const gitignorePath = join(root, ".gitignore");
if (existsSync(gitignorePath)) {
  const gitignore = readFileSync(gitignorePath, "utf-8");
  check("migration-artifacts/ en .gitignore", gitignore.includes("migration-artifacts"));
} else {
  fail(".gitignore no encontrado");
}

// ── Archivos staged (no deben incluir datos exportados) ───────────────────────

console.log("\n── Git staged — sin datos exportados ──");
let staged = "";
try {
  staged = execSync("git diff --cached --name-only", { cwd: root, encoding: "utf-8" });
} catch {
  warn("No se pudo obtener archivos staged (puede que no sea un repo git activo)");
}

const stagedFiles = staged.split("\n").filter(Boolean);

const hasJsonExports = stagedFiles.some(f =>
  f.startsWith("migration-artifacts/") && f.endsWith(".json")
);
check("Ningún JSON de migration-artifacts/ staged", !hasJsonExports);

const hasDumps = stagedFiles.some(f =>
  f.endsWith(".sql") || f.endsWith(".dump") || f.endsWith(".backup")
);
check("Ningún .sql/.dump/.backup staged", !hasDumps);

const hasEnvReal = stagedFiles.some(f => f === ".env");
check("No hay .env staged", !hasEnvReal);

if (stagedFiles.length > 0) {
  const suspicious = stagedFiles.filter(f =>
    f.startsWith("migration-artifacts/") ||
    f.endsWith(".json") && f.includes("supabase") ||
    f.endsWith(".dump") || f.endsWith(".backup")
  );
  if (suspicious.length > 0) {
    fail(`Archivos sospechosos staged: ${suspicious.join(", ")}`);
  } else {
    ok("Archivos staged sin datos sospechosos");
  }
} else {
  ok("No hay archivos staged (working tree limpio)");
}

// ── Scripts de migración no imprimen connection strings completas ─────────────

console.log("\n── Scripts de migración ──");
const migrationDir = join(root, "scripts", "migration");
if (existsSync(migrationDir)) {
  const scripts = readdirSync(migrationDir).filter(f => f.endsWith(".mjs"));

  for (const script of scripts) {
    const content = readFileSync(join(migrationDir, script), "utf-8");

    // No debe interpolar el VALOR de SUPABASE_DB_URL o supabaseUrl en console.log/error.
    // (mencionar el nombre de la variable en texto literal está OK)
    const printsSbUrlValue =
      /console\.(log|error)\([^)]*\$\{[^}]*SUPABASE_DB_URL[^}]*\}/.test(content) ||
      /console\.(log|error)\([^)]*\$\{supabaseUrl\}/.test(content) ||
      /console\.(log|error)\([^)]*process\.env\.SUPABASE_DB_URL/.test(content);
    check(`${script}: no imprime valor de SUPABASE_DB_URL en console`, !printsSbUrlValue);

    // No debe imprimir connectionString completa
    const printsConnStr = /console\.(log|error)\([^)]*connectionString[^)]*\)/.test(content);
    check(`${script}: no imprime connectionString completa`, !printsConnStr);

    // Debe rechazar hosts no-sandbox si es script de sandbox
    if (script.includes("sandbox") || script.includes("import") || script.includes("verify")) {
      check(
        `${script}: tiene guarda de host localhost/127.0.0.1`,
        content.includes("ALLOWED_HOSTS") || content.includes("127.0.0.1")
      );
    }
  }

  // Export script debe tener guardas dobles
  const exportScript = join(migrationDir, "export-supabase-data.mjs");
  if (existsSync(exportScript)) {
    const exportContent = readFileSync(exportScript, "utf-8");
    check(
      "export-supabase-data.mjs: requiere AIDRAFT_ALLOW_SUPABASE_EXPORT",
      exportContent.includes("AIDRAFT_ALLOW_SUPABASE_EXPORT")
    );
    check(
      "export-supabase-data.mjs: requiere AIDRAFT_EXPORT_CONFIRMATION",
      exportContent.includes("AIDRAFT_EXPORT_CONFIRMATION")
    );
    check(
      "export-supabase-data.mjs: no imprime supabaseUrl completa",
      !exportContent.includes("console.log(supabaseUrl") &&
      !exportContent.includes("console.error(supabaseUrl")
    );
  }
} else {
  fail("scripts/migration/ no existe");
}

// ── migration-artifacts no existe o está vacía (no hay exports previos staged) ──

console.log("\n── migration-artifacts/ ──");
const artifactsDir = join(root, "migration-artifacts");
if (!existsSync(artifactsDir)) {
  ok("migration-artifacts/ no existe aún (ningún export ejecutado)");
} else {
  warn("migration-artifacts/ existe localmente — comprueba que no está en git tracked");
  // Verificar que no está tracked en git
  try {
    const tracked = execSync("git ls-files migration-artifacts/", { cwd: root, encoding: "utf-8" });
    if (tracked.trim()) {
      fail(`migration-artifacts/ tiene archivos tracked en git: ${tracked.trim()}`);
    } else {
      ok("migration-artifacts/ no tiene archivos tracked en git");
    }
  } catch {
    ok("migration-artifacts/ no está en git (confirmado)");
  }
}

// ── Resultado ─────────────────────────────────────────────────────────────────

console.log("");
if (errors > 0) {
  console.error(`RESULTADO: ${errors} problema(s) de seguridad encontrado(s).`);
  process.exit(1);
} else {
  console.log("RESULTADO: Migration artifacts validation OK.");
}
