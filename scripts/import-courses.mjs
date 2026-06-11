import pg from "pg";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CSV_PATH = join(ROOT, "csv", "cursos_formacion_granada_online_supabase.csv");
const COURSE_NAMESPACE = "courses-csv-v1";

function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    const envPath = join(ROOT, file);
    if (!existsSync(envPath)) continue;
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
    .replace(/[̀-ͯ]/g, "");
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

function transformRow(raw, userId) {
  const title = cleanText(raw.nombre);
  const idSlug = cleanText(raw.id_slug);

  return {
    id: idSlug ? stableUuid(COURSE_NAMESPACE, idSlug) : null,
    user_id: userId,
    id_slug: idSlug,
    title,
    platform: cleanText(raw.entidad),
    url: cleanText(raw.fuente_url),
    price: parsePrice(raw.coste),
    category: cleanText(raw.categoria),
    status: mapCourseStatus(raw.estado),
    start_date: parseDate(raw.fecha_inicio),
    deadline: parseDate(raw.fecha_fin),
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
    notes: cleanText(raw.notas),
  };
}

const COLUMNS = [
  "id", "user_id", "id_slug", "title", "platform", "url", "price", "category", "status",
  "start_date", "deadline", "entidad", "area", "modalidad", "localidad", "provincia",
  "formato", "certificacion_tipo", "certificacion_oficial", "practicas_empresa",
  "horas_totales", "horas_practicas", "fecha_inicio", "fecha_fin", "estado", "coste",
  "requisitos_resumen", "encaje_daw_1_5", "prioridad", "tags", "fuente_url", "ultima_revision", "notes",
];

async function main() {
  loadEnvLocal();

  const databaseUrl = process.env.DATABASE_URL;
  const targetEmail = process.env.TARGET_USER_EMAIL;

  if (!databaseUrl || !targetEmail) {
    console.error("Faltan DATABASE_URL o TARGET_USER_EMAIL.");
    process.exit(1);
  }
  if (!existsSync(CSV_PATH)) {
    console.error(`CSV no encontrado: ${CSV_PATH}`);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const userRes = await client.query(
      "SELECT id FROM public.users WHERE lower(email) = lower($1)",
      [targetEmail],
    );
    if (!userRes.rows.length) {
      throw new Error(`Usuario no encontrado para TARGET_USER_EMAIL=${targetEmail}`);
    }
    const userId = userRes.rows[0].id;

    const rows = parseCSV(readFileSync(CSV_PATH, "utf-8"));
    const [headerRow, ...dataRows] = rows;
    const headers = headerRow.map((h) => h.replace(/^﻿/, "").trim());
    const records = dataRows
      .map((fields) => {
        const raw = Object.fromEntries(headers.map((h, i) => [h, fields[i] ?? ""]));
        return transformRow(raw, userId);
      })
      .filter((row) => row.id && row.title);

    let imported = 0;
    let errors = 0;

    for (const record of records) {
      const values = COLUMNS.map((c) => record[c] ?? null);
      const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(", ");
      const updates = COLUMNS.filter((c) => c !== "id").map((c) => `"${c}" = excluded."${c}"`).join(", ");
      try {
        await client.query(
          `INSERT INTO public.courses (${COLUMNS.map((c) => `"${c}"`).join(", ")})
           VALUES (${placeholders})
           ON CONFLICT (id) DO UPDATE SET ${updates}, updated_at = now()`,
          values,
        );
        imported++;
      } catch (error) {
        errors++;
        console.error(`Error en "${record.title}": ${error.message}`);
      }
    }

    console.log("-".repeat(50));
    console.log(`Usuario destino: ${targetEmail}`);
    console.log(`Filas leídas: ${dataRows.length}`);
    console.log(`Filas válidas: ${records.length}`);
    console.log(`Filas importadas: ${imported}`);
    console.log(`Errores: ${errors}`);
    if (errors > 0) process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Fatal:", error.message ?? error);
  process.exit(1);
});
