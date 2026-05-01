/**
 * Import tech opportunities from CSV to Supabase.
 *
 * Usage:
 *   node scripts/import-tech-opportunities.mjs
 *
 * Requires env vars (loaded from .env.local automatically if not already set):
 *   NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Running it multiple times is safe: records are upserted by id_slug.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CSV_PATH = join(ROOT, "csv", "oportunidades_tech_supabase_combinado.csv");
const BATCH_SIZE = 20;

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR Missing env vars: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!existsSync(CSV_PATH)) {
  console.error(`ERROR CSV not found: ${CSV_PATH}`);
  process.exit(1);
}

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
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
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
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function nullify(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

function nullifyDate(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const european = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (european) {
    const [, day, month, year] = european;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function nullifyInt(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function transformRow(raw) {
  return {
    id_slug: nullify(raw.id_slug),
    categoria: nullify(raw.categoria),
    nombre: nullify(raw.nombre),
    entidad: nullify(raw.entidad),
    area_o_tipo: nullify(raw.area_o_tipo),
    modalidad: nullify(raw.modalidad),
    localidad: nullify(raw.localidad),
    provincia: nullify(raw.provincia),
    fecha_inicio: nullifyDate(raw.fecha_inicio),
    fecha_fin: nullifyDate(raw.fecha_fin),
    estado: nullify(raw.estado),
    certificacion_o_premio: nullify(raw.certificacion_o_premio),
    practicas_empresa: nullify(raw.practicas_empresa),
    horas_totales: nullifyInt(raw.horas_totales),
    horas_practicas: nullifyInt(raw.horas_practicas),
    coste: nullify(raw.coste),
    requisitos_resumen: nullify(raw.requisitos_resumen),
    encaje_daw_1_5: nullifyInt(raw.encaje_daw_1_5),
    prioridad: nullify(raw.prioridad),
    tags: nullify(raw.tags),
    fuente_url: nullify(raw.fuente_url),
    ultima_revision: nullifyDate(raw.ultima_revision),
    notas: nullify(raw.notas),
  };
}

async function main() {
  console.log(`Reading CSV: ${CSV_PATH}`);

  const rows = parseCSV(readFileSync(CSV_PATH, "utf-8"));
  if (rows.length < 2) {
    console.error("ERROR CSV has no data rows.");
    process.exit(1);
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.trim());
  const records = dataRows
    .map((fields) => {
      const raw = {};
      headers.forEach((header, index) => {
        raw[header] = fields[index] ?? "";
      });
      return transformRow(raw);
    })
    .filter((record) => record.id_slug && record.nombre);

  console.log(`Columns: ${headers.join(", ")}`);
  console.log(`Rows read: ${dataRows.length}`);
  console.log(`Valid records: ${records.length}`);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let imported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const { error } = await supabase
      .from("tech_opportunities")
      .upsert(batch, { onConflict: "id_slug" });

    if (error) {
      errors += batch.length;
      console.error(`ERROR Batch ${batchNumber}: ${error.message}`);
      if (error.message.includes("tech_opportunities")) {
        console.error("Hint: apply supabase/migrations/create_tech_opportunities.sql before importing.");
      }
      continue;
    }

    imported += batch.length;
    console.log(`Batch ${batchNumber}: ${batch.length} upserted`);
  }

  console.log("-".repeat(50));
  console.log(`Imported/updated: ${imported}`);
  console.log(`Errors: ${errors}`);

  if (errors > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
