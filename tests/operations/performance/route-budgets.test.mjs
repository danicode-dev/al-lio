// Source-level assertion rationale: the route-budget check runs against a
// production build's .next/ manifests, which do not exist during `npm run
// test`. These assertions instead pin the budget data, the check's wiring into
// CI, and the baseline document so the #331 contract cannot silently regress;
// the check itself is exercised for real by `npm run perf:budgets` in CI right
// after `npm run build`.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const readJson = async (path) => JSON.parse(await read(path));

const CRITICAL_ROUTES = ["/", "/login", "/dashboard", "/tasks", "/bloc", "/calendar", "/profile"];

test("route-budgets.json covers every critical route with budgets derived from its measured baseline (issue #331)", async () => {
  const budgets = await readJson("../../../docs/audits/route-budgets.json");

  assert.deepEqual(Object.keys(budgets.routes).sort(), [...CRITICAL_ROUTES].sort(), "the critical-route set drifted");
  assert.equal(typeof budgets.sharedBaselineKb, "number");
  for (const field of ["node", "next", "commit", "date"]) {
    assert.ok(budgets.generatedFrom?.[field], `generatedFrom.${field} must record how the baseline was produced`);
  }

  for (const [route, spec] of Object.entries(budgets.routes)) {
    assert.equal(typeof spec.manifestKey, "string", `${route} needs a manifestKey`);
    assert.ok(spec.baselineKb > 0 && spec.warnKb > 0 && spec.failKb > 0, `${route} needs positive budgets`);
    assert.ok(spec.baselineKb <= spec.warnKb, `${route}: baseline must sit at or below the warning budget`);
    assert.ok(spec.warnKb < spec.failKb, `${route}: the warning budget must be below the failure budget`);
    // Budgets are the measurement x1.10 / x1.25 (issue #331: "from the measured
    // baseline rather than arbitrary aspirational numbers").
    assert.ok(Math.abs(spec.warnKb - Math.round(spec.baselineKb * 1.1)) <= 1, `${route}: warnKb should be ~baseline x1.10`);
    assert.ok(Math.abs(spec.failKb - Math.round(spec.baselineKb * 1.25)) <= 1, `${route}: failKb should be ~baseline x1.25`);
  }
});

test("check-route-budgets.mjs reads the build manifests, tiers warn/fail, and never rebuilds (issue #331)", async () => {
  const source = await read("../../../scripts/check-route-budgets.mjs");

  assert.match(source, /route-budgets\.json/);
  assert.match(source, /app-build-manifest\.json/);
  assert.match(source, /build-manifest\.json/);
  assert.match(source, /gzipSync/, "the metric must be gzipped, to track Next's own First Load JS column");
  assert.match(source, /rootMainFiles/);
  assert.match(source, />= spec\.failKb/);
  assert.match(source, />= spec\.warnKb/);
  assert.match(source, /::warning::/, "a warning-budget breach must not block CI");
  assert.match(source, /process\.exit\(1\)/, "a failure-budget breach must block CI");
  assert.doesNotMatch(source, /next build|spawn|execFile|child_process/, "the check must reuse the existing build, not run another one");
});

test("perf:budgets is a script and runs in CI right after the build (issue #331)", async () => {
  const pkg = await readJson("../../../package.json");

  assert.equal(pkg.scripts["perf:budgets"], "node scripts/check-route-budgets.mjs");
  assert.match(pkg.scripts.ci, /npm run build && npm run perf:budgets/, "perf:budgets must run against the build CI just produced");
});

test("PERFORMANCE_BASELINE.md documents the environment, budgets, the CWV situation and the no-PII timing contract (issue #331)", async () => {
  const [doc, opsIndex] = await Promise.all([
    read("../../../docs/operations/PERFORMANCE_BASELINE.md"),
    read("../../../docs/operations/README.md"),
  ]);

  assert.match(doc, /v24\.11\.1/, "the measured Node version must be recorded");
  assert.match(doc, /npm run build/);
  for (const route of CRITICAL_ROUTES.filter((route) => route !== "/")) {
    assert.match(doc, new RegExp(`\\\`${route}\\\``), `${route} must appear in the baseline`);
  }
  assert.match(doc, /Warning\b[\s\S]*Failure\b/, "the doc must distinguish warnings from blocking failures");
  assert.match(doc, /No field CWV are collected today|no analytics provider/i, "the doc must state why field Web Vitals are not yet collected");
  assert.match(doc, /Lighthouse/, "the lab-CWV procedure must be documented");
  assert.match(doc, /[Nn]ever the SQL text with bound parameters/, "the DB-timing contract must forbid logging query parameters");
  assert.match(doc, /Prioritised measured bottlenecks/, "the issue closes with a measured backlog, not speculative rewrites");

  assert.match(opsIndex, /\[`PERFORMANCE_BASELINE\.md`\]\(PERFORMANCE_BASELINE\.md\)/, "the ops handbook must link the baseline doc");
});
