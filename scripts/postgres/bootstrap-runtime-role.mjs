/**
 * Creates or reconciles the least-privilege PostgreSQL runtime role.
 * This operation never runs automatically during build or startup.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Client } = require("pg");
const CONFIRMATION = "CREATE_AL_LIO_APP_ROLE";
const APP_ROLE = "al_lio_app";

loadDotEnv();

if (process.env.AL_LIO_DB_ROLE_CONFIRMATION !== CONFIRMATION) {
  fail(`Define AL_LIO_DB_ROLE_CONFIRMATION=${CONFIRMATION} para confirmar el cambio de privilegios.`);
}

const adminUrl = requiredUrl("DATABASE_MIGRATION_URL");
const runtimeUrl = requiredUrl("DATABASE_URL");
const runtimeUser = decodeURIComponent(runtimeUrl.username);
const runtimePassword = decodeURIComponent(runtimeUrl.password);
const adminDatabase = decodeURIComponent(adminUrl.pathname.replace(/^\//, ""));
const runtimeDatabase = decodeURIComponent(runtimeUrl.pathname.replace(/^\//, ""));

if (runtimeUser !== APP_ROLE) fail(`DATABASE_URL debe usar el usuario ${APP_ROLE}.`);
if (!runtimePassword || runtimePassword === "REPLACE_ME") fail("DATABASE_URL necesita una contraseña real para al_lio_app.");
if (!adminDatabase || adminDatabase !== runtimeDatabase) fail("DATABASE_MIGRATION_URL y DATABASE_URL deben apuntar a la misma base.");

const client = new Client({ connectionString: adminUrl.toString(), application_name: "al-lio-role-bootstrap" });

try {
  await client.connect();
  const literalResult = await client.query("SELECT quote_literal($1::text) AS value", [runtimePassword]);
  const passwordLiteral = literalResult.rows[0]?.value;
  if (!passwordLiteral) throw new Error("No se pudo preparar la contraseña del rol.");

  await client.query("BEGIN");
  try {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
          CREATE ROLE ${APP_ROLE} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
        END IF;
      END
      $$
    `);
    await client.query(`ALTER ROLE ${APP_ROLE} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD ${passwordLiteral}`);
    await client.query(`ALTER ROLE ${APP_ROLE} SET search_path = public`);
    await client.query(`ALTER ROLE ${APP_ROLE} SET statement_timeout = '15s'`);
    await client.query(`ALTER ROLE ${APP_ROLE} SET idle_in_transaction_session_timeout = '30s'`);
    await client.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    await client.query(`GRANT CONNECT ON DATABASE ${quoteIdentifier(runtimeDatabase)} TO ${APP_ROLE}`);
    await client.query(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`);
    await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE}`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_ROLE}`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${APP_ROLE}`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }

  const verification = await client.query(
    "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin FROM pg_roles WHERE rolname = $1",
    [APP_ROLE],
  );
  const role = verification.rows[0];
  if (!role || role.rolsuper || role.rolcreatedb || role.rolcreaterole || !role.rolcanlogin) {
    throw new Error("El rol de runtime no cumple el contrato de mínimo privilegio.");
  }

  console.log(`OK: ${APP_ROLE} configurado sin privilegios de administración.`);
} catch (error) {
  console.error(`ERROR configurando el rol de runtime: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

function requiredUrl(name) {
  const value = process.env[name];
  if (!value || value.includes("REPLACE_ME")) fail(`${name} no está configurada.`);
  try {
    return new URL(value);
  } catch {
    fail(`${name} no es una URL válida.`);
  }
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

function loadDotEnv() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
