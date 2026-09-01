import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  APPROVED_APP_ENV_KEYS,
  OS_PASSTHROUGH_KEYS,
  assertNoIntegrationSecrets,
  buildE2eAppEnv,
  dotEnvDeclaredKeys,
  parseDotEnvKeys,
} from "../../../scripts/e2e/app-env.mjs";

// Proves that the E2E `next dev` process cannot receive developer or
// production configuration: not from the parent shell (only an OS passthrough
// list is copied) and not from `.env` / `.env.local` (every non-approved key
// is pinned empty and `@next/env` processing is disabled).

const SYNTHETIC = Object.freeze({
  NODE_ENV: "development",
  PORT: "3210",
  HOSTNAME: "127.0.0.1",
  DATABASE_URL: "postgresql://al_lio_e2e:al_lio_e2e@127.0.0.1:54339/al_lio_e2e",
  SESSION_SECRET: "e2e-secret-0123456789abcdef0123456789abcdef",
  BASE_URL: "http://127.0.0.1:3210",
  AL_LIO_DEMO_ACCESS_ENABLED: "false",
});

// A parent shell carrying real developer/production secrets.
const HOSTILE_PARENT = Object.freeze({
  PATH: process.env.PATH ?? "/usr/bin",
  SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
  DATABASE_URL: "postgresql://al_lio:prod-password@db.al-lio.app:5432/al_lio",
  DATABASE_MIGRATION_URL: "postgresql://al_lio_migrator:prod@db.al-lio.app:5432/al_lio",
  SESSION_SECRET: "the-real-production-session-secret-value",
  GOOGLE_CLIENT_ID: "real-google-client-id",
  GOOGLE_CLIENT_SECRET: "real-google-client-secret",
  GOOGLE_TOKEN_ENCRYPTION_KEY: "real-google-encryption-key",
  NEXTAUTH_SECRET: "real-nextauth-secret",
  RESEND_API_KEY: "re_live_realkey",
  RESEND_FROM_EMAIL: "hola@al-lio.app",
  AL_LIO_RADAR_WEBHOOK_SECRET: "real-radar-webhook-secret",
  SUPABASE_SERVICE_ROLE_KEY: "real-supabase-service-role",
  SUPABASE_DB_URL: "postgresql://postgres:real@db.supabase.co:5432/postgres",
  INFOJOBS_CLIENT_SECRET: "real-infojobs-secret",
  ADZUNA_APP_KEY: "real-adzuna-key",
  JOOBLE_API_KEY: "real-jooble-key",
  AL_LIO_SEED_DEMO_CONFIRMATION: "SEED_FP_DEMO_USERS",
  AL_LIO_DEMO_PASSWORD: "real-demo-password",
  TARGET_USER_EMAIL: "owner@al-lio.app",
  PUBLIC_ASSET_BASE_URL: "https://al-lio.app",
});

function makeProjectRoot() {
  const root = mkdtempSync(join(tmpdir(), "al-lio-e2e-env-"));
  writeFileSync(
    join(root, ".env"),
    "DATABASE_URL=postgresql://al_lio:change-me@localhost:5432/al_lio\nSESSION_SECRET=\nAL_LIO_RADAR_WEBHOOK_SECRET=\nGOOGLE_CLIENT_ID=\n",
    "utf8",
  );
  writeFileSync(
    join(root, ".env.local"),
    "\uFEFFSUPABASE_SERVICE_ROLE_KEY=local-supabase\nINFOJOBS_CLIENT_SECRET=local-infojobs\nGOOGLE_CLIENT_SECRET=local-google\nexport ADZUNA_APP_KEY=local-adzuna\n",
    "utf8",
  );
  return root;
}

