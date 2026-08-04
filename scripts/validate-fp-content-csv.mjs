import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RAW_DIR = join(ROOT, "csv", "fp-content", "2026-2027", "raw");

const EXPECTED_FILES = new Map([
  ["daw-dam.csv", new Set(["DAW", "DAM"])],
  ["administracion-finanzas.csv", new Set(["AF"])],
  ["acondicionamiento-fisico.csv", new Set(["TSAF"])],
  ["marketing-publicidad.csv", new Set(["MP"])],
]);

const EXPECTED_COLUMNS = [
  "id_slug",
  "tipo",
  "ciclo_siglas",
  "titulo",
  "descripcion",
  "entidad",
  "modalidad",
  "localidad",
  "provincia",
  "fecha_inicio",
  "fecha_fin",
  "estado",
  "coste",
  "certificacion",
  "practicas",
  "fuente_url",
  "tags",
  "prioridad",
  "encaje_1_5",
  "accion_sugerida",
  "ultima_revision",
  "notas",
];

const REQUIRED_FIELDS = [
  "id_slug",
  "tipo",
  "ciclo_siglas",
  "titulo",
  "descripcion",
  "entidad",
  "modalidad",
  "localidad",
  "provincia",
  "estado",
  "coste",
  "certificacion",
  "practicas",
  "fuente_url",
  "tags",
  "prioridad",
  "encaje_1_5",
  "accion_sugerida",
  "ultima_revision",
];

const ALLOWED_TYPES = new Set([
  "beca",
  "comunidad",
  "convocatoria_practicas",
  "curso_basico",
  "curso_complementario",
  "empleo_busqueda",
  "evento",
  "evidencia_recomendada",
  "fuente_noticias",
  "hackathon",
  "herramienta",
  "instituto",
  "recurso",
  "reto",
]);

const ALLOWED_CYCLES = new Set(["DAW", "DAM", "AF", "TSAF", "MP"]);
const ALLOWED_PRIORITIES = new Set(["Alta", "Media", "Baja"]);
const ALLOWED_STATUS = new Set(["abierto", "activo", "historico_util", "pendiente_convocatoria", "revisar"]);
const ALLOWED_PRACTICAS = new Set(["no", "posible", "si", "sí"]);

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
  return header.replace(/^\uFEFF/, "").trim();
}

