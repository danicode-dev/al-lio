import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const baselinePath = join(
  repositoryRoot,
  "docs",
  "audits",
  "unused-code-baseline.json",
);

function fail(message) {
  console.error(`[unused-code-audit] ${message}`);
  process.exit(1);
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`Could not read ${label}: ${error.message}`);
  }
}

function stableIssueId(kind, file, issue) {
  const normalizedFile = file.replaceAll("\\", "/");

  if (kind === "files") {
    return `files:${issue.name.replaceAll("\\", "/")}`;
  }

  if (typeof issue.name === "string") {
    return `${kind}:${normalizedFile}:${issue.name}`;
  }

  const stableIssue = Object.fromEntries(
    Object.entries(issue).filter(
      ([key]) => !["line", "col", "pos", "symbolPos"].includes(key),
    ),
  );
  return `${kind}:${normalizedFile}:${JSON.stringify(stableIssue)}`;
}

function normalizeKnipIssues(report) {
  if (!Array.isArray(report.issues)) {
    fail("Knip returned an unexpected JSON report without an issues array.");
  }

  const ids = [];
  for (const fileIssues of report.issues) {
    for (const [kind, issues] of Object.entries(fileIssues)) {
      if (kind === "file" || kind === "catalogReferences" || !Array.isArray(issues)) {
        continue;
      }
      for (const issue of issues) {
        ids.push(stableIssueId(kind, fileIssues.file, issue));
      }
    }
  }

  return [...new Set(ids)].sort();
}

const baseline = readJson(baselinePath, "unused-code baseline");
if (baseline.schemaVersion !== 1 || !Array.isArray(baseline.groups)) {
  fail("The baseline must use schemaVersion 1 and contain a groups array.");
}

const knipPackageRoot = resolve(dirname(require.resolve("knip")), "..");
const knipPackagePath = join(knipPackageRoot, "package.json");
const knipPackage = readJson(knipPackagePath, "installed Knip package metadata");
if (baseline.tool?.name !== "knip" || baseline.tool?.version !== knipPackage.version) {
  fail(
    `Baseline expects Knip ${baseline.tool?.version ?? "<missing>"}, but ${knipPackage.version} is installed.`,
  );
}

const expectedIds = [];
for (const [index, group] of baseline.groups.entries()) {
  const label = `baseline group ${index + 1}`;
  for (const field of ["classification", "owner", "reason", "followUp"]) {
    if (typeof group[field] !== "string" || group[field].trim() === "") {
      fail(`${label} must provide a non-empty ${field}.`);
    }
  }
  if (!Array.isArray(group.findings) || group.findings.length === 0) {
    fail(`${label} must contain at least one exact finding.`);
  }
  for (const finding of group.findings) {
    if (typeof finding !== "string" || finding.includes("*")) {
      fail(`${label} contains a non-exact finding: ${String(finding)}`);
    }
    expectedIds.push(finding);
  }
}

const duplicateIds = expectedIds.filter(
  (finding, index) => expectedIds.indexOf(finding) !== index,
);
if (duplicateIds.length > 0) {
  fail(`The baseline contains duplicate findings:\n- ${[...new Set(duplicateIds)].join("\n- ")}`);
}

const knipBinary = join(knipPackageRoot, "bin", "knip.js");
const run = spawnSync(
  process.execPath,
  [knipBinary, "--reporter", "json", "--no-progress"],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  },
);

if (run.error) {
  fail(`Could not execute Knip: ${run.error.message}`);
}
if (run.status !== 0 && run.status !== 1) {
  fail(`Knip exited unexpectedly with status ${run.status}.\n${run.stderr.trim()}`);
}

let report;
try {
  report = JSON.parse(run.stdout);
} catch (error) {
  fail(`Knip did not return valid JSON: ${error.message}\n${run.stderr.trim()}`);
}

const actualIds = normalizeKnipIssues(report);
const expectedSet = new Set(expectedIds);
const actualSet = new Set(actualIds);
const newFindings = actualIds.filter((finding) => !expectedSet.has(finding));
const staleFindings = expectedIds.filter((finding) => !actualSet.has(finding));

if (newFindings.length > 0 || staleFindings.length > 0) {
  if (newFindings.length > 0) {
    console.error(
      `[unused-code-audit] New unexplained findings:\n- ${newFindings.join("\n- ")}`,
    );
  }
  if (staleFindings.length > 0) {
    console.error(
      `[unused-code-audit] Stale baseline findings that must be removed or reclassified:\n- ${staleFindings.join("\n- ")}`,
    );
  }
  fail(
    "The exact unused-code baseline drifted. Classify each change with an owner, reason, and follow-up before updating it.",
  );
}

const counts = new Map();
for (const finding of actualIds) {
  const kind = finding.slice(0, finding.indexOf(":"));
  counts.set(kind, (counts.get(kind) ?? 0) + 1);
}

console.log(
  `[unused-code-audit] Baseline matches ${actualIds.length} classified findings (${[...counts]
    .map(([kind, count]) => `${kind}: ${count}`)
    .join(", ")}).`,
);
