/**
 * Import courses from csv/cursos_formacion_granada_online_supabase.csv.
 *
 * Requires:
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY
 *   TARGET_USER_EMAIL
 *
 * Run the migration first:
 *   supabase/migrations/extend_courses_hackathons.sql
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CSV_PATH = join(ROOT, "csv", "cursos_formacion_granada_online_supabase.csv");
const COURSE_NAMESPACE = "courses-csv-v1";
const COURSE_EXTENDED_SELECT = [
  "id_slug",
  "entidad",
  "area",
  "modalidad",
  "localidad",
  "provincia",
  "formato",
  "certificacion_tipo",
  "certificacion_oficial",
  "practicas_empresa",
  "horas_totales",
  "horas_practicas",
  "fecha_inicio",
  "fecha_fin",
  "estado",
  "coste",
  "requisitos_resumen",
  "encaje_daw_1_5",
  "prioridad",
  "tags",
  "fuente_url",
  "ultima_revision",
].join(",");
const COURSE_BASE_OPTIONAL_COLUMNS = [
  "platform",
  "url",
  "price",
  "category",
  "status",
  "start_date",
  "deadline",
  "notes",
];

function loadEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      if (ch === "\r") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

function cleanText(value) {
  const v = typeof value === "string" ? value.trim() : "";
  return v === "" ? null : v;
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseDate(value) {
  const v = cleanText(value);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function parseIntValue(value) {
  const v = cleanText(value);
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function parseBoolean(value) {
  const v = normalize(value);
  if (!v) return null;
  if (v === "si" || v.startsWith("si ") || v.startsWith("si/")) return true;
  if (v === "no" || v.startsWith("no ") || v.startsWith("no;")) return false;
  return null;
}

function parsePrice(value) {
  const v = cleanText(value);
  if (!v) return null;
  const normalized = v.replace(",", ".").replace(/\s/g, "");
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

function mapCourseStatus(value) {
  const v = normalize(value);
  if (v.includes("descart")) return "descartado";
  if (v.includes("paus")) return "pausado";
  if (v.includes("termin") || v.includes("realizado") || v.includes("historico")) return "terminado";
  if (v.includes("en curso") || v.includes("empez")) return "empezado";
  return "pendiente";
}

function mapPriority(value) {
  const v = normalize(value);
  if (v.includes("alta")) return "Alta";
  if (v.includes("baja")) return "Baja";
  return "Media";
}

function stableUuid(namespace, slug) {
  const bytes = createHash("sha1").update(`${namespace}:${slug}`).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function buildLegacyNotes(raw) {
  const details = [
    ["Estado CSV", raw.estado],
    ["Coste", raw.coste],
    ["Modalidad", raw.modalidad],
    ["Localidad", raw.localidad],
    ["Certificacion", raw.certificacion_tipo],
    ["Practicas", raw.practicas_empresa],
    ["Horas totales", raw.horas_totales],
    ["Horas practicas", raw.horas_practicas],
    ["Encaje DAW", raw.encaje_daw_1_5],
    ["Prioridad", raw.prioridad],
    ["Tags", raw.tags],
    ["Requisitos", raw.requisitos_resumen],
    ["Revision", raw.ultima_revision],
  ]
    .map(([label, value]) => [label, cleanText(value)])
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);

  return [cleanText(raw.notas), details.length ? `Datos CSV:\n${details.join("\n")}` : null]
    .filter(Boolean)
    .join("\n\n") || null;
}

function addIfSupported(record, supportedColumns, key, value) {
  if (supportedColumns.has(key)) record[key] = value;
}

function transformRow(raw, userId, extendedSchema, supportedBaseColumns) {
  const title = cleanText(raw.nombre);
  const idSlug = cleanText(raw.id_slug);

  const base = {
    id: idSlug ? stableUuid(COURSE_NAMESPACE, idSlug) : null,
    user_id: userId,
    title,
  };
  addIfSupported(base, supportedBaseColumns, "platform", cleanText(raw.entidad));
  addIfSupported(base, supportedBaseColumns, "url", cleanText(raw.fuente_url));
  addIfSupported(base, supportedBaseColumns, "price", parsePrice(raw.coste));
  addIfSupported(base, supportedBaseColumns, "category", cleanText(raw.categoria));
  addIfSupported(base, supportedBaseColumns, "status", mapCourseStatus(raw.estado));
  addIfSupported(base, supportedBaseColumns, "start_date", parseDate(raw.fecha_inicio));
  addIfSupported(base, supportedBaseColumns, "deadline", parseDate(raw.fecha_fin));
  addIfSupported(base, supportedBaseColumns, "notes", extendedSchema ? cleanText(raw.notas) : buildLegacyNotes(raw));

  if (!extendedSchema) return base;

  return {
    ...base,
    id_slug: idSlug,
    entidad: cleanText(raw.entidad),
    area: cleanText(raw.area),
    modalidad: cleanText(raw.modalidad),
    localidad: cleanText(raw.localidad),
    provincia: cleanText(raw.provincia),
    formato: cleanText(raw.formato),
    certificacion_tipo: cleanText(raw.certificacion_tipo),
    certificacion_oficial: parseBoolean(raw.certificacion_oficial),
    practicas_empresa: parseBoolean(raw.practicas_empresa),
    horas_totales: parseIntValue(raw.horas_totales),
    horas_practicas: parseIntValue(raw.horas_practicas),
    fecha_inicio: parseDate(raw.fecha_inicio),
    fecha_fin: parseDate(raw.fecha_fin),
    estado: cleanText(raw.estado),
    coste: cleanText(raw.coste),
    requisitos_resumen: cleanText(raw.requisitos_resumen),
    encaje_daw_1_5: parseIntValue(raw.encaje_daw_1_5),
    prioridad: mapPriority(raw.prioridad),
    tags: cleanText(raw.tags),
    fuente_url: cleanText(raw.fuente_url),
    ultima_revision: parseDate(raw.ultima_revision),
  };
}

async function findUserIdByEmail(supabase, email) {
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users ?? [];
    const found = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (users.length < 1000) break;
  }
  throw new Error(`User not found for TARGET_USER_EMAIL=${email}`);
}

async function supportsExtendedSchema(supabase) {
  const { error } = await supabase.from("courses").select(COURSE_EXTENDED_SELECT).limit(1);
  if (!error) return true;
  console.warn("Extended courses columns not found. Importing with current base schema and preserving CSV details in notes.");
  return false;
}

async function supportedOptionalColumns(supabase, table, columns) {
  const supported = new Set();
  for (const column of columns) {
    const { error } = await supabase.from(table).select(column).limit(1);
    if (!error) {
      supported.add(column);
    } else {
      console.warn(`Column ${table}.${column} not found. It will be skipped.`);
    }
  }
  return supported;
}

async function existingIds(supabase, userId, ids) {
  const found = new Set();
  const batchSize = 100;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("courses")
      .select("id")
      .eq("user_id", userId)
      .in("id", batch);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.id) found.add(row.id);
    }
  }
  return found;
}

function printSchemaHint(error) {
  const message = String(error?.message ?? error);
  if (message.includes("id_slug") || message.includes("schema cache") || message.includes("unique")) {
    console.error("Schema is not ready. Apply supabase/migrations/extend_courses_hackathons.sql first.");
  }
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const targetEmail = process.env.TARGET_USER_EMAIL;

  if (!supabaseUrl || !serviceKey || !targetEmail) {
    console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY, or TARGET_USER_EMAIL.");
    process.exit(1);
  }
  if (!existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const userId = await findUserIdByEmail(supabase, targetEmail);
  const extendedSchema = await supportsExtendedSchema(supabase);
  const supportedBaseColumns = await supportedOptionalColumns(supabase, "courses", COURSE_BASE_OPTIONAL_COLUMNS);

  const rows = parseCSV(readFileSync(CSV_PATH, "utf-8"));
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) => h.trim());
  const records = dataRows
    .map((fields) => {
      const raw = Object.fromEntries(headers.map((h, i) => [h, fields[i] ?? ""]));
      return transformRow(raw, userId, extendedSchema, supportedBaseColumns);
    })
    .filter((row) => row.id && row.title);

  const existing = await existingIds(supabase, userId, records.map((row) => row.id));
  const toInsert = records.filter((row) => !existing.has(row.id)).length;
  const toUpdate = records.length - toInsert;

  let imported = 0;
  let errors = 0;
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from("courses")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      printSchemaHint(error);
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`);
      errors += batch.length;
    } else {
      imported += batch.length;
      console.log(`Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} rows ok`);
    }
  }

  console.log("-".repeat(50));
  console.log(`Target user: ${targetEmail}`);
  console.log(`Extended schema: ${extendedSchema ? "yes" : "no"}`);
  console.log(`Rows read: ${dataRows.length}`);
  console.log(`Valid rows: ${records.length}`);
  console.log(`Expected inserts: ${toInsert}`);
  console.log(`Expected updates: ${toUpdate}`);
  console.log(`Upserted rows: ${imported}`);
  console.log(`Errors: ${errors}`);
  if (errors > 0) process.exit(1);
}

main().catch((error) => {
  printSchemaHint(error);
  console.error("Fatal:", error.message ?? error);
  process.exit(1);
});
