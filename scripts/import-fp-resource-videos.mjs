import pg from "pg";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const JSON_PATH = join(ROOT, "csv", "fp-content", "2026-2027", "videos", "recursos_video.json");

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

  if (!existsSync(JSON_PATH)) {
    console.error(`ERROR: JSON not found: ${JSON_PATH}`);
    process.exit(1);
  }

  const parsed = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  if (!Array.isArray(parsed.recursos)) {
    console.error(`ERROR: unexpected shape in ${JSON_PATH}. Expected a top-level "recursos" array.`);
    process.exit(1);
  }

  const records = parsed.recursos.map((r) => ({
    id_slug: String(r.id_slug ?? "").trim(),
    video_url: String(r.video_url ?? "").trim(),
    notas: String(r.notas ?? "").trim(),
  }));

  const seenSlugs = new Set();
  const duplicateSlugs = [];
  for (const r of records) {
    if (seenSlugs.has(r.id_slug)) duplicateSlugs.push(r.id_slug);
    seenSlugs.add(r.id_slug);
  }
  if (duplicateSlugs.length > 0) {
    console.error(`ERROR: duplicate id_slug entries in recursos_video.json: ${[...new Set(duplicateSlugs)].join(", ")}`);
    process.exit(1);
  }

  if (records.length === 0) {
    console.log("OK: recursos_video.json has no rows yet. Nothing to import.");
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
    console.log(`Rows in recursos_video.json: ${records.length}`);
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
