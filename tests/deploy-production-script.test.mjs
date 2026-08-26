import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const deployScriptUrl = new URL("../scripts/deploy-production.sh", import.meta.url);
const guideUrl = new URL("../docs/AUTONOMOUS_PRODUCTION_DEPLOY.md", import.meta.url);
const dockerfileUrl = new URL("../infra/Dockerfile", import.meta.url);

test("the production deploy command pins a reviewed forward-only main commit", async () => {
  const source = await readFile(deployScriptUrl, "utf8");

  assert.match(source, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(source, /merge-base --is-ancestor "\$release_sha" origin\/main/);
  assert.match(source, /merge-base --is-ancestor "\$current_sha" "\$release_sha"/);
  assert.match(source, /worktree add --detach "\$release_dir" "\$release_sha"/);
  assert.match(source, /flock -n 9/);
});

test("the command protects state before applying pending migrations", async () => {
  const source = await readFile(deployScriptUrl, "utf8");
  const backupIndex = source.indexOf("backup-production.sh");
  const restoreIndex = source.indexOf("verify-backup-production.sh");
  const rehearsalIndex = source.indexOf("Rehearsing all pending migrations");
  const productionMigrationIndex = source.indexOf("Applying rehearsed migrations to production");

  assert.ok(backupIndex > -1);
  assert.ok(restoreIndex > backupIndex);
  assert.ok(rehearsalIndex > restoreIndex);
  assert.ok(productionMigrationIndex > rehearsalIndex);
  assert.match(source, /al_lio_rehearsal_/);
  assert.match(source, /schema_migrations/);
});

test("the command replaces only web and preserves automatic recovery", async () => {
  const source = await readFile(deployScriptUrl, "utf8");

  assert.match(source, /up -d --no-deps al_lio_web/);
  assert.match(source, /rollback_web/);
  assert.match(source, /previous_release_dir/);
  assert.match(source, /postgres_container_preserved=true/);
  assert.match(source, /radar_container_preserved=true/);
  assert.doesNotMatch(source, /docker compose[^\n]*down/);
  assert.doesNotMatch(source, /docker volume rm/);
  assert.doesNotMatch(source, /git reset --hard/);
});

test("release worktrees and public assets remain readable by the runtime user", async () => {
  const source = await readFile(deployScriptUrl, "utf8");
  const dockerfile = await readFile(dockerfileUrl, "utf8");

  assert.match(source, /umask 022\s+git -C "\$repository_dir" worktree add/);
  assert.match(dockerfile, /COPY --from=builder --chown=nextjs:nodejs \/app\/public \.\/public/);
});

test("the owner guide documents the complete low-touch workflow", async () => {
  const guide = await readFile(guideUrl, "utf8");

  assert.match(guide, /git rev-parse HEAD/);
  assert.match(guide, /Merge pull request/);
  assert.match(guide, /merge commit/);
  assert.match(guide, /ssh al-lio-vps/);
  assert.match(guide, /\.\/scripts\/deploy-production\.sh <SHA>/);
  assert.match(guide, /DEPLOY 9517e115314/);
  assert.match(guide, /health/i);
  assert.match(guide, /rollback/i);
});
