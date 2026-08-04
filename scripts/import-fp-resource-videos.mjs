import pg from "pg";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CSV_PATH = join(ROOT, "csv", "fp-content", "2026-2027", "videos", "recursos_video.csv");

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

function isLikelyYouTubeUrl(value) {
  try {
    const parsed = new URL(value);
    return /(^|\.)youtube\.com$/.test(parsed.hostname) || parsed.hostname === "youtu.be";
  } catch {
    return false;
  }
}

async function main() {
  loadEnvLocal();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL is not defined.");
    process.exit(1);
  }

  if (!existsSync(CSV_PATH)) {
    console.error(`ERROR: CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(CSV_PATH, "utf-8"));
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.replace(/^﻿/, "").trim());
  if (headers.join("|") !== "id_slug|video_url|notas") {
    console.error(`ERROR: unexpected headers in ${CSV_PATH}. Expected id_slug,video_url,notas`);
    process.exit(1);
  }

  const records = dataRows.map((fields) => Object.fromEntries(headers.map((header, index) => [header, fields[index]?.trim() ?? ""])));

  if (records.length === 0) {
    console.log("OK: recursos_video.csv has no rows yet. Nothing to import.");
    return;
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    let updated = 0;
    const orphans = [];
    const suspiciousUrls = [];

    for (const record of records) {
      if (!record.id_slug || !record.video_url) continue;

      if (!isLikelyYouTubeUrl(record.video_url)) {
        suspiciousUrls.push(record.id_slug);
      }

      const res = await client.query(
        `UPDATE public.fp_content_items SET video_url = $1, updated_at = now() WHERE id_slug = $2`,
        [record.video_url, record.id_slug]
      );

      if (res.rowCount === 0) {
        orphans.push(record.id_slug);
      } else {
        updated++;
      }
    }

    await client.query("COMMIT");

    console.log("OK: FP resource videos imported.");
    console.log(`Rows in CSV: ${records.length}`);
    console.log(`Updated: ${updated}`);
    if (orphans.length > 0) {
      console.log(`Skipped (id_slug not found in fp_content_items): ${orphans.length}`);
      console.log(orphans.map((slug) => `  - ${slug}`).join("\n"));
    }
    if (suspiciousUrls.length > 0) {
      console.log(`WARN: video_url does not look like a youtube.com/youtu.be link for: ${suspiciousUrls.join(", ")}`);
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
