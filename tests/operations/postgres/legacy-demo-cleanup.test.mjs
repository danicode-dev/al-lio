// Source/pure-helper test rationale: issue #379 retires production-reachable
// demo identities. The database command is destructive only behind explicit
// operator guards; these tests exercise its identity and authorization logic
// without connecting to any database (taxonomy options 2 and 5).

import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKUP_CONFIRMATION,
  CLEANUP_CONFIRMATION,
  LEGACY_DEMO_USERS,
  classifyLegacyDemoRows,
  validateCleanupRequest,
} from "../../../scripts/postgres/remove-legacy-demo-users.mjs";

test("issue #379: legacy demo cleanup defaults to audit-only", () => {
  assert.deepEqual(validateCleanupRequest({ execute: false }), { execute: false });
});

test("issue #379: deletion requires an administrative URL and both confirmations", () => {
  assert.throws(
    () => validateCleanupRequest({ execute: true }),
    /DATABASE_MIGRATION_URL/,
  );
  assert.throws(
    () => validateCleanupRequest({ execute: true, migrationUrl: "postgresql://example" }),
    /BACKUP_VERIFIED/,
  );
  assert.throws(
    () => validateCleanupRequest({
      execute: true,
      migrationUrl: "postgresql://example",
      backupConfirmation: BACKUP_CONFIRMATION,
    }),
    /DELETE_FIVE_LEGACY_DEMO_USERS/,
  );
  assert.deepEqual(
    validateCleanupRequest({
      execute: true,
      migrationUrl: "postgresql://example",
      backupConfirmation: BACKUP_CONFIRMATION,
      cleanupConfirmation: CLEANUP_CONFIRMATION,
    }),
    { execute: true },
  );
});

test("issue #379: the cleanup owns exactly the five retired UUID/email pairs", () => {
  assert.equal(LEGACY_DEMO_USERS.length, 5);
  assert.equal(new Set(LEGACY_DEMO_USERS.map((user) => user.id)).size, 5);
  assert.equal(new Set(LEGACY_DEMO_USERS.map((user) => user.email)).size, 5);

  const findings = classifyLegacyDemoRows([
    { ...LEGACY_DEMO_USERS[0] },
    { ...LEGACY_DEMO_USERS[3] },
  ]);
  assert.deepEqual(findings.map((finding) => finding.status), [
    "present",
    "absent",
    "absent",
    "present",
    "absent",
  ]);
});

test("issue #379: an ID or email reuse fails closed", () => {
  assert.throws(
    () => classifyLegacyDemoRows([
      { id: LEGACY_DEMO_USERS[0].id, email: "real-person@al-lio.app" },
    ]),
    /Unsafe identity mismatch/,
  );
  assert.throws(
    () => classifyLegacyDemoRows([
      { id: "20000000-0000-0000-0000-000000000001", email: LEGACY_DEMO_USERS[0].email },
    ]),
    /Unsafe identity mismatch/,
  );
});
