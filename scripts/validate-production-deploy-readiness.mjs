/**
 * al-lio - static VPS production deploy readiness validator.
 *
 * It does not connect to production. It checks repository files, operational
 * runbooks, and staged files so deploy preparation cannot drift silently.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
let errors = 0;

function ok(message) {
  console.log(`  OK  ${message}`);
}

function fail(message) {
  console.error(`  FAIL  ${message}`);
  errors++;
}

function check(label, condition) {
  condition ? ok(label) : fail(label);
}

function read(path) {
  const fullPath = join(root, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf-8") : "";
}

console.log("\n-- infra/docker-compose.prod.yml --");
const compose = read("infra/docker-compose.prod.yml");
check("docker-compose.prod.yml exists", existsSync(join(root, "infra/docker-compose.prod.yml")));
check("uses al_lio_web container", compose.includes("al_lio_web"));
check("uses al_lio_postgres container", compose.includes("al_lio_postgres"));
check("uses al_lio_postgres_data volume", compose.includes("al_lio_postgres_data"));
check("uses al_lio_internal network", compose.includes("al_lio_internal"));
check("uses external danicode_web network", compose.includes("danicode_web"));
check("does not use aidraft_web", !compose.includes("aidraft_web"));
check("does not use aidraft_postgres as service", !compose.includes("aidraft_postgres:"));
check("does not use aidraft_internal", !compose.includes("aidraft_internal"));

console.log("\n-- infra/Caddyfile.example --");
const caddy = read("infra/Caddyfile.example");
check("Caddyfile.example exists", existsSync(join(root, "infra/Caddyfile.example")));
check("contains al-lio.danielcode.dev", caddy.includes("al-lio.danielcode.dev"));
check("reverse_proxy points to al_lio_web:3000", caddy.includes("al_lio_web:3000"));
check("does not contain aidraft.danielcode.dev", !caddy.includes("aidraft.danielcode.dev"));
check("does not contain aidraft_web", !caddy.includes("aidraft_web"));

console.log("\n-- .env.production.example --");
const envExample = read(".env.production.example");
check(".env.production.example exists", existsSync(join(root, ".env.production.example")));
check("BASE_URL is al-lio.danielcode.dev", envExample.includes("BASE_URL=https://al-lio.danielcode.dev"));
check(
  "GOOGLE_REDIRECT_URI is al-lio.danielcode.dev",
  envExample.includes("al-lio.danielcode.dev/api/google/calendar/callback"),
);
check("DATABASE_URL points to al_lio_postgres", envExample.includes("@al_lio_postgres:5432/al_lio"));
check("does not contain aidraft BASE_URL", !envExample.includes("BASE_URL=https://aidraft"));
check("does not contain real Supabase anon key", !(/NEXT_PUBLIC_SUPABASE_ANON_KEY=ey[A-Za-z0-9]/.test(envExample)));
check("does not contain real Supabase service role key", !(/SUPABASE_SERVICE_ROLE_KEY=ey[A-Za-z0-9]/.test(envExample)));
check("does not contain real Google client secret", !(/GOOGLE_CLIENT_SECRET=[A-Za-z0-9_-]{20,}/.test(envExample)));

console.log("\n-- No functional aidraft_* names in production files --");
const productionFiles = [
  "infra/docker-compose.prod.yml",
  "infra/Caddyfile.example",
  ".env.production.example",
];

for (const file of productionFiles) {
  const content = read(file);
  const hasAidraftService = /^\s*(aidraft_web|aidraft_postgres|aidraft_internal):/m.test(content);
  check(`${file}: no aidraft_* service/network names`, !hasAidraftService);
}

console.log("\n-- Production migration scripts --");
const importProduction = read("scripts/migration/import-production-data.mjs");
const verifyProduction = read("scripts/migration/verify-production-migration.mjs");

check(
  "import-production-data.mjs exists",
  existsSync(join(root, "scripts/migration/import-production-data.mjs")),
);
check(
  "import-production requires AL_LIO_ALLOW_PRODUCTION_IMPORT",
  importProduction.includes("AL_LIO_ALLOW_PRODUCTION_IMPORT"),
);
check(
  "import-production requires AL_LIO_PRODUCTION_IMPORT_CONFIRMATION",
  importProduction.includes("AL_LIO_PRODUCTION_IMPORT_CONFIRMATION"),
);
check(
  "import-production requires exact IMPORT_TO_AL_LIO_PRODUCTION_POSTGRES confirmation",
  importProduction.includes("IMPORT_TO_AL_LIO_PRODUCTION_POSTGRES"),
);
check(
  "import-production rejects sandbox 127.0.0.1:54329",
  importProduction.includes("127.0.0.1") && importProduction.includes("54329"),
);
check("import-production validates al_lio database", importProduction.includes('"al_lio"'));
check("import-production validates al_lio user", importProduction.includes('parsed.username !== "al_lio"'));
check(
  "import-production does not log full DATABASE_URL",
  !importProduction.includes("console.log(connectionString") &&
    !importProduction.includes("console.log(DATABASE_URL"),
);
check(
  "import-production does not log password",
  !importProduction.includes("parsed.password") &&
    !importProduction.includes("console.log(password"),
);
check("import-production uses BEGIN/COMMIT transaction", importProduction.includes("BEGIN") && importProduction.includes("COMMIT"));
check("import-production uses ROLLBACK", importProduction.includes("ROLLBACK"));
check(
  "import-production verifies counts before COMMIT",
  importProduction.indexOf("throw new Error") !== -1 &&
    importProduction.indexOf('query("COMMIT")') !== -1 &&
    importProduction.indexOf("throw new Error") < importProduction.indexOf('query("COMMIT")'),
);
check("import-production uses fixed TABLES whitelist", importProduction.includes("const TABLES = ["));

check(
  "verify-production-migration.mjs exists",
  existsSync(join(root, "scripts/migration/verify-production-migration.mjs")),
);
check(
  "verify-production requires AL_LIO_ALLOW_PRODUCTION_IMPORT",
  verifyProduction.includes("AL_LIO_ALLOW_PRODUCTION_IMPORT"),
);
check(
  "verify-production requires AL_LIO_PRODUCTION_IMPORT_CONFIRMATION",
  verifyProduction.includes("AL_LIO_PRODUCTION_IMPORT_CONFIRMATION"),
);
check(
  "verify-production rejects sandbox 127.0.0.1:54329",
  verifyProduction.includes("127.0.0.1") && verifyProduction.includes("54329"),
);
check("verify-production validates al_lio database", verifyProduction.includes('"al_lio"'));
check("verify-production validates al_lio user", verifyProduction.includes('parsed.username !== "al_lio"'));
check(
  "verify-production does not log full DATABASE_URL",
  !verifyProduction.includes("console.log(connectionString") &&
    !verifyProduction.includes("console.log(DATABASE_URL"),
);
check(
  "verify-production does not log password",
  !verifyProduction.includes("parsed.password") &&
    !verifyProduction.includes("console.log(password"),
);
check("verify-production uses fixed TABLES whitelist", verifyProduction.includes("const TABLES = ["));

console.log("\n-- docs/DEPLOY_VPS.md --");
const runbook = read("docs/DEPLOY_VPS.md");
check("active VPS runbook exists", existsSync(join(root, "docs/DEPLOY_VPS.md")));
check("runbook uses production compose file", runbook.includes("infra/docker-compose.prod.yml"));
check("runbook loads real .env with --env-file", runbook.includes("--env-file .env"));
check(
  "runbook uses compose order validated on VPS",
  runbook.includes("docker compose -f infra/docker-compose.prod.yml --env-file .env"),
);
check("runbook does not require Node.js on host", !runbook.includes("npm ci --omit=dev"));
check("runbook does not use local curl healthcheck", !runbook.includes("curl http://localhost:3000"));
check("runbook uses internal al_lio_web healthcheck", runbook.includes("docker exec al_lio_web wget"));
check(
  "runbook validates public JSON health response",
  runbook.includes("curl -fsS https://al-lio.danielcode.dev/api/health"),
);
check("runbook documents commit rollback", runbook.includes("git checkout <commit-anterior>"));

console.log("\n-- Git staged safety --");
let staged = "";
try {
  staged = execSync("git diff --cached --name-only", { cwd: root, encoding: "utf-8" });
} catch {
  // ok if not in git
}
const stagedFiles = staged.split("\n").filter(Boolean);
check("No .env staged", !stagedFiles.includes(".env"));
check("No migration-artifacts/ staged", !stagedFiles.some((file) => file.startsWith("migration-artifacts/")));
check("No dumps staged", !stagedFiles.some((file) => file.endsWith(".dump") || file.endsWith(".backup")));
check("No _archive/ staged", !stagedFiles.some((file) => file.startsWith("_archive/")));

console.log("");
if (errors > 0) {
  console.error(`RESULT: ${errors} issue(s) found. Review before deploying.`);
  process.exit(1);
}

console.log("RESULT: VPS production deploy readiness OK.");