function withProjectRoot(work) {
  const root = makeProjectRoot();
  try {
    return work(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("parseDotEnvKeys reads key names, ignoring comments, blanks, BOM and export", () => {
  const keys = parseDotEnvKeys("\uFEFF# comment\n\nexport FOO=1\nBAR = 2\n#BAZ=3\nQUX=\n");
  assert.deepEqual([...keys].sort(), ["BAR", "FOO", "QUX"]);
});

test("dotEnvDeclaredKeys unions every declared key across .env files", () => {
  withProjectRoot((root) => {
    const declared = dotEnvDeclaredKeys(root);
    for (const key of [
      "DATABASE_URL",
      "SESSION_SECRET",
      "AL_LIO_RADAR_WEBHOOK_SECRET",
      "GOOGLE_CLIENT_ID",
      "SUPABASE_SERVICE_ROLE_KEY",
      "INFOJOBS_CLIENT_SECRET",
      "GOOGLE_CLIENT_SECRET",
      "ADZUNA_APP_KEY",
    ]) {
      assert.ok(declared.has(key), `expected ${key} to be discovered`);
    }
  });
});

test("the built app env contains only OS passthrough, approved keys, and empty pins", () => {
  withProjectRoot((root) => {
    const env = buildE2eAppEnv({ source: HOSTILE_PARENT, projectRoot: root, overrides: { ...SYNTHETIC } });

    const allowed = new Set([...APPROVED_APP_ENV_KEYS, ...OS_PASSTHROUGH_KEYS]);
    for (const [key, value] of Object.entries(env)) {
      if (allowed.has(key)) continue;
      assert.equal(value, "", `non-approved key ${key} must be pinned empty, got ${JSON.stringify(value)}`);
    }
  });
});

test("synthetic config wins over the hostile parent", () => {
  withProjectRoot((root) => {
    const env = buildE2eAppEnv({ source: HOSTILE_PARENT, projectRoot: root, overrides: { ...SYNTHETIC } });

    assert.equal(env.DATABASE_URL, SYNTHETIC.DATABASE_URL);
    assert.equal(env.SESSION_SECRET, SYNTHETIC.SESSION_SECRET);
    assert.equal(env.BASE_URL, SYNTHETIC.BASE_URL);
    assert.equal(env.AL_LIO_DEMO_ACCESS_ENABLED, "false");
    assert.equal(env.__NEXT_PROCESSED_ENV, "true", "dotenv processing is disabled as a second layer");
  });
});

test("no database, session, Google, Resend, OAuth, Radar, Supabase or import secret leaks in", () => {
  withProjectRoot((root) => {
    const env = buildE2eAppEnv({ source: HOSTILE_PARENT, projectRoot: root, overrides: { ...SYNTHETIC } });

    // Parent-only secrets are not copied at all.
    for (const key of ["RESEND_API_KEY", "GOOGLE_CLIENT_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "NEXTAUTH_SECRET", "JOOBLE_API_KEY"]) {
      const value = env[key];
      assert.ok(value === undefined || value === "", `${key} must not carry a value (got ${JSON.stringify(value)})`);
    }
    // Secrets declared in .env / .env.local are pinned empty, never the real value.
    for (const key of ["AL_LIO_RADAR_WEBHOOK_SECRET", "INFOJOBS_CLIENT_SECRET", "ADZUNA_APP_KEY", "GOOGLE_CLIENT_ID"]) {
      assert.equal(env[key], "", `${key} from a dotenv file must be pinned empty`);
    }
    // The real production DATABASE_URL never survives.
    assert.ok(!String(env.DATABASE_URL).includes("al-lio.app"));
    assert.ok(!String(env.DATABASE_MIGRATION_URL ?? "").includes("al-lio.app"));

    assert.doesNotThrow(() => assertNoIntegrationSecrets(env));
  });
});

test("assertNoIntegrationSecrets fails closed when a secret is still present", () => {
  const leaked = { ...SYNTHETIC, GOOGLE_CLIENT_SECRET: "leaked-value" };
  assert.throws(() => assertNoIntegrationSecrets(leaked), /integration secret/i);
});

const HOSTILE_OVERRIDES = [
  ["al-lio.app in DATABASE_URL", { DATABASE_URL: "postgresql://al_lio_e2e:x@db.al-lio.app:5432/al_lio_e2e" }],
  ["non-loopback DATABASE_URL host", { DATABASE_URL: "postgresql://al_lio_e2e:x@10.0.0.5:5432/al_lio_e2e" }],
  ["DATABASE_URL database without the e2e marker", { DATABASE_URL: "postgresql://al_lio_e2e:x@127.0.0.1:5432/al_lio" }],
  ["DATABASE_URL user without the e2e marker", { DATABASE_URL: "postgresql://al_lio:x@127.0.0.1:5432/al_lio_e2e" }],
  ["DATABASE_URL that is not postgres", { DATABASE_URL: "mysql://al_lio_e2e:x@127.0.0.1:3306/al_lio_e2e" }],
  ["non-loopback BASE_URL host", { BASE_URL: "http://10.0.0.5:3210" }],
  ["reserved review-server port in BASE_URL", { BASE_URL: "http://127.0.0.1:3200" }],
  ["al-lio.app in BASE_URL", { BASE_URL: "https://al-lio.app" }],
  ["a too-short SESSION_SECRET", { SESSION_SECRET: "short" }],
  ["NODE_ENV=production", { NODE_ENV: "production" }],
  ["an unapproved override key", { RESEND_API_KEY: "re_live_x" }],
];

for (const [name, patch] of HOSTILE_OVERRIDES) {
  test(`buildE2eAppEnv refuses to run with ${name}`, () => {
    withProjectRoot((root) => {
      assert.throws(
        () => buildE2eAppEnv({ source: HOSTILE_PARENT, projectRoot: root, overrides: { ...SYNTHETIC, ...patch } }),
        /e2e-app-guard/,
      );
    });
  });
}
