/**
 * Managed lifecycle for the browser E2E harness (issue #329).
 *
 * Split out from run.mjs so the teardown guarantee is covered by a fast,
 * non-browser regression test (tests/operations/e2e-harness/runner-cleanup):
 * the caller injects `exec` and `waitForDatabase`, so a test can force a
 * failure at database startup, database readiness or the migration step and
 * assert that `docker compose ... down -v` still runs and that the process
 * exit code is preserved.
 *
 * Injected `exec(command, args, options)` contract:
 *   - returns the child exit status (a number) on success;
 *   - throws an Error carrying a numeric `exitCode` when the child fails and
 *     `options.allowFailure` is not set.
 * `waitForDatabase(databaseUrl)` resolves when the database is reachable and
 * throws an Error carrying a numeric `exitCode` when it never becomes ready.
 *
 * Nothing here calls process.exit(): every failure propagates to this
 * function's own `finally`, so the Docker teardown always runs once the
 * lifecycle has been started.
 */

export async function runManagedE2e({
  composeFile,
  manageDb,
  databaseUrl,
  childEnv,
  exec,
  waitForDatabase,
  logger = console,
}) {
  let exitCode = 1;
  // Set the moment the Docker lifecycle is *attempted*, so a partially
  // successful `up` (network created, container unhealthy, `--wait` times
  // out) is still torn down.
  let dockerLifecycleStarted = false;

  try {
    if (manageDb) {
      dockerLifecycleStarted = true;
      exec("docker", ["compose", "-f", composeFile, "up", "-d", "--wait"]);
    }

    await waitForDatabase(databaseUrl);

    exec("node", ["scripts/postgres/migrate.mjs"], {
      env: { ...childEnv, DATABASE_URL: databaseUrl, DATABASE_MIGRATION_URL: databaseUrl },
    });

    // Playwright's own exit code answers "did the suite pass", so a failure
    // here is captured verbatim rather than thrown.
    exitCode = exec("npx", ["playwright", "test", "--config", "playwright.config.ts"], {
      env: childEnv,
      allowFailure: true,
    });
  } catch (error) {
    exitCode = normalizeExitCode(error);
    logger.error(`[e2e] ${error?.message ?? error}`);
  } finally {
    if (manageDb && dockerLifecycleStarted) {
      try {
        const teardownStatus = exec("docker", ["compose", "-f", composeFile, "down", "-v"], {
          env: process.env,
          allowFailure: true,
        });
        if (teardownStatus !== 0) {
          logger.error(`[e2e] "docker compose ... down -v" exited with ${teardownStatus}`);
          if (exitCode === 0) exitCode = teardownStatus;
        }
      } catch (error) {
        logger.error(`[e2e] database teardown threw: ${error?.message ?? error}`);
        if (exitCode === 0) exitCode = normalizeExitCode(error);
      }
    }
  }

  return exitCode;
}

function normalizeExitCode(error) {
  const code = error?.exitCode;
  return Number.isInteger(code) && code !== 0 ? code : 1;
}
