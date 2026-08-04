import pg from "pg";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const COMPETENCIAS_DIR = join(ROOT, "csv", "fp-content", "2026-2027", "competencias");

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
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

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

function nullify(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

function nullifyDate(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function toBool(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "sí" || normalized === "si" || normalized === "true";
}

function toInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function readCsv(fileName) {
  const filePath = join(COMPETENCIAS_DIR, fileName);
  if (!existsSync(filePath)) {
    throw new Error(`CSV not found: ${filePath}`);
  }

  const rows = parseCsv(readFileSync(filePath, "utf-8"));
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.replace(/^﻿/, "").trim());

  return dataRows.map((fields) => Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ""])));
}

async function upsertCompetency(client, raw) {
  await client.query(
    `INSERT INTO public.fp_competencies
       (id, cycle_code, orden_global, etapa, bloque, modulo_codigo, modulo_nombre, titulo, descripcion,
        nivel_objetivo, obligatoria_roadmap_base, basico_antes_de_empezar, horas_estimadas,
        criterios_superacion, evidencia_minima, umbral_superacion, aplicable_a,
        fuente_titulo_url, fuente_curriculo_url, tipo_criterio, ultima_revision)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     ON CONFLICT (id) DO UPDATE SET
       cycle_code = excluded.cycle_code,
       orden_global = excluded.orden_global,
       etapa = excluded.etapa,
       bloque = excluded.bloque,
       modulo_codigo = excluded.modulo_codigo,
       modulo_nombre = excluded.modulo_nombre,
       titulo = excluded.titulo,
       descripcion = excluded.descripcion,
       nivel_objetivo = excluded.nivel_objetivo,
       obligatoria_roadmap_base = excluded.obligatoria_roadmap_base,
       basico_antes_de_empezar = excluded.basico_antes_de_empezar,
       horas_estimadas = excluded.horas_estimadas,
       criterios_superacion = excluded.criterios_superacion,
       evidencia_minima = excluded.evidencia_minima,
       umbral_superacion = excluded.umbral_superacion,
       aplicable_a = excluded.aplicable_a,
       fuente_titulo_url = excluded.fuente_titulo_url,
       fuente_curriculo_url = excluded.fuente_curriculo_url,
       tipo_criterio = excluded.tipo_criterio,
       ultima_revision = excluded.ultima_revision,
       updated_at = now()`,
    [
      raw.competencia_id,
      raw.ciclo_siglas,
      toInt(raw.orden_global),
      raw.etapa,
      nullify(raw.bloque),
      nullify(raw.modulo_codigo),
      nullify(raw.modulo_nombre),
      raw.titulo,
      nullify(raw.descripcion),
      toInt(raw.nivel_objetivo),
      toBool(raw.obligatoria_roadmap_base),
      toBool(raw.basico_antes_de_empezar),
      toInt(raw.horas_estimadas),
      nullify(raw.criterios_superacion),
      nullify(raw.evidencia_minima),
      nullify(raw.umbral_superacion),
      nullify(raw.aplicable_a),
      nullify(raw.fuente_titulo_url),
      nullify(raw.fuente_curriculo_url),
      nullify(raw.tipo_criterio),
      nullifyDate(raw.ultima_revision),
    ]
  );
}

async function upsertRelation(client, raw) {
  await client.query(
    `INSERT INTO public.fp_competency_relations
       (competencia_origen_id, competencia_destino_id, cycle_code, tipo_relacion, obligatoria, motivo)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (competencia_origen_id, competencia_destino_id) DO UPDATE SET
       cycle_code = excluded.cycle_code,
       tipo_relacion = excluded.tipo_relacion,
       obligatoria = excluded.obligatoria,
       motivo = excluded.motivo,
       updated_at = now()`,
    [
      raw.competencia_origen_id,
      raw.competencia_destino_id,
      raw.ciclo_siglas,
      raw.tipo_relacion || "prerrequisito",
      toBool(raw.obligatoria),
      nullify(raw.motivo),
    ]
  );
}

async function upsertItemCompetency(client, contentItemId, raw) {
  await client.query(
    `INSERT INTO public.fp_item_competencies
       (content_item_id, competencia_id, tipo_relacion, orden_preparacion, nivel_minimo_recomendado,
        obligatoria_para_item, motivo_relacion)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (content_item_id, competencia_id, tipo_relacion) DO UPDATE SET
       orden_preparacion = excluded.orden_preparacion,
       nivel_minimo_recomendado = excluded.nivel_minimo_recomendado,
       obligatoria_para_item = excluded.obligatoria_para_item,
       motivo_relacion = excluded.motivo_relacion,
       updated_at = now()`,
    [
      contentItemId,
      raw.competencia_id,
      raw.tipo_relacion,
      toInt(raw.orden_preparacion),
      toInt(raw.nivel_minimo_recomendado),
      toBool(raw.obligatoria_para_item),
      nullify(raw.motivo_relacion),
    ]
  );
}

async function main() {
  loadEnvLocal();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL is not defined.");
    process.exit(1);
  }

  const competencies = readCsv("roadmap_competencias.csv");
  const relations = readCsv("relaciones_competencias.csv");
  const itemLinks = readCsv("item_competencias.csv");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    for (const raw of competencies) {
      await upsertCompetency(client, raw);
    }

    for (const raw of relations) {
      await upsertRelation(client, raw);
    }

    const idLookup = await client.query("SELECT id, id_slug FROM public.fp_content_items");
    const idBySlug = new Map(idLookup.rows.map((row) => [row.id_slug, row.id]));

    let linked = 0;
    const orphans = [];
    for (const raw of itemLinks) {
      const contentItemId = idBySlug.get(raw.item_id_slug);
      if (!contentItemId) {
        orphans.push(raw.item_id_slug);
        continue;
      }
      await upsertItemCompetency(client, contentItemId, raw);
      linked++;
    }

    await client.query("COMMIT");

    console.log("OK: FP competencies imported.");
    console.log(`Competencies: ${competencies.length}`);
    console.log(`Relations: ${relations.length}`);
    console.log(`Item links imported: ${linked}`);
    if (orphans.length > 0) {
      const uniqueOrphans = [...new Set(orphans)];
      console.log(`Item links skipped (item_id_slug not in fp_content_items): ${orphans.length} rows, ${uniqueOrphans.length} unique slugs`);
      console.log(uniqueOrphans.slice(0, 20).map((slug) => `  - ${slug}`).join("\n"));
      if (uniqueOrphans.length > 20) console.log(`  ... and ${uniqueOrphans.length - 20} more`);
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("ERROR:", error.message ?? error);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error("Fatal:", error.message ?? error);
  process.exit(1);
});
