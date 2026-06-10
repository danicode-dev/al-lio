/**
 * al-lio — validador estático de preparación para despliegue VPS producción.
 * No requiere conexión real. Solo comprueba estructura de archivos y contenido.
 * Uso: node scripts/validate-production-deploy-readiness.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
let errors = 0;

function ok(msg)   { console.log(`  OK  ${msg}`); }
function fail(msg) { console.error(`  FAIL  ${msg}`); errors++; }
function check(label, condition) { condition ? ok(label) : fail(label); }
function read(path) {
  return existsSync(join(root, path)) ? readFileSync(join(root, path), "utf-8") : "";
}

// ── docker-compose.prod.yml — nombres finales ─────────────────────────────────

console.log("\n── infra/docker-compose.prod.yml ──");
const dc = read("infra/docker-compose.prod.yml");
check("docker-compose.prod.yml existe", existsSync(join(root, "infra/docker-compose.prod.yml")));
check("usa contenedor al_lio_web", dc.includes("al_lio_web"));
check("usa contenedor al_lio_postgres", dc.includes("al_lio_postgres"));
check("usa volumen al_lio_postgres_data", dc.includes("al_lio_postgres_data"));
check("usa red al_lio_internal", dc.includes("al_lio_internal"));
check("usa red externa danicode_web", dc.includes("danicode_web"));
check("no quedan nombres aidraft_web", !dc.includes("aidraft_web"));
check("no quedan nombres aidraft_postgres (servicio)", !dc.includes("aidraft_postgres:"));
check("no quedan nombres aidraft_internal", !dc.includes("aidraft_internal"));

// ── Caddyfile.example — dominio final ─────────────────────────────────────────

console.log("\n── infra/Caddyfile.example ──");
const caddy = read("infra/Caddyfile.example");
check("Caddyfile.example existe", existsSync(join(root, "infra/Caddyfile.example")));
check("contiene al-lio.danielcode.dev", caddy.includes("al-lio.danielcode.dev"));
check("reverse_proxy apunta a al_lio_web:3000", caddy.includes("al_lio_web:3000"));
check("no contiene aidraft.danielcode.dev", !caddy.includes("aidraft.danielcode.dev"));
check("no contiene aidraft_web", !caddy.includes("aidraft_web"));

// ── .env.production.example — dominio final y sin secretos reales ─────────────

console.log("\n── .env.production.example ──");
const envEx = read(".env.production.example");
check(".env.production.example existe", existsSync(join(root, ".env.production.example")));
check("BASE_URL es al-lio.danielcode.dev", envEx.includes("BASE_URL=https://al-lio.danielcode.dev"));
check("GOOGLE_REDIRECT_URI es al-lio.danielcode.dev", envEx.includes("al-lio.danielcode.dev/api/google/calendar/callback"));
check("DATABASE_URL apunta a al_lio_postgres", envEx.includes("@al_lio_postgres:5432/al_lio"));
check("no contiene BASE_URL con aidraft", !envEx.includes("BASE_URL=https://aidraft"));
// Seguridad: todos los valores sensibles deben ser REPLACE_ME
check("no contiene secretos reales (supabase key largo)", !(/NEXT_PUBLIC_SUPABASE_ANON_KEY=ey[A-Za-z0-9]/.test(envEx)));
check("no contiene secretos reales (service role key)", !(/SUPABASE_SERVICE_ROLE_KEY=ey[A-Za-z0-9]/.test(envEx)));
check("no contiene secretos reales (Google client secret)", !(/GOOGLE_CLIENT_SECRET=[A-Za-z0-9_-]{20,}/.test(envEx)));

// ── Sin nombres aidraft_* en archivos de producción ───────────────────────────

console.log("\n── Sin residuos aidraft_* en producción ──");
const prodFiles = [
  "infra/docker-compose.prod.yml",
  "infra/Caddyfile.example",
  ".env.production.example",
];
for (const f of prodFiles) {
  const content = read(f);
  // Permitimos "aidraft" en comentarios/docs pero no como nombre funcional de contenedor/red
  const hasAidraftService = /^\s*(aidraft_web|aidraft_postgres|aidraft_internal):/m.test(content);
  check(`${f}: sin nombres funcionales aidraft_* como servicio/red`, !hasAidraftService);
}

// ── Git staged — seguridad ────────────────────────────────────────────────────

console.log("\n── Git staged — seguridad ──");
let staged = "";
try {
  staged = execSync("git diff --cached --name-only", { cwd: root, encoding: "utf-8" });
} catch {
  // ok if not in git
}
const stagedFiles = staged.split("\n").filter(Boolean);
check("No hay .env staged", !stagedFiles.includes(".env"));
check("No hay migration-artifacts/ staged", !stagedFiles.some(f => f.startsWith("migration-artifacts/")));
check("No hay dumps staged", !stagedFiles.some(f => f.endsWith(".dump") || f.endsWith(".backup")));
check("No hay _archive/ staged", !stagedFiles.some(f => f.startsWith("_archive/")));

// ── Resultado ─────────────────────────────────────────────────────────────────

console.log("");
if (errors > 0) {
  console.error(`RESULTADO: ${errors} problema(s) encontrado(s). Revisar antes de desplegar.`);
  process.exit(1);
} else {
  console.log("RESULTADO: Preparación para despliegue VPS producción OK.");
}
