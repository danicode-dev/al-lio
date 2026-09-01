import assert from "node:assert/strict";
import test from "node:test";

import { runManagedE2e } from "../../../scripts/e2e/lifecycle.mjs";

// These tests never touch Docker, Playwright or any database: `exec` and
// `waitForDatabase` are stubbed. They prove that a failure during database
// startup, database readiness or migration still runs
// `docker compose ... down -v` and preserves the failing exit code - i.e.
// process.exit() no longer bypasses the teardown.

const COMPOSE_FILE = "infra/docker-compose.e2e.yml";
const silentLogger = { error() {}, log() {} };

function label(command, args) {
  return `${command} ${args.join(" ")}`;
}

function makeExec({ failOn, failCode = 7 } = {}) {
  const calls = [];
  function exec(command, args, options = {}) {
    calls.push({ command, args, label: label(command, args), allowFailure: Boolean(options.allowFailure) });
    if (failOn && label(command, args).includes(failOn)) {
      if (options.allowFailure) return failCode;
      throw Object.assign(new Error(`stub failure: ${label(command, args)}`), { exitCode: failCode });
    }
    return 0;
  }
  return { exec, calls };
}

const okWait = async () => undefined;

function teardownCall(calls) {
  return calls.find((call) => call.command === "docker" && call.args.includes("down") && call.args.includes("-v"));
}

function baseArgs(overrides = {}) {
  return {
    composeFile: COMPOSE_FILE,
    manageDb: true,
    databaseUrl: "postgresql://al_lio_e2e:al_lio_e2e@127.0.0.1:54339/al_lio_e2e",
    childEnv: { PATH: process.env.PATH },
    logger: silentLogger,
    ...overrides,
  };
}

test("teardown runs and the exit code is preserved when 'docker compose up' fails", async () => {
  const { exec, calls } = makeExec({ failOn: "up -d --wait", failCode: 3 });

  const exitCode = await runManagedE2e(baseArgs({ exec, waitForDatabase: okWait }));

  assert.equal(exitCode, 3, "the failing 'up' exit code is preserved");
  assert.ok(teardownCall(calls), "'docker compose ... down -v' still ran");
  assert.ok(
    !calls.some((call) => call.label.includes("migrate.mjs")),
    "migration was not attempted after a failed startup",
  );
});

test("teardown runs when a partially successful startup leaves the database unreachable", async () => {
  const { exec, calls } = makeExec();
  const waitForDatabase = async () => {
    throw Object.assign(new Error("Database did not become reachable"), { exitCode: 1 });
  };

  const exitCode = await runManagedE2e(baseArgs({ exec, waitForDatabase }));

  assert.equal(exitCode, 1);
  assert.ok(teardownCall(calls), "the container/network created by 'up' is torn down");
  assert.ok(!calls.some((call) => call.label.includes("playwright")), "Playwright never started");
});

test("teardown runs and the exit code is preserved when migration fails", async () => {
  const { exec, calls } = makeExec({ failOn: "migrate.mjs", failCode: 5 });

  const exitCode = await runManagedE2e(baseArgs({ exec, waitForDatabase: okWait }));

  assert.equal(exitCode, 5, "the migration exit code is preserved");
  const upIndex = calls.findIndex((call) => call.label.includes("up -d --wait"));
  const downIndex = calls.findIndex((call) => call === teardownCall(calls));
  assert.ok(upIndex >= 0 && downIndex > upIndex, "teardown is ordered after startup");
  assert.ok(!calls.some((call) => call.label.includes("playwright")), "Playwright never started");
});

test("a Playwright failure is surfaced verbatim and teardown still runs", async () => {
  const { exec, calls } = makeExec({ failOn: "playwright", failCode: 1 });

  const exitCode = await runManagedE2e(baseArgs({ exec, waitForDatabase: okWait }));

  assert.equal(exitCode, 1, "Playwright's own exit code is returned");
  const playwrightCall = calls.find((call) => call.label.includes("playwright"));
  assert.ok(playwrightCall?.allowFailure, "Playwright is run with allowFailure so teardown is reached");
  assert.ok(teardownCall(calls), "teardown ran after a failed suite");
});

test("the happy path still tears the database down", async () => {
  const { exec, calls } = makeExec();

  const exitCode = await runManagedE2e(baseArgs({ exec, waitForDatabase: okWait }));

  assert.equal(exitCode, 0);
  assert.ok(teardownCall(calls), "teardown always runs");
});

test("a teardown failure is reported and does not mask a passing suite as success", async () => {
  const { exec, calls } = makeExec({ failOn: "down -v", failCode: 9 });

  const exitCode = await runManagedE2e(baseArgs({ exec, waitForDatabase: okWait }));

  assert.equal(exitCode, 9, "a failed teardown is not silently swallowed");
  assert.ok(teardownCall(calls), "teardown was attempted");
});

test("with E2E_MANAGE_DB=false no teardown is attempted even on failure", async () => {
  const { exec, calls } = makeExec({ failOn: "migrate.mjs", failCode: 4 });

  const exitCode = await runManagedE2e(baseArgs({ exec, waitForDatabase: okWait, manageDb: false }));

  assert.equal(exitCode, 4, "the failure still propagates");
  assert.ok(!teardownCall(calls), "an externally managed database is never torn down by the runner");
  assert.ok(!calls.some((call) => call.command === "docker"), "Docker is not touched at all");
});
