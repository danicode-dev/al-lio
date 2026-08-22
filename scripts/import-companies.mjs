import pg from "pg";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE_PATH = join(ROOT, "public", "data", "empresas_tech_granada.md");
const COMPANY_NAMESPACE = "companies-v1";

// Every company in this list has a technology or development profile. AF,
// TSAF and MP do not yet have verified companies; add them here only when
// existan, en vez de inventar datos.
const CYCLE_GROUP = "DEV";

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

function stableUuid(namespace, slug) {
  const bytes = createHash("sha1").update(`${namespace}:${slug}`).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanText(value) {
  const v = typeof value === "string" ? value.trim() : "";
  return v === "" ? null : v;
}

function loadCompanies() {
  if (!existsSync(SOURCE_PATH)) {
    console.error(`Fichero no encontrado: ${SOURCE_PATH}`);
    process.exit(1);
  }
  const raw = readFileSync(SOURCE_PATH, "utf-8");
  const match = raw.match(/```json\s*([\s\S]*?)```/);
  if (!match) {
    console.error("No se encontro el bloque JSON en el fichero de empresas.");
    process.exit(1);
  }
  return JSON.parse(match[1]);
}

function transformRow(raw, sortOrder) {
  const nombre = cleanText(raw.nombre);
  const idSlug = slugify(nombre);
  return {
    id: idSlug ? stableUuid(COMPANY_NAMESPACE, idSlug) : null,
    id_slug: idSlug || null,
    nombre,
    web: cleanText(raw.web),
    empleo_url: cleanText(raw.empleo),
    tipo_empleo: cleanText(raw.tipo_empleo),
    categoria: cleanText(raw.categoria),
    granada_note: cleanText(raw.granada),
    fuente: cleanText(raw.fuente),
    cycle_group: CYCLE_GROUP,
    sort_order: sortOrder,
  };
}

const COLUMNS = [
  "id", "id_slug", "nombre", "web", "empleo_url", "tipo_empleo",
  "categoria", "granada_note", "fuente", "cycle_group", "sort_order",
];

async function main() {
  loadEnvLocal();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }

  const rawCompanies = loadCompanies();
  const records = rawCompanies
    .map((raw, index) => transformRow(raw, (index + 1) * 10))
    .filter((row) => row.id && row.nombre);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    let imported = 0;
    let errors = 0;

    for (const record of records) {
      const values = COLUMNS.map((c) => record[c] ?? null);
      const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(", ");
      const updates = COLUMNS.filter((c) => c !== "id").map((c) => `"${c}" = excluded."${c}"`).join(", ");
      try {
        await client.query(
          `INSERT INTO public.companies (${COLUMNS.map((c) => `"${c}"`).join(", ")})
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
    console.log(`Ciclo destino: ${CYCLE_GROUP}`);
    console.log(`Filas leidas: ${rawCompanies.length}`);
    console.log(`Filas validas: ${records.length}`);
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
