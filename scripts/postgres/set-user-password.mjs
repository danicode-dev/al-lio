/**
 * AL-LIO PostgreSQL: sets password_hash for an existing public.users row.
 * This is a manual administrative utility, not part of an automatic pipeline.
 *
 * Variables obligatorias:
 *   DATABASE_URL                              — PostgreSQL connection URL
 *   AL_LIO_SET_PASSWORD_CONFIRMATION=SET_POSTGRES_USER_PASSWORD
 *   AL_LIO_USER_EMAIL                         — email address of the user to update
 *   AL_LIO_USER_PASSWORD                      — new plaintext password
 *
 * The command never prints the password or DATABASE_URL.
 *
 * Uso:
 *   DATABASE_URL=postgresql://... \
 *   AL_LIO_SET_PASSWORD_CONFIRMATION=SET_POSTGRES_USER_PASSWORD \
 *   AL_LIO_USER_EMAIL=user@example.com \
 *   AL_LIO_USER_PASSWORD=<password> \
 *   node scripts/postgres/set-user-password.mjs
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// ── Guardias de seguridad ─────────────────────────────────────────────────────

if (process.env.AL_LIO_SET_PASSWORD_CONFIRMATION !== "SET_POSTGRES_USER_PASSWORD") {
  console.error(
    "\n⛔  OPERACIÓN BLOQUEADA\n\n" +
    "Define la variable de confirmación:\n" +
    "  AL_LIO_SET_PASSWORD_CONFIRMATION=SET_POSTGRES_USER_PASSWORD\n"
  );
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("\nERROR: DATABASE_URL no definida.");
  process.exit(1);
}

// Reject the isolated sandbox database (port 54329).
const parsed = new URL(dbUrl);
if (["localhost", "127.0.0.1"].includes(parsed.hostname) && parsed.port === "54329") {
  console.error(
    "\nERROR: DATABASE_URL apunta al sandbox (127.0.0.1:54329).\n" +
    "Usa POSTGRES_SANDBOX_DATABASE_URL para el sandbox."
  );
  process.exit(1);
}

const email = process.env.AL_LIO_USER_EMAIL;
if (!email) {
  console.error("\nERROR: AL_LIO_USER_EMAIL no definida.");
  process.exit(1);
}

const password = process.env.AL_LIO_USER_PASSWORD;
if (!password || password.length < 8) {
  console.error("\nERROR: AL_LIO_USER_PASSWORD no definida o demasiado corta (mínimo 8 caracteres).");
  process.exit(1);
}

// ── Hashear y actualizar ──────────────────────────────────────────────────────

const bcrypt = require("bcryptjs");
const { Client } = require("pg");

const client = new Client({ connectionString: dbUrl });

try {
  await client.connect();
  console.log(`\nConectado a PostgreSQL. Host: ${parsed.hostname}`);

  // Verify that the user exists.
  const checkRes = await client.query(
    `SELECT id, email FROM public.users WHERE email = $1`,
    [email]
  );
  if (!checkRes.rows.length) {
    console.error(`\nERROR: Usuario no encontrado con email "${email}".`);
    process.exit(1);
  }

  const userId = checkRes.rows[0].id;
  const hash = await bcrypt.hash(password, 12);

  await client.query(
    `UPDATE public.users SET password_hash = $1 WHERE id = $2`,
    [hash, userId]
  );

  console.log(`\nOK  password_hash actualizado para usuario ${userId}`);
  console.log("    Email:", email);
  console.log("    Hash almacenado: [oculto]\n");

} catch (err) {
  console.error("\nERROR:", err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