function isIsoDate(value) {
  if (!value) return true;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function addError(errors, file, rowNumber, message) {
  errors.push(`${file}:${rowNumber}: ${message}`);
}

function validateFile(file, allowedCycles, seenIds) {
  const filePath = join(RAW_DIR, file);
  const errors = [];
  const warnings = [];
  const stats = {
    rows: 0,
    empleoBusqueda: 0,
  };

  if (!existsSync(filePath)) {
    addError(errors, file, 0, "file is missing");
    return { errors, warnings, stats };
  }

  const rows = parseCsv(readFileSync(filePath, "utf8"));
  if (rows.length < 2) {
    addError(errors, file, 1, "CSV must contain a header and at least one data row");
    return { errors, warnings, stats };
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map(normalizeHeader);
  if (headers.join("|") !== EXPECTED_COLUMNS.join("|")) {
    addError(
      errors,
      file,
      1,
      `unexpected headers. Expected ${EXPECTED_COLUMNS.join(", ")}`
    );
    return { errors, warnings, stats };
  }

  for (const [index, row] of dataRows.entries()) {
    const rowNumber = index + 2;
    stats.rows++;

    if (row.length !== EXPECTED_COLUMNS.length) {
      addError(errors, file, rowNumber, `expected ${EXPECTED_COLUMNS.length} columns, received ${row.length}`);
      continue;
    }

    const record = Object.fromEntries(headers.map((header, columnIndex) => [header, row[columnIndex]?.trim() ?? ""]));

    for (const field of REQUIRED_FIELDS) {
      if (!record[field]) addError(errors, file, rowNumber, `required field "${field}" is empty`);
    }

    if (!/^[a-z0-9_]+$/.test(record.id_slug)) {
      addError(errors, file, rowNumber, `id_slug must be lowercase snake case: ${record.id_slug}`);
    }

    if (seenIds.has(record.id_slug)) {
      addError(errors, file, rowNumber, `duplicate id_slug across catalog: ${record.id_slug}`);
    } else if (record.id_slug) {
      seenIds.add(record.id_slug);
    }

    if (!ALLOWED_TYPES.has(record.tipo)) {
      addError(errors, file, rowNumber, `unknown tipo: ${record.tipo}`);
    }

    if (!ALLOWED_CYCLES.has(record.ciclo_siglas)) {
      addError(errors, file, rowNumber, `unknown ciclo_siglas: ${record.ciclo_siglas}`);
    } else if (!allowedCycles.has(record.ciclo_siglas)) {
      addError(errors, file, rowNumber, `cycle ${record.ciclo_siglas} does not belong in ${file}`);
    }

    if (!ALLOWED_PRIORITIES.has(record.prioridad)) {
      addError(errors, file, rowNumber, `unknown prioridad: ${record.prioridad}`);
    }

    if (!ALLOWED_STATUS.has(record.estado)) {
      addError(errors, file, rowNumber, `unknown estado: ${record.estado}`);
    }

    if (!ALLOWED_PRACTICAS.has(record.practicas.toLowerCase())) {
      addError(errors, file, rowNumber, `unknown practicas value: ${record.practicas}`);
    }

    const fit = Number.parseInt(record.encaje_1_5, 10);
    if (!Number.isInteger(fit) || fit < 1 || fit > 5) {
      addError(errors, file, rowNumber, `encaje_1_5 must be an integer from 1 to 5`);
    }

    for (const field of ["fecha_inicio", "fecha_fin", "ultima_revision"]) {
      if (!isIsoDate(record[field])) {
        addError(errors, file, rowNumber, `${field} must use YYYY-MM-DD format`);
      }
    }

    if (record.fecha_inicio && record.fecha_fin && record.fecha_fin < record.fecha_inicio) {
      addError(errors, file, rowNumber, "fecha_fin cannot be before fecha_inicio");
    }

    if (!isHttpUrl(record.fuente_url)) {
      addError(errors, file, rowNumber, `fuente_url must be an http(s) URL`);
    }

    if (record.tipo === "empleo_busqueda") {
      stats.empleoBusqueda++;
    }
  }

  if (stats.empleoBusqueda > 0) {
    warnings.push(`${file}: ${stats.empleoBusqueda} empleo_busqueda rows kept as raw source; hide from static MVP views`);
  }

  return { errors, warnings, stats };
}

function main() {
  if (!existsSync(RAW_DIR)) {
    console.error(`FP content folder not found: ${RAW_DIR}`);
    process.exit(1);
  }

  const presentFiles = new Set(readdirSync(RAW_DIR).filter((file) => file.endsWith(".csv")));
  const errors = [];
  const warnings = [];
  const seenIds = new Set();
  let totalRows = 0;
  let totalEmpleoBusqueda = 0;

  for (const expectedFile of EXPECTED_FILES.keys()) {
    if (!presentFiles.has(expectedFile)) {
      errors.push(`${expectedFile}:0: expected CSV file is missing`);
    }
  }

  for (const file of presentFiles) {
    if (!EXPECTED_FILES.has(file)) {
      errors.push(`${file}:0: unexpected CSV file`);
      continue;
    }

    const result = validateFile(file, EXPECTED_FILES.get(file), seenIds);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    totalRows += result.stats.rows;
    totalEmpleoBusqueda += result.stats.empleoBusqueda;
  }

  for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
  }

  if (errors.length > 0) {
    console.error("\nFP content validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log("OK: FP content CSV validation completed.");
  console.log(`Files: ${presentFiles.size}`);
  console.log(`Rows: ${totalRows}`);
  console.log(`Unique ids: ${seenIds.size}`);
  console.log(`Static MVP excluded empleo_busqueda rows: ${totalEmpleoBusqueda}`);
}

main();
