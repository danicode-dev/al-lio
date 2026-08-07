import pg from "pg";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CSV_PATH = join(ROOT, "csv", "oportunidades_tech_combinado.csv");

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

const COLUMNS = [
  "id_slug", "categoria", "nombre", "entidad", "area_o_tipo", "modalidad", "localidad",
  "provincia", "fecha_inicio", "fecha_fin", "estado", "certificacion_o_premio",
  "practicas_empresa", "horas_totales", "horas_practicas", "coste", "requisitos_resumen",
  "encaje_daw_1_5", "prioridad", "tags", "fuente_url", "ultima_revision", "notas",
];

async function main() {
  loadEnvLocal();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }
  if (!existsSync(CSV_PATH)) {
    console.error(`CSV no encontrado: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log(`Leyendo CSV: ${CSV_PATH}`);

  const rows = parseCSV(readFileSync(CSV_PATH, "utf-8"));
  if (rows.length < 2) {
    console.error("El CSV no tiene filas de datos.");
    process.exit(1);
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.replace(/^﻿/, "").trim());
  const records = dataRows
    .map((fields) => {
      const raw = Object.fromEntries(headers.map((h, i) => [h, fields[i] ?? ""]));
      return transformRow(raw);
    })
    .filter((row) => row.id_slug && row.nombre);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    let imported = 0;
    let errors = 0;

    for (const record of records) {
      const values = COLUMNS.map((c) => record[c] ?? null);
      const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(", ");
      const updates = COLUMNS.filter((c) => c !== "id_slug").map((c) => `"${c}" = excluded."${c}"`).join(", ");
      try {
        await client.query(
          `INSERT INTO public.tech_opportunities (${COLUMNS.map((c) => `"${c}"`).join(", ")})
           VALUES (${placeholders})
           ON CONFLICT (id_slug) DO UPDATE SET ${updates}, updated_at = now()`,
          values,
        );
        imported++;
      } catch (error) {
        errors++;
        console.error(`Error en "${record.nombre}": ${error.message}`);
      }
    }

    console.log("-".repeat(50));
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
