// Source-level assertion rationale: issue #360 codifies the durable repository
// placement, retention and unused-code rules produced by the completed #276
// hygiene work. The protected risk is those rules drifting, or being quietly
// duplicated as a second source of truth. There is no runtime boundary to
// execute; reading the governing documents and the frozen snapshot as text is
// the correct boundary (tests/README.md taxonomy options 5 and 6). The current
// live findings live in docs/audits/unused-code-baseline.json and are already
// drift-checked by scripts/check-unused-code.mjs and
// tests/architecture/repository/unused-code-audit.test.mjs; this file does not
// re-encode them.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const projectStructure = read("docs/PROJECT_STRUCTURE.md");
// Markdown wraps prose across lines; collapse whitespace so phrase checks are
// about wording, not line width.
const projectStructureFlat = projectStructure.replace(/\s+/g, " ");
const contributing = read(".github/CONTRIBUTING.md");
const frozenSnapshot = read("docs/audits/unused-code-audit.md");

test("issue #360: PROJECT_STRUCTURE.md codifies the authoritative locations, retention rules and hygiene review", () => {
  for (const heading of [
    "## Authoritative locations and owners",
    "## Retention rules",
    "## Repository hygiene review",
  ]) {
    assert.ok(projectStructure.includes(heading), `PROJECT_STRUCTURE.md is missing "${heading}"`);
  }

  // Each codified file class points at its one authoritative home.
  for (const anchor of [
    "src/features/<feature>/",
    "integrations/CONTENT_SOURCE_INVENTORY.md",
    "architecture/COMPATIBILITY_REGISTER.md",
    "public/assets/README.md",
    "tests/<layer>/<domain>/",
    "infra/postgres/migrations/",
    "docs/operations/release-records/",
  ]) {
    assert.ok(
      projectStructure.includes(anchor),
      `PROJECT_STRUCTURE.md does not anchor a file class at ${anchor}`,
    );
  }

  // The four retention requirements from #360.
  for (const phrase of [
    "concrete exit condition",
    "recovery or retrieval reason",
    "committed regeneration path",
    "classification work, not deletion evidence",
  ]) {
    assert.ok(
      projectStructureFlat.includes(phrase),
      `PROJECT_STRUCTURE.md retention rules omit "${phrase}"`,
    );
  }

  // The unused-code workflow is documented once, here.
  for (const phrase of [
    "npm run audit:unused",
    "npm run audit:unused:raw",
    "docs/audits/unused-code-baseline.json",
    "docs/audits/unused-code-audit.md",
    "focused exact-path issue",
  ]) {
    assert.ok(
      projectStructureFlat.includes(phrase),
      `PROJECT_STRUCTURE.md hygiene review omits "${phrase}"`,
    );
  }
});

test("issue #360: CONTRIBUTING points at the authoritative rules instead of restating them", () => {
  assert.match(contributing, /docs\/PROJECT_STRUCTURE\.md/);
  assert.match(contributing, /COMPATIBILITY_REGISTER\.md/);
  assert.match(contributing, /CONTENT_SOURCE_INVENTORY\.md/);
  assert.match(contributing, /audit:unused/);
});

test("issue #360: the frozen #389 snapshot stays historical and is not rewritten to the live baseline", () => {
  // Revision and count here are intentionally historical: the frozen snapshot
  // records the audit as it stood, not the current live set.
  assert.match(frozenSnapshot, /Audited revision: `6bc4509`/);
  assert.match(frozenSnapshot, /101 exact findings/);
  // It must never be overwritten with live `check-unused-code.mjs` output.
  assert.doesNotMatch(
    frozenSnapshot,
    /Baseline matches \d+ classified findings/,
    "the frozen snapshot must not adopt live audit output",
  );
});
