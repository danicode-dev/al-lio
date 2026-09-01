import { defineConfig, devices } from "@playwright/test";

import { resolveE2eConfig } from "./tests/e2e/support/env";

// Throws here if the configured targets are not a clearly isolated local
// environment - `playwright test` then fails before doing anything.
const { baseURL, appPort, databaseUrl } = resolveE2eConfig();

// Generated fresh per run by scripts/e2e/run.mjs, like the synthetic password.
// Never a literal in the repo.
const sessionSecret = process.env.E2E_SESSION_SECRET ?? "";
if (sessionSecret.length < 32) {
  throw new Error("[e2e-guard] E2E_SESSION_SECRET is missing. Run the suite through `npm run e2e`.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  outputDir: "./output/playwright/e2e-results",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL,
    headless: true,
    screenshot: "off",
    video: "off",
    // Local runs keep a trace only when a test fails, under output/ (gitignored).
    // CI keeps none: a trace records typed input and request bodies, i.e. the
    // synthetic password and the signed session cookie, and Playwright offers
    // no guaranteed redaction - so CI never produces one to upload.
    trace: process.env.CI ? "off" : "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // scripts/e2e/app.mjs starts `next dev` with an environment rebuilt from
    // an allowlist (scripts/e2e/app-env.mjs): the parent shell env is not
    // forwarded and `.env` / `.env.local` cannot reach the process, so the
    // E2E server receives only these synthetic per-run values.
    command: "node scripts/e2e/app.mjs",
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      E2E_DATABASE_URL: databaseUrl,
      E2E_SESSION_SECRET: sessionSecret,
      E2E_BASE_URL: baseURL,
      E2E_APP_PORT: String(appPort),
      E2E_APP_HOST: "127.0.0.1",
    },
  },
});
