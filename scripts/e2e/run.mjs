/**
 * One command for the browser E2E harness (issue #329):
 *
 *   1. bring up a disposable local PostgreSQL (skipped when E2E_MANAGE_DB=false,
 *      e.g. in CI where an ephemeral service container is already provided),
 *   2. apply the existing migrations to it,
 *   3. run the Playwright suite (which starts and stops the app on port 3210),
 *   4. always tear the database down again, even on failure.
 *
 * Failure handling lives in scripts/e2e/lifecycle.mjs: `run()` and
 * `waitForDatabase()` throw instead of calling process.exit(), so control
 * always reaches the lifecycle's `finally` and `docker compose ... down -v`
 * runs whenever the Docker lifecycle was even attempted (including a partially
 * successful `up`). The original failing exit code is preserved where
 * practical.
 *
 * The authoritative fail-closed checks live in tests/e2e/support/env.ts and run
 * inside Playwright; the light checks here just stop this script before it
 * touches Docker with an obviously wrong target.
 */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

import { runManagedE2e } from "./lifecycle.mjs";

const require = createRequire(import.meta.url);
const { Client } = require("pg");

const COMPOSE_FILE = "infra/docker-compose.e2e.yml";
const DEFAULT_DATABASE_URL = "postgresql://al_lio_e2e:al_lio_e2e@127.0.0.1:54339/al_lio_e2e";
const DEFAULT_APP_PORT = "3210";
const LOOPBACK = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const databaseUrl = process.env.E2E_DATABASE_URL || DEFAULT_DATABASE_URL;
const appPort = process.env.E2E_APP_PORT || DEFAULT_APP_PORT;
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${appPort}`;
const manageDb = process.env.E2E_MANAGE_DB !== "false";

lightGuard();

// This env reaches the Playwright runner and the migration tool - not the
// application under test. scripts/e2e/app.mjs rebuilds the app's environment
// from an allowlist, so nothing here leaks into the E2E `next dev` process.
const childEnv = {
  ...process.env,
  E2E_DATABASE_URL: databaseUrl,
  E2E_BASE_URL: baseURL,
  E2E_APP_PORT: String(appPort),
  E2E_APP_HOST: "127.0.0.1",
  // Fresh, in-memory only, never logged.
  E2E_SYNTHETIC_PASSWORD: process.env.E2E_SYNTHETIC_PASSWORD || `e2e-${randomBytes(24).toString("base64url")}`,
  E2E_SESSION_SECRET: process.env.E2E_SESSION_SECRET || `e2e-secret-${randomBytes(24).toString("base64url")}`,
};

const exitCode = await runManagedE2e({
  composeFile: COMPOSE_FILE,
  manageDb,
  databaseUrl,
  childEnv,
  exec: run,
  waitForDatabase,
});

process.exit(exitCode);

function lightGuard() {
  const problems = [];
  for (const [label, value] of [["E2E_DATABASE_URL", databaseUrl], ["E2E_BASE_URL", baseURL]]) {
    if (value.includes("al-lio.app")) problems.push(`${label} must never reference al-lio.app`);
  }
  try {
    const db = new URL(databaseUrl);
    if (!LOOPBACK.has(db.hostname.replace(/^\[|\]$/g, ""))) problems.push("E2E_DATABASE_URL host is not loopback");
    if (!db.pathname.toLowerCase().includes("e2e")) problems.push('E2E_DATABASE_URL database name must contain "e2e"');
    if (!decodeURIComponent(db.username).toLowerCase().includes("e2e")) problems.push('E2E_DATABASE_URL user must contain "e2e"');
  } catch {
    problems.push("E2E_DATABASE_URL is not a valid URL");
  }
  try {
    const app = new URL(baseURL);
    if (!LOOPBACK.has(app.hostname.replace(/^\[|\]$/g, ""))) problems.push("E2E_BASE_URL host is not loopback");
    if (["3000", "3200"].includes(app.port)) problems.push(`port ${app.port} is reserved; the E2E app uses ${DEFAULT_APP_PORT}`);
  } catch {
    problems.push("E2E_BASE_URL is not a valid URL");
  }
  if (problems.length > 0) {
    console.error("[e2e] Refusing to run:\n - " + problems.join("\n - "));
    process.exit(1);
  }
}

/**
 * Run a child process synchronously. Returns its exit status. Throws an Error
 * carrying a numeric `exitCode` on failure unless `allowFailure` is set - the
 * caller's lifecycle turns that into a teardown-then-exit, never a bypass.
 */
function run(command, args, { env = process.env, allowFailure = false } = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (result.error) {
    if (allowFailure) return 1;
    throw Object.assign(new Error(`"${command} ${args.join(" ")}" could not be spawned: ${result.error.message}`), {
      exitCode: 1,
    });
  }
  if (result.status !== 0 && !allowFailure) {
    throw Object.assign(new Error(`"${command} ${args.join(" ")}" exited with ${result.status ?? result.signal}`), {
      exitCode: typeof result.status === "number" ? result.status : 1,
    });
  }
  return result.status ?? 1;
}

async function waitForDatabase(connectionString) {
  const deadline = Date.now() + 60_000;
  let lastError;
  while (Date.now() < deadline) {
    const client = new Client({ connectionString, application_name: "al-lio-e2e-wait" });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw Object.assign(new Error(`Database did not become reachable: ${lastError?.message ?? "unknown error"}`), {
    exitCode: 1,
  });
}
