// Source-level assertion rationale: issue #379 removes a production-reachable
// authentication shortcut and permanent synthetic identities. The protected
// risk is repository drift that silently restores those paths; file and source
// inspection is the executable boundary (taxonomy options 5 and 6).

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";

const root = process.cwd();

function walkSource(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walkSource(full));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

test("issue #379: legacy demo routes, login helpers and seed commands stay retired", () => {
  for (const path of [
    "src/app/api/seed/route.ts",
    "src/components/auth/demo-profile-picker.tsx",
    "src/lib/auth/demo-access.ts",
    "src/lib/auth/demo-login.ts",
    "src/lib/auth/demo-profiles.ts",
    "scripts/seed-fp-demo-users.mjs",
  ]) {
    assert.equal(existsSync(join(root, path)), false, `${path} must stay retired`);
  }

  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["seed:fp-demo-users"], undefined);
});

test("issue #379: application and production configuration cannot restore demo access", () => {
  const files = [
    ...walkSource(join(root, "src")),
    join(root, ".env.example"),
    join(root, ".env.production.example"),
    join(root, "infra/docker-compose.prod.yml"),
  ];
  const forbidden = [
    "AL_LIO_DEMO_ACCESS_ENABLED",
    "loginAsDemoAction",
    "DEMO_PROFILES",
    "seedDemoData",
    "/api/seed",
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const marker of forbidden) {
      assert.equal(
        source.includes(marker),
        false,
        `${relative(root, file).split(sep).join("/")} restores retired marker ${marker}`,
      );
    }
  }
});

test("issue #379: supported synthetic users remain confined to isolated test fixtures", () => {
  const sandbox = readFileSync(join(root, "infra/postgres/fixtures/minimal-sandbox-seed.sql"), "utf8");
  const e2e = readFileSync(join(root, "tests/e2e/support/fixtures.ts"), "utf8");

  assert.match(sandbox, /@example\.test/);
  assert.match(e2e, /@al-lio\.test/);
  assert.doesNotMatch(sandbox, /demo\.(dev|af|dam|tsaf|mp)@al-lio\.test/);
  assert.doesNotMatch(e2e, /demo\.(dev|af|dam|tsaf|mp)@al-lio\.test/);
});
