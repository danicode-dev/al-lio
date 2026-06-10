/**
 * Validador estático de deploy readiness para VPS.
 * No requiere red ni secretos reales — solo comprueba estructura local.
 * Uso: node scripts/validate-deploy-readiness.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let errors = 0;

function ok(msg) {
  console.log(`  OK  ${msg}`);
}

function fail(msg) {
  console.error(`  FAIL  ${msg}`);
  errors++;
}

function check(label, condition, hint = "") {
  if (condition) ok(label);
  else fail(hint || label);
}

console.log("\n── Estructura de infra ──");
check("infra/Dockerfile existe", existsSync(join(root, "infra/Dockerfile")));
check("infra/docker-compose.prod.yml existe", existsSync(join(root, "infra/docker-compose.prod.yml")));
check("infra/Caddyfile.example existe", existsSync(join(root, "infra/Caddyfile.example")));
check(".env.production.example existe", existsSync(join(root, ".env.production.example")));

console.log("\n── next.config.ts ──");
const nextConfigPath = join(root, "next.config.ts");
if (existsSync(nextConfigPath)) {
  const nextConfig = readFileSync(nextConfigPath, "utf8");
  check('output: "standalone" configurado', nextConfig.includes('"standalone"'), 'Añadir output: "standalone" a next.config.ts');
} else {
  fail("next.config.ts no existe");
}

console.log("\n── Health endpoint ──");
check("app/api/health/route.ts existe", existsSync(join(root, "app/api/health/route.ts")));

console.log("\n── Variables de entorno (plantilla) ──");
const envExamplePath = join(root, ".env.production.example");
if (existsSync(envExamplePath)) {
  const envContent = readFileSync(envExamplePath, "utf8");
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_DB_URL",
    "TARGET_USER_EMAIL",
    "PROFILES_SHARED_PASSWORD",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "GOOGLE_TOKEN_ENCRYPTION_KEY",
    "BASE_URL",
  ];
  for (const varName of required) {
    check(`${varName} en .env.production.example`, envContent.includes(varName));
  }
}

console.log("\n── Variables de entorno (runtime) ──");
const requiredRuntime = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BASE_URL",
];
const missingRuntime = requiredRuntime.filter((v) => !process.env[v]);
if (missingRuntime.length > 0) {
  console.log(`  WARN  Variables no definidas en este entorno (normal en local):`);
  for (const v of missingRuntime) console.log(`        - ${v}`);
} else {
  ok("Todas las variables críticas están en el entorno");
}

console.log("\n── Dockerfile ──");
const dockerfilePath = join(root, "infra/Dockerfile");
if (existsSync(dockerfilePath)) {
  const dockerfile = readFileSync(dockerfilePath, "utf8");
  check("Multi-stage build (FROM ... AS builder)", dockerfile.includes("AS builder"));
  check("FROM ... AS runner", dockerfile.includes("AS runner"));
  check("HEALTHCHECK definido", dockerfile.includes("HEALTHCHECK"));
  check("USER nextjs (no-root)", dockerfile.includes("USER nextjs"));
  check("output standalone (server.js)", dockerfile.includes("server.js"));
}

console.log("\n── docker-compose.prod.yml ──");
const composePath = join(root, "infra/docker-compose.prod.yml");
if (existsSync(composePath)) {
  const compose = readFileSync(composePath, "utf8");
  check("container_name: aidraft_web", compose.includes("aidraft_web"));
  check("red danicode_web externa", compose.includes("danicode_web"));
  check("restart: unless-stopped", compose.includes("unless-stopped"));
  check("env_file definido", compose.includes("env_file"));
}

console.log("\n── package.json scripts ──");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
check("script build existe", Boolean(pkg.scripts?.build));
check("script start existe", Boolean(pkg.scripts?.start));
check("script validate:deploy existe", Boolean(pkg.scripts?.["validate:deploy"]));

console.log("\n── .gitignore ──");
const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
check(".env en .gitignore", gitignore.includes(".env"));
check(".next en .gitignore", gitignore.includes(".next"));
check("node_modules en .gitignore", gitignore.includes("node_modules"));

console.log("");
if (errors > 0) {
  console.error(`RESULTADO: ${errors} problema(s) encontrado(s). Revisa los FAIL anteriores.`);
  process.exit(1);
} else {
  console.log("RESULTADO: deploy readiness OK. La estructura está lista para VPS.");
}
