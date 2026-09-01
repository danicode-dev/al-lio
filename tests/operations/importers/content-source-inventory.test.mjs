// Source-level assertion rationale: the repository tree and importer source paths are the
// executable boundary for this documentation contract; no database or runtime process is needed.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const inventoryPath = join(root, "docs", "integrations", "CONTENT_SOURCE_INVENTORY.md");
const allowedClasses = new Set([
  "canonical",
  "raw",
  "candidate",
  "generated audit",
  "retained evidence",
  "removal candidate",
]);

function tableCells(line) {
  return line.slice(1, -1).split("|").map((cell) => cell.trim());
}

function inventoryRows() {
  const source = readFileSync(inventoryPath, "utf8");
  const match = source.match(/<!-- content-source-inventory:start -->([\s\S]*?)<!-- content-source-inventory:end -->/);
  assert.ok(match, "content source inventory markers must remain present");

  const lines = match[1].split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("|"));
  assert.ok(lines.length >= 3, "content source inventory must contain a header and data rows");

  const headers = tableCells(lines[0]);
  assert.deepEqual(headers, [
    "Path",
    "Class",
    "Owner",
    "Consumer",
    "Publication authority",
    "Regeneration or validation",
    "Sensitivity",
    "Retention reason",
    "Removal condition",
  ]);
  assert.ok(tableCells(lines[1]).every((cell) => /^:?-{3,}:?$/.test(cell)), "inventory table separator is invalid");

  return lines.slice(2).map((line) => {
    const cells = tableCells(line);
    assert.equal(cells.length, headers.length, `inventory row has ${cells.length} cells: ${line}`);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  });
}

function unquoteCode(value, label) {
  const match = value.match(/^`([^`]+)`$/);
  assert.ok(match, `${label} must be a single Markdown code span: ${value}`);
  return match[1];
}

function walkDatasetFiles(directory, extensions) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkDatasetFiles(absolute, extensions));
    else if (extensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) {
      files.push(relative(root, absolute).replaceAll("\\", "/"));
    }
  }
  return files;
}

function parsedRows() {
  return inventoryRows().map((row) => ({
    ...row,
    path: unquoteCode(row.Path, "Path"),
    classification: unquoteCode(row.Class, "Class"),
  }));
}

function coveringRows(rows, path) {
  return rows.filter((row) => path === row.path || path.startsWith(`${row.path}/`));
}

test("every inventory row has one valid class, complete ownership metadata, and an existing path", () => {
  const rows = parsedRows();
  const paths = rows.map((row) => row.path);
  assert.equal(new Set(paths).size, paths.length, "inventory paths must be unique");

  for (const row of rows) {
    assert.ok(allowedClasses.has(row.classification), `unsupported classification for ${row.path}: ${row.classification}`);
    assert.ok(!row.path.includes("\\") && !row.path.startsWith("/"), `${row.path} must be repository-relative POSIX syntax`);
    assert.equal(existsSync(join(root, ...row.path.split("/"))), true, `inventoried path does not exist: ${row.path}`);
    for (const column of ["Owner", "Consumer", "Publication authority", "Regeneration or validation", "Sensitivity", "Retention reason", "Removal condition"]) {
      assert.ok(row[column] && row[column] !== "-", `${row.path} must define ${column}`);
    }
    if (["candidate", "generated audit", "retained evidence", "removal candidate"].includes(row.classification)) {
      assert.match(row["Publication authority"], /^None\b/, `${row.path} must explicitly deny publication authority`);
    }
  }
});

test("every scoped CSV or JSON dataset belongs to exactly one inventory family", () => {
  const rows = parsedRows();
  const datasetFiles = [
    ...walkDatasetFiles(join(root, "csv"), new Set([".csv", ".json"])),
    ...walkDatasetFiles(join(root, "data"), new Set([".json"])),
    ...walkDatasetFiles(join(root, "docs", "audits"), new Set([".json"])),
    "public/data/empresas_tech_granada.md",
  ].sort();

  for (const path of datasetFiles) {
    const coverage = coveringRows(rows, path);
    assert.equal(coverage.length, 1, `${path} must have exactly one inventory classification; found ${coverage.map((row) => row.path).join(", ") || "none"}`);
  }
});

test("every supported importer input names its actual consumer", () => {
  const rows = parsedRows();
  const contracts = [
    ["csv/oportunidades_tech_combinado.csv", "scripts/import-tech-opportunities.mjs"],
    ["csv/cursos_formacion_granada_online.csv", "scripts/import-courses.mjs"],
    ["csv/eventos_hackathons_actualizado.csv", "scripts/import-hackathons.mjs"],
    ["csv/fp-content/2026-2027/raw", "scripts/import-fp-content.mjs"],
    ["csv/fp-content/2026-2027/competencias", "scripts/import-fp-competencies.mjs"],
    ["csv/fp-content/2026-2027/videos/recursos_video.json", "scripts/import-fp-resource-videos.mjs"],
    ["data/companies", "scripts/import-companies.mjs"],
    ["public/data/empresas_tech_granada.md", "scripts/import-companies.mjs"],
    ["data/learning-competencies.json", "scripts/import-learning-competencies.mjs"],
  ];

  for (const [sourcePath, importerPath] of contracts) {
    assert.equal(existsSync(join(root, ...importerPath.split("/"))), true, `supported importer is missing: ${importerPath}`);
    const coverage = coveringRows(rows, sourcePath);
    assert.equal(coverage.length, 1, `${sourcePath} must map to one inventory row`);
    assert.ok(coverage[0].Consumer.includes(importerPath), `${sourcePath} must name ${importerPath}`);
  }
});

test("the generated legacy audit remains reproducible from registered sources", () => {
  const rows = parsedRows();
  const audit = rows.find((row) => row.path === "docs/audits/legacy-opportunities-2026-08-28.json");
  assert.ok(audit, "legacy audit output must remain inventoried");
  assert.equal(audit.classification, "generated audit");
  assert.match(audit["Regeneration or validation"], /npm run audit:legacy-opportunities/);

  const generator = readFileSync(join(root, "scripts", "audit-legacy-opportunities.mjs"), "utf8");
  const registeredSources = [
    "csv/oportunidades_tech_combinado.csv",
    "csv/cursos_formacion_granada_online.csv",
    "csv/eventos_hackathons_actualizado.csv",
    "csv/fp-content/2026-2027/raw/daw-dam.csv",
    "csv/fp-content/2026-2027/raw/administracion-finanzas.csv",
    "csv/fp-content/2026-2027/raw/acondicionamiento-fisico.csv",
    "csv/fp-content/2026-2027/raw/marketing-publicidad.csv",
  ];
  for (const sourcePath of registeredSources) {
    assert.ok(generator.includes(sourcePath), `${sourcePath} must remain an audit input`);
    assert.equal(coveringRows(rows, sourcePath).length, 1, `${sourcePath} must remain inventoried`);
  }
});
