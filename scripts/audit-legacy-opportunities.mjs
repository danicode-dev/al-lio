import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditedAt = "2026-08-28T00:00:00.000Z";
const asOf = auditedAt.slice(0, 10);
const outputPath = join(root, "docs", "audits", "legacy-opportunities-2026-08-28.json");

const sources = [
  { path: "csv/oportunidades_tech_combinado.csv", sourceKind: "tech_opportunities", dialect: "tech" },
  { path: "csv/cursos_formacion_granada_online.csv", sourceKind: "source_file", dialect: "tech" },
  { path: "csv/eventos_hackathons_actualizado.csv", sourceKind: "source_file", dialect: "events" },
  { path: "csv/fp-content/2026-2027/raw/daw-dam.csv", sourceKind: "fp_content_items", dialect: "fp" },
  { path: "csv/fp-content/2026-2027/raw/administracion-finanzas.csv", sourceKind: "fp_content_items", dialect: "fp" },
  { path: "csv/fp-content/2026-2027/raw/acondicionamiento-fisico.csv", sourceKind: "fp_content_items", dialect: "fp" },
  { path: "csv/fp-content/2026-2027/raw/marketing-publicidad.csv", sourceKind: "fp_content_items", dialect: "fp" },
];

const rows = sources.flatMap((source) => auditSource(source));
const classificationCounts = Object.fromEntries(
  ["verified_migratable", "candidate_reverification", "source_only", "expired_historical", "rejected_unverifiable"]
    .map((classification) => [classification, rows.filter((row) => row.classification === classification).length]),
);
const sourceCounts = Object.fromEntries(sources.map((source) => [source.path, rows.filter((row) => row.sourceFile === source.path).length]));

const report = {
  schemaVersion: 1,
  auditedAt,
  asOf,
  policy: {
    operationalTruth: "PostgreSQL radar_content_occurrences",
    transport: "Radar v4 JSON",
    legacyFiles: "Import and audit input only; row existence is never publication evidence.",
    verifiedRule: "verified_migratable requires a linked accepted canonical occurrence and therefore cannot be granted by this static file audit.",
  },
  summary: { totalRows: rows.length, classificationCounts, sourceCounts },
  rows,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote ${rows.length} audited rows to ${outputPath}`);
console.log(JSON.stringify(classificationCounts));

function auditSource(source) {
  const parsed = parseCsv(readFileSync(join(root, source.path), "utf8"));
  if (parsed.length < 2) throw new Error(`${source.path}: expected a header and data rows`);
  const headers = parsed[0].map((header) => header.replace(/^\uFEFF/, "").trim());
  return parsed.slice(1).map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`${source.path}:${index + 2}: invalid column count`);
    const raw = Object.fromEntries(headers.map((header, column) => [header, cells[column]?.trim() ?? ""]));
    return classify(source, raw, index + 2);
  });
}

function classify(source, raw, sourceRowNumber) {
  const title = raw.nombre || raw.titulo;
  const legacyKey = raw.id_slug;
  const itemType = raw.categoria || raw.tipo;
  const provider = raw.entidad;
  const sourceUrl = raw.fuente_url;
  const status = raw.estado;
  const startsAt = raw.fecha_inicio || null;
  const endsAt = raw.fecha_fin || null;
  const lastReviewedAt = raw.ultima_revision || null;
  const searchable = `${title} ${itemType} ${status} ${raw.notas || ""} ${sourceUrl}`.toLowerCase();
  const reasonCodes = [];
  let classification = "candidate_reverification";

  if (!legacyKey || !title || !provider || !isHttpsUrl(sourceUrl)) {
    classification = "rejected_unverifiable";
    reasonCodes.push("missing_required_identity_or_https_source");
  } else if (/buscador|cat[aá]logo|directorio|fuente (recurrente|de noticias)|portal|listado|search/.test(searchable)) {
    classification = "source_only";
    reasonCodes.push("listing_or_discovery_source_not_a_concrete_resource");
  } else if (isExpired(itemType, endsAt || startsAt)) {
    classification = "expired_historical";
    reasonCodes.push("edition_ended_before_audit_date");
  } else {
    if (!lastReviewedAt || lastReviewedAt < asOf) reasonCodes.push("requires_fresh_source_verification");
    if (/revis|pendiente|confirmar|a confirmar|no consta|seg[uú]n convocatoria|probablemente/.test(searchable)) {
      reasonCodes.push("contains_editorial_or_uncertain_legacy_value");
    }
    if (isTimeBound(itemType) && !startsAt) reasonCodes.push("time_bound_item_has_no_verified_edition_start");
    reasonCodes.push("no_linked_accepted_canonical_occurrence");
  }

  if (reasonCodes.length === 0) reasonCodes.push("manual_reverification_required");
  const snapshot = JSON.stringify(Object.fromEntries(Object.entries(raw).sort(([a], [b]) => a.localeCompare(b))));
  return {
    sourceKind: source.sourceKind,
    sourceFile: source.path,
    sourceRowNumber,
    legacyKey,
    itemType,
    title,
    provider,
    sourceUrl,
    startsAt,
    endsAt,
    lastReviewedAt,
    classification,
    reasonCodes: [...new Set(reasonCodes)],
    snapshotFingerprint: createHash("sha256").update(snapshot).digest("hex"),
  };
}

function isTimeBound(itemType) {
  return /evento|hackathon|reto|concurso|convocatoria|beca/.test(String(itemType).toLowerCase());
}

function isExpired(itemType, date) {
  return isTimeBound(itemType) && /^\d{4}-\d{2}-\d{2}$/.test(String(date)) && date < asOf;
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}
