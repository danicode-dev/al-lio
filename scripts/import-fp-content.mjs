import pg from "pg";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RAW_DIR = join(ROOT, "csv", "fp-content", "2026-2027", "raw");

const CSV_FILES = [
  "daw-dam.csv",
  "administracion-finanzas.csv",
  "acondicionamiento-fisico.csv",
  "marketing-publicidad.csv",
];

const HEADERS = [
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

const ITEM_COLUMNS = [
  "id_slug",
  "type",
  "title",
  "description",
  "entity",
  "delivery_mode",
  "location",
  "province",
  "start_date",
  "end_date",
  "status",
  "cost",
  "certification",
  "practices",
  "source_url",
  "tags",
  "suggested_action",
  "last_reviewed_at",
  "notes",
  "source_year",
];

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

function parseTags(value) {
  return String(value || "")
    .split("|")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizePractice(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "si" || normalized === "s\u00ed" || normalized === "s\u00c3\u00ad") return "si";
  if (normalized === "posible") return "posible";
  return "no";
}

function cycleGroupFor(cycleCode) {
  return cycleCode === "DAW" || cycleCode === "DAM" ? "DEV" : cycleCode;
}

function recordFromRow(headers, fields) {
  return Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ""]));
}

function transformRecord(raw) {
  return {
    item: {
      id_slug: nullify(raw.id_slug),
      type: nullify(raw.tipo),
      title: nullify(raw.titulo),
      description: nullify(raw.descripcion),
      entity: nullify(raw.entidad),
      delivery_mode: nullify(raw.modalidad),
      location: nullify(raw.localidad),
      province: nullify(raw.provincia),
      start_date: nullifyDate(raw.fecha_inicio),
      end_date: nullifyDate(raw.fecha_fin),
      status: nullify(raw.estado),
      cost: nullify(raw.coste),
      certification: nullify(raw.certificacion),
      practices: normalizePractice(raw.practicas),
      source_url: nullify(raw.fuente_url),
      tags: parseTags(raw.tags),
      suggested_action: nullify(raw.accion_sugerida),
      last_reviewed_at: nullifyDate(raw.ultima_revision),
      notes: nullify(raw.notas),
      source_year: "2026-2027",
    },
    fit: {
      cycle_code: nullify(raw.ciclo_siglas),
      cycle_group: cycleGroupFor(raw.ciclo_siglas),
      priority: nullify(raw.prioridad),
      fit_score: Number.parseInt(raw.encaje_1_5, 10),
      audience_year: null,
    },
  };
}

function loadRecords() {
  const records = [];

  for (const file of CSV_FILES) {
    const filePath = join(RAW_DIR, file);
    if (!existsSync(filePath)) {
      throw new Error(`CSV not found: ${filePath}`);
    }

    const rows = parseCsv(readFileSync(filePath, "utf-8"));
    const [headerRow, ...dataRows] = rows;
    const headers = headerRow.map((header) => header.replace(/^\uFEFF/, "").trim());
    if (headers.join("|") !== HEADERS.join("|")) {
      throw new Error(`Unexpected CSV headers in ${file}. Run npm run validate:fp-content first.`);
    }

    for (const fields of dataRows) {
      records.push(transformRecord(recordFromRow(headers, fields)));
    }
  }

  return records;
}

async function upsertContentItem(client, item) {
  const values = ITEM_COLUMNS.map((column) => item[column] ?? null);
  const placeholders = ITEM_COLUMNS.map((_, index) => `$${index + 1}`).join(", ");
  const updates = ITEM_COLUMNS
    .filter((column) => column !== "id_slug")
    .map((column) => `"${column}" = excluded."${column}"`)
    .join(", ");

  const res = await client.query(
    `INSERT INTO public.fp_content_items (${ITEM_COLUMNS.map((column) => `"${column}"`).join(", ")})
     VALUES (${placeholders})
     ON CONFLICT (id_slug) DO UPDATE SET ${updates}, updated_at = now()
     RETURNING id`,
    values
  );
  return res.rows[0].id;
}

async function upsertCycleFit(client, contentItemId, fit) {
  await client.query(
    `INSERT INTO public.fp_content_cycle_fit
       (content_item_id, cycle_code, cycle_group, priority, fit_score, audience_year)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (content_item_id, cycle_code) DO UPDATE SET
       cycle_group = excluded.cycle_group,
       priority = excluded.priority,
       fit_score = excluded.fit_score,
       audience_year = excluded.audience_year,
       updated_at = now()`,
    [
      contentItemId,
      fit.cycle_code,
      fit.cycle_group,
      fit.priority,
      fit.fit_score,
      fit.audience_year,
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

  const records = loadRecords();
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    let volatileRows = 0;
    for (const record of records) {
      if (record.item.type === "empleo_busqueda") volatileRows++;
      const contentItemId = await upsertContentItem(client, record.item);
      await upsertCycleFit(client, contentItemId, record.fit);
    }

    await client.query("COMMIT");

    console.log("OK: FP content imported.");
    console.log(`Rows imported/upserted: ${records.length}`);
    console.log(`Volatile empleo_busqueda rows imported but hidden by MVP repository: ${volatileRows}`);
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
