import pg from "pg";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ALLOWED_CYCLE_GROUPS, parseDatasetSource, validateDataset } from "./lib/company-catalogue.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const COLUMNS = [
  "id", "id_slug", "nombre", "web", "empleo_url", "tipo_empleo",
  "categoria", "granada_note", "fuente", "cycle_group", "sort_order",
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
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function parseArgs(argv) {
  const args = { dryRun: false, source: null, cycleGroup: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run" || arg === "--validate-only") args.dryRun = true;
    else if (arg === "--source") args.source = argv[++i];
    else if (arg === "--cycle-group") args.cycleGroup = argv[++i];
  }
  return args;
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

async function main() {
  loadEnvLocal();

  const { dryRun, source, cycleGroup } = parseArgs(process.argv.slice(2));

  if (!source) fail("--source <path> is required");
  if (!cycleGroup) fail(`--cycle-group <${ALLOWED_CYCLE_GROUPS.join("|")}> is required`);
  if (!ALLOWED_CYCLE_GROUPS.includes(cycleGroup)) fail(`Unknown --cycle-group "${cycleGroup}" (allowed: ${ALLOWED_CYCLE_GROUPS.join(", ")})`);

  const sourcePath = resolve(ROOT, source);
  if (!existsSync(sourcePath)) fail(`Source file not found: ${sourcePath}`);

  const sourceText = readFileSync(sourcePath, "utf-8");
  let cycleGroupInFile, rows;
  try {
    ({ cycleGroupInFile, rows } = parseDatasetSource(sourceText, sourcePath));
  } catch (error) {
    fail(error.message);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) fail("Missing DATABASE_URL.");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    // Fetch every existing slug/group pair once so validateDataset can
    // refuse anything that would silently jump an existing row to a
    // different cycle_group.
    const existingRows = await client.query(`SELECT id_slug, cycle_group FROM public.companies`);
    const existingIdentities = new Map(existingRows.rows.map((row) => [row.id_slug, row.cycle_group]));

    const { errors, warnings, records } = validateDataset({ cycleGroupInFile, rows, cycleGroup, existingIdentities });

    for (const warning of warnings) console.warn(`WARN: ${warning}`);

    if (errors.length > 0) {
      for (const error of errors) console.error(`FAIL: ${error}`);
      console.error("-".repeat(50));
      console.error(`Validation failed: ${errors.length} error(s). No rows were written.`);
      process.exitCode = 1;
      return;
    }

    console.log(`OK: ${records.length} row(s) validated for cycle_group=${cycleGroup} (source: ${source}).`);
    if (warnings.length > 0) console.log(`${warnings.length} warning(s) - review before approving.`);

    if (dryRun) {
      console.log("Dry run: no database writes performed.");
      return;
    }

    await client.query("BEGIN");
    try {
      let imported = 0;
      for (const record of records) {
        const values = COLUMNS.map((c) => record[c] ?? null);
        const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(", ");
        // cycle_group is intentionally excluded from the UPDATE SET, and the
        // WHERE clause below only lets the update apply when it already
        // matches: the pre-flight check above already refuses a
        // cross-group slug collision, so this is a second, DB-level layer
        // against ever silently moving a row's cycle_group on conflict.
        const updates = COLUMNS.filter((c) => c !== "id" && c !== "id_slug" && c !== "cycle_group").map((c) => `"${c}" = excluded."${c}"`).join(", ");
        await client.query(
          `INSERT INTO public.companies (${COLUMNS.map((c) => `"${c}"`).join(", ")})
           VALUES (${placeholders})
           ON CONFLICT (id_slug) DO UPDATE SET ${updates}, updated_at = now()
           WHERE public.companies.cycle_group = excluded.cycle_group`,
          values,
        );
        imported++;
      }
      await client.query("COMMIT");
      console.log(`Imported ${imported} row(s) into cycle_group=${cycleGroup}.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Fatal:", error.message ?? error);
  process.exit(1);
});
