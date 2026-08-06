import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const COMPETENCIAS_DIR = join(ROOT, "csv", "fp-content", "2026-2027", "competencias");
const RAW_DIR = join(ROOT, "csv", "fp-content", "2026-2027", "raw");

const ALLOWED_CYCLES = new Set(["DAW", "DAM", "AF", "TSAF", "MP"]);
const ALLOWED_ETAPAS = new Set([
  "0_antes_de_empezar",
  "1_fundamentos",
  "2_aplicacion",
  "3_empleabilidad",
  "4_proyecto",
]);
const ALLOWED_ITEM_RELACION = new Set(["requiere", "ensena", "demuestra"]);

const SKILLS_COLUMNS = [
  "skill_id",
  "titulo",
  "descripcion",
  "horas_estimadas",
  "criterios_superacion",
  "evidencia_minima",
  "umbral_superacion",
  "aplicable_a",
  "fuente_titulo_url",
  "fuente_curriculo_url",
  "tipo_criterio",
  "ultima_revision",
];

const CICLO_HABILIDADES_COLUMNS = [
  "ciclo_siglas",
  "skill_id",
  "orden_global",
  "etapa",
  "bloque",
  "modulo_codigo",
  "modulo_nombre",
  "nivel_objetivo",
  "obligatoria_roadmap_base",
  "basico_antes_de_empezar",
  "prerrequisito_texto",
];

const ITEM_COMPETENCIAS_COLUMNS = [
  "item_id_slug",
  "ciclo_siglas",
  "skill_id",
  "tipo_relacion",
  "orden_preparacion",
  "nivel_minimo_recomendado",
  "obligatoria_para_item",
  "motivo_relacion",
  "ultima_revision",
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") index++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(header) {
  return header.replace(/^﻿/, "").trim();
}

function addError(errors, file, rowNumber, message) {
  errors.push(`${file}:${rowNumber}: ${message}`);
}

function readRecords(filePath, file, expectedColumns, errors) {
  if (!existsSync(filePath)) {
    addError(errors, file, 0, "file is missing");
    return [];
  }

  const rows = parseCsv(readFileSync(filePath, "utf8"));
  if (rows.length < 2) {
    addError(errors, file, 1, "CSV must contain a header and at least one data row");
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map(normalizeHeader);
  if (headers.join("|") !== expectedColumns.join("|")) {
    addError(errors, file, 1, `unexpected headers. Expected ${expectedColumns.join(", ")}`);
    return [];
  }

  return dataRows.map((row, index) => ({
    rowNumber: index + 2,
    record: Object.fromEntries(headers.map((header, columnIndex) => [header, row[columnIndex]?.trim() ?? ""])),
  }));
}

function loadRawCatalogIds() {
  const ids = new Set();
  if (!existsSync(RAW_DIR)) return ids;

  for (const file of ["daw-dam.csv", "administracion-finanzas.csv", "acondicionamiento-fisico.csv", "marketing-publicidad.csv"]) {
    const filePath = join(RAW_DIR, file);
    if (!existsSync(filePath)) continue;
    const rows = parseCsv(readFileSync(filePath, "utf8"));
    const [headerRow, ...dataRows] = rows;
    const idIndex = headerRow.map(normalizeHeader).indexOf("id_slug");
    if (idIndex === -1) continue;
    for (const row of dataRows) {
      const idSlug = row[idIndex]?.trim();
      if (idSlug) ids.add(idSlug);
    }
  }

  return ids;
}

function main() {
  const errors = [];
  const warnings = [];

  const skillsRows = readRecords(
    join(COMPETENCIAS_DIR, "habilidades.csv"),
    "habilidades.csv",
    SKILLS_COLUMNS,
    errors
  );
  const skillIds = new Set();
  for (const { rowNumber, record } of skillsRows) {
    if (!record.skill_id || !record.titulo) {
      addError(errors, "habilidades.csv", rowNumber, "skill_id and titulo are required");
      continue;
    }
    if (skillIds.has(record.skill_id)) {
      addError(errors, "habilidades.csv", rowNumber, `duplicate skill_id: ${record.skill_id}`);
    } else {
      skillIds.add(record.skill_id);
    }
  }

  const cycleSkillRows = readRecords(
    join(COMPETENCIAS_DIR, "ciclo_habilidades.csv"),
    "ciclo_habilidades.csv",
    CICLO_HABILIDADES_COLUMNS,
    errors
  );
  const seenCycleSkill = new Set();
  for (const { rowNumber, record } of cycleSkillRows) {
    if (!ALLOWED_CYCLES.has(record.ciclo_siglas)) {
      addError(errors, "ciclo_habilidades.csv", rowNumber, `unknown ciclo_siglas: ${record.ciclo_siglas}`);
    }
    if (!ALLOWED_ETAPAS.has(record.etapa)) {
      addError(errors, "ciclo_habilidades.csv", rowNumber, `unknown etapa: ${record.etapa}`);
    }
    if (!Number.isInteger(Number.parseInt(record.orden_global, 10))) {
      addError(errors, "ciclo_habilidades.csv", rowNumber, "orden_global must be an integer");
    }
    if (!skillIds.has(record.skill_id)) {
      addError(errors, "ciclo_habilidades.csv", rowNumber, `skill_id not found in habilidades.csv: ${record.skill_id}`);
    }
    const key = `${record.ciclo_siglas}|${record.skill_id}`;
    if (seenCycleSkill.has(key)) {
      addError(errors, "ciclo_habilidades.csv", rowNumber, `duplicate (ciclo_siglas, skill_id): ${key}`);
    } else {
      seenCycleSkill.add(key);
    }
  }

  const catalogIds = loadRawCatalogIds();
  const itemRows = readRecords(
    join(COMPETENCIAS_DIR, "item_competencias.csv"),
    "item_competencias.csv",
    ITEM_COMPETENCIAS_COLUMNS,
    errors
  );
  let orphanItems = 0;
  for (const { rowNumber, record } of itemRows) {
    if (!ALLOWED_CYCLES.has(record.ciclo_siglas)) {
      addError(errors, "item_competencias.csv", rowNumber, `unknown ciclo_siglas: ${record.ciclo_siglas}`);
    }
    if (!ALLOWED_ITEM_RELACION.has(record.tipo_relacion)) {
      addError(errors, "item_competencias.csv", rowNumber, `unknown tipo_relacion: ${record.tipo_relacion}`);
    }
    if (!skillIds.has(record.skill_id)) {
      addError(errors, "item_competencias.csv", rowNumber, `skill_id not found in habilidades.csv: ${record.skill_id}`);
    }
    if (!catalogIds.has(record.item_id_slug)) {
      orphanItems++;
    }
  }

  if (orphanItems > 0) {
    warnings.push(
      `item_competencias.csv: ${orphanItems} rows reference an item_id_slug not present in csv/fp-content/2026-2027/raw/*.csv — the importer will skip and report these, not fail`
    );
  }

  for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
  }

  if (errors.length > 0) {
    console.error("\nFP competencies validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log("OK: FP competencies CSV validation completed.");
  console.log(`Skills: ${skillIds.size}`);
  console.log(`Cycle placements: ${cycleSkillRows.length}`);
  console.log(`Item links: ${itemRows.length} (orphan item_id_slug: ${orphanItems})`);
}

main();
