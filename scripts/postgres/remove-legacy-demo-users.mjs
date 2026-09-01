/**
 * Audits or removes the five exact legacy demo identities retired by issue #379.
 *
 * Audit-only (default):
 *   DATABASE_URL=postgresql://... npm run postgres:legacy-demo-users:cleanup
 *
 * Guarded deletion (requires the administrative connection and a verified backup):
 *   DATABASE_MIGRATION_URL=postgresql://... \
 *   AL_LIO_LEGACY_DEMO_BACKUP_CONFIRMATION=BACKUP_VERIFIED \
 *   AL_LIO_LEGACY_DEMO_CLEANUP_CONFIRMATION=DELETE_FIVE_LEGACY_DEMO_USERS \
 *   npm run postgres:legacy-demo-users:cleanup -- --execute
 *
 * The command never prints a connection URL or credential. Deletion is one
 * transaction and matches both the historical UUID and email, so a reused UUID
 * or email fails closed instead of deleting an ambiguous account.
 */

import pg from "pg";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CLEANUP_CONFIRMATION = "DELETE_FIVE_LEGACY_DEMO_USERS";
export const BACKUP_CONFIRMATION = "BACKUP_VERIFIED";

export const LEGACY_DEMO_USERS = Object.freeze([
  { id: "10000000-0000-0000-0000-000000000001", email: "demo.dev@al-lio.test" },
  { id: "10000000-0000-0000-0000-000000000002", email: "demo.af@al-lio.test" },
  { id: "10000000-0000-0000-0000-000000000005", email: "demo.dam@al-lio.test" },
  { id: "10000000-0000-0000-0000-000000000003", email: "demo.tsaf@al-lio.test" },
  { id: "10000000-0000-0000-0000-000000000004", email: "demo.mp@al-lio.test" },
]);

export function validateCleanupRequest({ execute, cleanupConfirmation, backupConfirmation, migrationUrl }) {
  if (!execute) return { execute: false };
  if (!migrationUrl) {
    throw new Error("DATABASE_MIGRATION_URL is required for deletion; DATABASE_URL is audit-only.");
  }
  if (backupConfirmation !== BACKUP_CONFIRMATION) {
    throw new Error(`Set AL_LIO_LEGACY_DEMO_BACKUP_CONFIRMATION=${BACKUP_CONFIRMATION} after verifying the backup.`);
  }
  if (cleanupConfirmation !== CLEANUP_CONFIRMATION) {
    throw new Error(`Set AL_LIO_LEGACY_DEMO_CLEANUP_CONFIRMATION=${CLEANUP_CONFIRMATION} to authorize deletion.`);
  }
  return { execute: true };
}

export function classifyLegacyDemoRows(rows) {
  const normalizedRows = rows.map((row) => ({
    id: String(row.id).toLowerCase(),
    email: String(row.email).toLowerCase(),
  }));

  return LEGACY_DEMO_USERS.map((target) => {
    const matches = normalizedRows.filter(
      (row) => row.id === target.id || row.email === target.email,
    );
    if (matches.length === 0) return { ...target, status: "absent" };
    if (
      matches.length !== 1 ||
      matches[0].id !== target.id ||
      matches[0].email !== target.email
    ) {
      throw new Error(`Unsafe identity mismatch for legacy demo target ${target.id} / ${target.email}.`);
    }
    return { ...target, status: "present" };
  });
}

async function readCandidateRows(client, { lock = false } = {}) {
  const ids = LEGACY_DEMO_USERS.map((user) => user.id);
  const emails = LEGACY_DEMO_USERS.map((user) => user.email);
  const lockClause = lock ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT id::text, email
       FROM public.users
      WHERE id = ANY($1::uuid[])
         OR lower(email) = ANY($2::text[])${lockClause}`,
    [ids, emails],
  );
  return result.rows;
}

async function audit(client, { lock = false } = {}) {
  const findings = classifyLegacyDemoRows(await readCandidateRows(client, { lock }));
  for (const finding of findings) {
    console.log(`${finding.status.toUpperCase()}: ${finding.id} ${finding.email}`);
  }
  return findings;
}

async function removePresentUsers(client, findings) {
  let removed = 0;
  for (const finding of findings) {
    if (finding.status !== "present") continue;
    const result = await client.query(
      `DELETE FROM public.users
        WHERE id = $1::uuid
          AND lower(email) = lower($2)`,
      [finding.id, finding.email],
    );
    if (result.rowCount !== 1) {
      throw new Error(`Expected to delete exactly one row for ${finding.id}; deleted ${result.rowCount}.`);
    }
    removed += result.rowCount;
  }
  return removed;
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const unknownArgs = argv.filter((arg) => arg !== "--execute");
  if (unknownArgs.length > 0) throw new Error(`Unsupported argument(s): ${unknownArgs.join(", ")}`);

  const execute = argv.includes("--execute");
  const migrationUrl = env.DATABASE_MIGRATION_URL?.trim() || "";
  const auditUrl = migrationUrl || env.DATABASE_URL?.trim() || "";
  if (!auditUrl) throw new Error("Set DATABASE_MIGRATION_URL or DATABASE_URL to audit legacy demo identities.");

  validateCleanupRequest({
    execute,
    cleanupConfirmation: env.AL_LIO_LEGACY_DEMO_CLEANUP_CONFIRMATION,
    backupConfirmation: env.AL_LIO_LEGACY_DEMO_BACKUP_CONFIRMATION,
    migrationUrl,
  });

  const client = new pg.Client({ connectionString: execute ? migrationUrl : auditUrl });
  await client.connect();
  try {
    if (!execute) {
      await audit(client);
      console.log("AUDIT ONLY: no rows were changed. Use --execute only after backup verification and owner approval.");
      return;
    }

    await client.query("BEGIN");
    try {
      const findings = await audit(client, { lock: true });
      const removed = await removePresentUsers(client, findings);
      await client.query("COMMIT");
      console.log(`REMOVED: ${removed} exact legacy demo user row(s). Dependent user data followed database cascades.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    await client.end().catch(() => {});
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
