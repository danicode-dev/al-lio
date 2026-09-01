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
    command: "npm run e2e:app",
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      NODE_ENV: "development",
      DATABASE_URL: databaseUrl,
      SESSION_SECRET: sessionSecret,
      BASE_URL: baseURL,
      AL_LIO_DEMO_ACCESS_ENABLED: "false",
      PORT: String(appPort),
    },
  },
});
