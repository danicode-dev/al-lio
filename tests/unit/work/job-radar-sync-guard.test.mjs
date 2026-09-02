// Executable coverage for the pure Job Radar sync-guard policy (issue #281).
//
// Source-level assertion rationale: the Postgres-backed guard and the API route
// depend on a live database and the Next.js request runtime, which the plain
// Node test runner cannot execute. The assertions that read those files pin the
// guard SQL shape, the acquire-before-collect ordering, the response contract
// and the additive migration until an integration harness can drive them.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  JOB_RADAR_SYNC_COOLDOWN_MS,
  JOB_RADAR_SYNC_STALE_MS,
  classifyJobRadarSyncConflict,
  describeJobRadarSyncError,
} from "../../../src/lib/job-radar/sync-guard-policy.ts";

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

const NOW = Date.parse("2026-09-02T12:00:00.000Z");
const opts = (over = {}) => ({ now: NOW, cooldownMs: 60_000, staleMs: 10_000, ...over });

test("classifyJobRadarSyncConflict reports a fresh running_since as an in-flight sync", () => {
  const result = classifyJobRadarSyncConflict(
    { runningSince: NOW - 5_000, lastAttemptAt: NOW - 5_000 },
    opts(),
  );
  assert.deepEqual(result, { status: "running" });
});

test("classifyJobRadarSyncConflict treats a stale running_since as a crashed run, falling through to the cooldown", () => {
  const result = classifyJobRadarSyncConflict(
    { runningSince: NOW - 30_000, lastAttemptAt: NOW - 20_000 },
    opts(),
  );
  assert.equal(result.status, "cooldown");
  assert.equal(result.retryAfterSeconds, 40); // 60s cooldown - 20s elapsed
});

test("classifyJobRadarSyncConflict returns a bounded Retry-After for an active cooldown with no run in flight", () => {
  assert.deepEqual(
    classifyJobRadarSyncConflict({ runningSince: null, lastAttemptAt: NOW - 15_000 }, opts()),
    { status: "cooldown", retryAfterSeconds: 45 },
  );
  // Race: the cooldown elapsed between the refused upsert and this read.
  assert.deepEqual(
    classifyJobRadarSyncConflict({ runningSince: null, lastAttemptAt: NOW - 90_000 }, opts()),
    { status: "cooldown", retryAfterSeconds: 1 },
  );
  // No prior attempt recorded at all still yields a positive, clamped value.
  assert.equal(
    classifyJobRadarSyncConflict({ runningSince: null, lastAttemptAt: null }, opts()).retryAfterSeconds,
    1,
  );
});

test("classifyJobRadarSyncConflict prefers the running state when both conditions explain the refusal", () => {
  const result = classifyJobRadarSyncConflict(
    { runningSince: NOW - 1_000, lastAttemptAt: NOW - 1_000 },
    opts(),
  );
  assert.deepEqual(result, { status: "running" });
});

test("the production intervals are a 6h cooldown and a 15m stale window", () => {
  assert.equal(JOB_RADAR_SYNC_COOLDOWN_MS, 6 * 60 * 60 * 1000);
  assert.equal(JOB_RADAR_SYNC_STALE_MS, 15 * 60 * 1000);
});

test("describeJobRadarSyncError reduces a thrown error to a safe class name and never leaks its message", () => {
  assert.equal(describeJobRadarSyncError(new Error("connect ECONNREFUSED https://secret.example/api?token=abc")), "Error");
  assert.equal(describeJobRadarSyncError(new TypeError("x")), "TypeError");

  const coded = new Error("timeout talking to https://provider.example");
  coded.code = "ETIMEDOUT";
  const described = describeJobRadarSyncError(coded);
  assert.equal(described, "Error:ETIMEDOUT");
  assert.doesNotMatch(described, /provider\.example|timeout/);

  assert.equal(describeJobRadarSyncError("raw string with https://x"), "unknown");
  assert.equal(describeJobRadarSyncError(undefined), "unknown");
});

test("the sync route acquires the durable guard before syncJobRadar and returns a distinct code per state", async () => {
  const route = await read("src/app/api/job-radar/sync/route.ts");

  // Existing contract kept: non-redirecting auth, a 401, generic errors.
  assert.match(route, /tryGetCurrentUserId/);
  assert.match(route, /status:\s*401/);
  assert.doesNotMatch(route, /\bgetCurrentUserId\b/);

  // Guard is acquired, and before the sync call.
  assert.match(route, /acquireJobRadarSyncGuard\(userId\)/);
  assert.ok(
    route.indexOf("acquireJobRadarSyncGuard(userId)") < route.indexOf("syncJobRadar(userId)"),
    "the guard must be taken before any collector or sync-state work",
  );
  assert.ok(
    route.indexOf('guard.status === "cooldown"') > -1
      && route.indexOf('guard.status === "cooldown"') < route.indexOf("syncJobRadar(userId)"),
    "the throttled branch must short-circuit before the sync call",
  );

  // 429 with Retry-After during cooldown, 409 while already running, 500 for the rest.
  assert.match(route, /status:\s*429[\s\S]*"Retry-After":\s*String\(guard\.retryAfterSeconds\)/);
  assert.match(route, /status:\s*409/);
  assert.match(route, /status:\s*500/);

  // The guard is released in a finally so a failed sync does not wedge the user.
  assert.match(route, /finally\s*\{\s*await releaseJobRadarSyncGuard\(userId\)/);

  // No raw error object reaches the log any more.
  assert.doesNotMatch(route, /console\.error\([^)]*,\s*error\s*\)/);
  assert.match(route, /describeJobRadarSyncError\(error\)/);
});

test("the guard store is Postgres-backed, atomic, single-flight and user-scoped, and never reads a request-supplied id", async () => {
  const guard = await read("src/lib/job-radar/sync-guard.ts");

  assert.match(guard, /import "server-only";/);
  assert.match(guard, /public\.job_radar_sync_state/);
  // One atomic upsert that only takes the row when idle AND past the cooldown.
  assert.match(guard, /INSERT INTO public\.job_radar_sync_state[\s\S]*ON CONFLICT \(user_id\) DO UPDATE SET[\s\S]*WHERE \(s\.running_since IS NULL OR s\.running_since < now\(\) - \$2::interval\)[\s\S]*AND s\.last_attempt_at <= now\(\) - \$3::interval/);
  // Release clears only the in-flight flag, preserving the cooldown.
  assert.match(guard, /SET running_since = NULL WHERE user_id = \$1/);
  assert.doesNotMatch(guard, /last_attempt_at\s*=\s*NULL/);
  // Every statement is parameterised by the passed userId.
  assert.doesNotMatch(guard, /WHERE user_id = '/);
  // Fail-open on an unreachable store, logged once.
  assert.match(guard, /fail-open/);
  // The guard module must not import a collector - it runs strictly before them.
  assert.doesNotMatch(guard, /job-radar\/scraper|job-radar\/companies|job-radar\/sync"/);
});

test("the sync-state migration is additive and scoped to a real user", async () => {
  const migration = await read("infra/postgres/migrations/0017_job_radar_sync_state.sql");
  assert.match(migration, /create table if not exists public\.job_radar_sync_state/);
  assert.match(migration, /user_id uuid primary key references public\.users\(id\) on delete cascade/);
  assert.match(migration, /running_since timestamptz/);
  assert.match(migration, /last_attempt_at timestamptz not null default now\(\)/);
  assert.doesNotMatch(migration, /drop\s+(table|schema)|truncate\s+table/i);
});
