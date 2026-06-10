/**
 * Aplica infra/postgres/schema.sql contra DATABASE_URL.
 * No requiere Supabase. Solo PostgreSQL propio.
 *
 * Uso: node scripts/setup-postgres-schema.mjs
 * Requiere: DATABASE_URL en .env o en el entorno.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Cargar .env si existe
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
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

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "ERROR: DATABASE_URL no está definida.\n" +
    "Define DATABASE_URL en .env o en el entorno antes de ejecutar este script.\n" +
    "Ejemplo: DATABASE_URL=postgresql://aidraft:<password>@aidraft_postgres:5432/aidraft"
  );
  process.exit(1);
}

if (connectionString.includes("REPLACE_ME")) {
  console.error(
    "ERROR: DATABASE_URL contiene 'REPLACE_ME'. " +
    "Rellena el valor real antes de ejecutar este script."
  );
  process.exit(1);
}

const schemaPath = join(process.cwd(), "infra", "postgres", "schema.sql");

if (!existsSync(schemaPath)) {
  console.error(`ERROR: No se encontró el schema en: ${schemaPath}`);
  process.exit(1);
}

const sql = readFileSync(schemaPath, "utf-8");

const { Client } = require("pg");
const client = new Client({ connectionString });

try {
  console.log("Conectando a PostgreSQL...");
  await client.connect();
  console.log("Aplicando schema...");
  await client.query(sql);
  console.log("OK: Schema aplicado correctamente.");
} catch (error) {
  console.error("ERROR al aplicar schema:", error.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
