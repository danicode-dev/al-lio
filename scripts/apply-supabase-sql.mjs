import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireSupabaseAdminEnv } from "./supabase-env.mjs";

const file = process.argv[2];

if (!file) {
  console.error("Usage: node scripts/apply-supabase-sql.mjs <sql-file>");
  process.exit(1);
}

if (!existsSync(file)) {
  console.error(`SQL file not found: ${file}`);
  process.exit(1);
}

loadEnvLocal();
const sql = readFileSync(file, "utf8");

async function tryDatabaseUrl() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) return false;

  const pg = await import("pg");
  const Client = pg.Client ?? pg.default?.Client;
  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? undefined : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log(`OK: SQL applied with SUPABASE_DB_URL/DATABASE_URL: ${file}`);
    return true;
  } finally {
    await client.end().catch(() => {});
  }
}

async function tryRpc() {
  const { supabaseUrl, adminKey } = requireSupabaseAdminEnv();
  const supabase = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });

  for (const name of ["exec_sql", "execute_sql", "run_sql"]) {
    const { error } = await supabase.rpc(name, { sql });
    if (!error) {
      console.log(`OK: SQL applied through RPC ${name}`);
      return true;
    }
  }

  return false;
}

if (await tryDatabaseUrl()) process.exit(0);

if (await tryRpc()) process.exit(0);

console.error("Could not apply SQL automatically.");
console.error("Provide SUPABASE_DB_URL/DATABASE_URL, or create an admin SQL RPC, or run the SQL file in Supabase SQL Editor.");
process.exit(1);
