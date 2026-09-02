/**
 * Critical-route bundle-size regression check (issue #331).
 *
 * Reads the production build's client manifests and reports the gzipped
 * first-load JS for each critical route against docs/audits/route-budgets.json:
 *
 *   - at or above `failKb`  -> error, non-zero exit (blocks CI);
 *   - at or above `warnKb`  -> warning, still exits 0;
 *   - more than 3 kB below `baselineKb` -> note: the baseline can be lowered.
 *
 * It never rebuilds: run `npm run build` first (CI already does). The metric is
 * `gzip( unique( rootMainFiles + app-build-manifest.pages[key], .js only ) )`,
 * which tracks Next's own "First Load JS" column within a few kB and is
 * deterministic for the same build. See docs/operations/PERFORMANCE_BASELINE.md.
 */

import { gzipSync } from "node:zlib";
import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = join(repoRoot, ".next");
const budgetsPath = join(repoRoot, "docs", "audits", "route-budgets.json");

function fail(message) {
  console.error(`[route-budgets] ${message}`);
  process.exit(1);
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`Could not read ${label} (${path}): ${error.message}`);
  }
}

const budgets = readJson(budgetsPath, "route-budgets.json");
const appManifest = readJson(join(nextDir, "app-build-manifest.json"), "the app build manifest");
const buildManifest = readJson(join(nextDir, "build-manifest.json"), "the build manifest");

if (!appManifest.pages || !Array.isArray(buildManifest.rootMainFiles)) {
  fail("The build manifests are missing the expected shape. Run `npm run build` before `npm run perf:budgets`.");
}

const rootMainFiles = buildManifest.rootMainFiles.filter((file) => file.endsWith(".js"));

function gzippedKb(files) {
  const seen = new Set();
  let bytes = 0;
  for (const file of files) {
    if (seen.has(file) || !file.endsWith(".js")) continue;
    seen.add(file);
    try {
      bytes += gzipSync(readFileSync(join(nextDir, file)), { level: 9 }).length;
    } catch {
      fail(`Chunk referenced by the manifest is missing on disk: ${file}. Re-run \`npm run build\`.`);
    }
  }
  return bytes / 1024;
}

function statMissing(file) {
  try {
    statSync(join(nextDir, file));
    return false;
  } catch {
    return true;
  }
}

const sharedKb = gzippedKb(rootMainFiles);
const rows = [];
let errors = 0;
let warnings = 0;

for (const [route, spec] of Object.entries(budgets.routes)) {
  const pageFiles = appManifest.pages[spec.manifestKey];
  if (!Array.isArray(pageFiles)) {
    fail(`route-budgets.json route "${route}" points at manifest key "${spec.manifestKey}", which is not in app-build-manifest.json. The route may have moved.`);
  }
  const missing = pageFiles.filter((file) => file.endsWith(".js") && statMissing(file));
  if (missing.length > 0) fail(`Route "${route}" references chunks that are not on disk: ${missing.join(", ")}. Re-run \`npm run build\`.`);

  const firstLoadKb = gzippedKb([...rootMainFiles, ...pageFiles]);
  const overFail = firstLoadKb >= spec.failKb;
  const overWarn = !overFail && firstLoadKb >= spec.warnKb;
  const wellUnder = firstLoadKb < spec.baselineKb - 3;

  if (overFail) errors += 1;
  if (overWarn) warnings += 1;

  rows.push({
    route,
    firstLoadKb,
    baselineKb: spec.baselineKb,
    warnKb: spec.warnKb,
    failKb: spec.failKb,
    status: overFail ? "FAIL" : overWarn ? "warn" : wellUnder ? "lower-me" : "ok",
  });
}

const pad = (value, width) => String(value).padEnd(width);
const kb = (value) => `${value.toFixed(1)} kB`;

console.log(`[route-budgets] shared first-load JS: ${kb(sharedKb)} (baseline ${budgets.sharedBaselineKb} kB)`);
console.log(`[route-budgets] ${pad("route", 12)} ${pad("first load", 12)} ${pad("baseline", 11)} ${pad("warn", 9)} ${pad("fail", 9)} status`);
for (const row of rows) {
  console.log(
    `[route-budgets] ${pad(row.route, 12)} ${pad(kb(row.firstLoadKb), 12)} ${pad(kb(row.baselineKb), 11)} ${pad(`${row.warnKb} kB`, 9)} ${pad(`${row.failKb} kB`, 9)} ${row.status}`,
  );
  if (row.status === "warn") {
    console.log(`::warning::[route-budgets] ${row.route} first-load JS ${kb(row.firstLoadKb)} is over its ${row.warnKb} kB warning budget (fails at ${row.failKb} kB).`);
  }
  if (row.status === "lower-me") {
    console.log(`[route-budgets] note: ${row.route} is ${kb(row.baselineKb - row.firstLoadKb)} below baseline — lower baselineKb in route-budgets.json to lock the win.`);
  }
}

if (errors > 0) {
  fail(`${errors} route(s) exceed their failure budget. Investigate the added client JS or, if the growth is reviewed and intended, raise the budget in docs/audits/route-budgets.json with a reason.`);
}

console.log(`[route-budgets] OK — ${rows.length} critical routes within budget${warnings > 0 ? ` (${warnings} warning${warnings === 1 ? "" : "s"})` : ""}.`);
