/**
 * Launcher for the browser E2E application (issue #329).
 *
 * Playwright's `webServer.command` runs this instead of `next dev` directly so
 * the application server is started with an environment rebuilt from an
 * allowlist - see scripts/e2e/app-env.mjs. The parent shell env is not
 * forwarded and `.env` / `.env.local` cannot reach the process, so the E2E
 * server receives only the synthetic per-run configuration the tested routes
 * need.
 *
 * This is a launcher only: no authentication bypass, no test-only route, no
 * production branch, no change to application runtime behaviour.
 */

import { spawn } from "node:child_process";

import { assertNoIntegrationSecrets, buildE2eAppEnv } from "./app-env.mjs";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[e2e-app] ${name} is not set. Start the suite through "npm run e2e".`);
    process.exit(1);
  }
  return value;
}

const host = process.env.E2E_APP_HOST || "127.0.0.1";
const port = process.env.E2E_APP_PORT || "3210";

let env;
try {
  env = buildE2eAppEnv({
    source: process.env,
    projectRoot: process.cwd(),
    overrides: {
      NODE_ENV: "development",
      PORT: String(port),
      HOSTNAME: host,
      DATABASE_URL: requireEnv("E2E_DATABASE_URL"),
      SESSION_SECRET: requireEnv("E2E_SESSION_SECRET"),
      BASE_URL: requireEnv("E2E_BASE_URL"),
      // Public one-click demo access stays off: the suite signs in with a
      // synthetic password, never the demo shortcut.
      AL_LIO_DEMO_ACCESS_ENABLED: "false",
    },
  });
  assertNoIntegrationSecrets(env);
} catch (error) {
  console.error(String(error?.message ?? error));
  process.exit(1);
}

const child = spawn("npx", ["next", "dev", "-H", host, "-p", String(port)], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

const forward = (signal) => {
  try {
    child.kill(signal);
  } catch {
    // The child may already be gone.
  }
};
process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});
