import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const testsRoot = path.join(root, "tests");
const allowedLayers = new Set(["architecture", "contracts", "integration", "operations", "unit"]);
const maxTestsPerFile = 60;
const maxLinesPerFile = 1_200;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else files.push(target);
  }
  return files;
}

function testTitles(source) {
  return [...source.matchAll(/^test\(/gm)].map((match) => {
    const quoteIndex = source.indexOf('"', match.index);
    let escaped = false;
    for (let index = quoteIndex + 1; index < source.length; index += 1) {
      const character = source[index];
      if (!escaped && character === '"') {
        const literal = source.slice(quoteIndex, index + 1).replace(/\\\r?\n/g, "");
        return Function(`"use strict"; return ${literal};`)();
      }
      if (!escaped && character === "\\") escaped = true;
      else escaped = false;
    }
    throw new Error("Could not parse a test title");
  });
}

const allFiles = await walk(testsRoot);
const testFiles = allFiles.filter((file) => file.endsWith(".test.mjs"));
assert.ok(testFiles.length > 0, "No test files were discovered");

for (const file of testFiles) {
  const relative = path.relative(testsRoot, file).replaceAll("\\", "/");
  const [layer, domain] = relative.split("/");
  assert.ok(allowedLayers.has(layer), `${relative} must live under an explicit test layer`);
  assert.ok(domain && domain.endsWith(".test.mjs") === false, `${relative} must identify an owner domain below its layer`);

  const source = await readFile(file, "utf8");
  const testCount = (source.match(/^test\(/gm) ?? []).length;
  const lineCount = source.split(/\r?\n/).length;
  assert.ok(testCount <= maxTestsPerFile, `${relative} has ${testCount} tests; split it before ${maxTestsPerFile}`);
  assert.ok(lineCount <= maxLinesPerFile, `${relative} has ${lineCount} lines; split it before ${maxLinesPerFile}`);

  if (/\breadFile\(/.test(source)) {
    assert.match(
      source,
      /Source-level assertion rationale:|Source-level assertions (?:temporarily|intentionally)/,
      `${relative} uses source-level assertions without explaining why the real boundary is not executed`,
    );
  }
}

const removedCatchAll = path.join(testsRoot, "security-boundaries.test.mjs");
await assert.rejects(stat(removedCatchAll), { code: "ENOENT" }, "The retired multi-domain catch-all must not return");

const inventory = JSON.parse(await readFile(path.join(testsRoot, "migration-inventory.json"), "utf8"));
assert.equal(inventory.issue, 274);
assert.equal(inventory.legacyTestCount, 263);
assert.equal(inventory.tests.length, 263);
assert.deepEqual(inventory.tests.map((entry) => entry.legacyIndex), Array.from({ length: 263 }, (_, index) => index + 1));

const inventoryByTarget = Map.groupBy(inventory.tests, (entry) => entry.targetFile);
for (const [target, entries] of inventoryByTarget) {
  const absoluteTarget = path.join(root, ...target.split("/"));
  const source = await readFile(absoluteTarget, "utf8");
  const actualCount = (source.match(/^test\(/gm) ?? []).length;
  assert.equal(actualCount, entries.length, `${target} does not contain every mapped legacy test`);
  assert.deepEqual(
    testTitles(source),
    entries.map((entry) => entry.currentName),
    `${target} changed or reordered a mapped legacy test name`,
  );
}

console.log(`Test taxonomy OK: ${testFiles.length} focused files, ${inventory.tests.length} mapped legacy tests.`);
