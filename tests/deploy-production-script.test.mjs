import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const deployScriptUrl = new URL("../scripts/deploy-production.sh", import.meta.url);
const guideUrl = new URL("../docs/operations/AUTONOMOUS_PRODUCTION_DEPLOY.md", import.meta.url);
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
  assert.match(source, /migration_file_count="\$\(find "\$release_dir\/infra\/postgres\/migrations"/);
  assert.match(source, /expected_migration_count="\$\(\(migration_file_count \+ 1\)\)"/, "the recorded 0001 baseline must be counted in addition to files from migrations/ (which start at 0002)");
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

test("the Radar backup remains private and readable by the deploy user", async () => {
  const source = await readFile(deployScriptUrl, "utf8");

  assert.match(source, /-e BACKUP_UID="\$\(id -u\)"/);
  assert.match(source, /-e BACKUP_GID="\$\(id -g\)"/);
  assert.match(source, /chown "\$BACKUP_UID:\$BACKUP_GID"/);
  assert.match(source, /chmod 600 "\/backup\/\$BACKUP_FILE"/);
});

test("the command permits only reviewed additive service environment passthroughs in Compose", async () => {
  const source = await readFile(deployScriptUrl, "utf8");

  assert.match(source, /validate_compose_env_additions/);
  assert.match(source, /GOOGLE_IDENTITY_REDIRECT_URI/);
  assert.match(source, /RESEND_API_KEY/);
  assert.match(source, /RESEND_FROM_EMAIL/);
  assert.ok(source.includes(
    "'+      AL_LIO_RADAR_V4_PROJECT_DESTINATIONS: ${AL_LIO_RADAR_V4_PROJECT_DESTINATIONS:-}') service=\"al_lio_web\"; key=\"AL_LIO_RADAR_V4_PROJECT_DESTINATIONS\" ;;",
  ));
  assert.ok(source.includes(
    "'+      AL_LIO_VERIFIED_OPPORTUNITIES_ONLY: ${AL_LIO_VERIFIED_OPPORTUNITIES_ONLY:-false}') service=\"al_lio_web\"; key=\"AL_LIO_VERIFIED_OPPORTUNITIES_ONLY\" ;;",
  ));
  assert.ok(source.includes(
    "'+      AL_LIO_RADAR_LEARNING_INGEST_ENABLED: ${AL_LIO_RADAR_LEARNING_INGEST_ENABLED:-false}') service=\"al_lio_web\"; key=\"AL_LIO_RADAR_LEARNING_INGEST_ENABLED\" ;;",
  ));
  assert.ok(source.includes(
    "'+      AUTONOMOUS_PUBLICATION_ENABLED: ${AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_ENABLED:-false}') service=\"al_lio_radar\"; key=\"AUTONOMOUS_PUBLICATION_ENABLED\" ;;",
  ));
  assert.ok(source.includes(
    "'+      AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON: ${AL_LIO_RADAR_AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON:-}') service=\"al_lio_radar\"; key=\"AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON\" ;;",
  ));
  assert.ok(source.includes(
    "'+      LEARNING_DELIVERY_ENABLED: ${AL_LIO_RADAR_LEARNING_DELIVERY_ENABLED:-false}') service=\"al_lio_radar\"; key=\"LEARNING_DELIVERY_ENABLED\" ;;",
  ));
  assert.ok(source.includes(
    "'+      YOUTUBE_API_KEY: ${AL_LIO_RADAR_YOUTUBE_API_KEY:-}') service=\"al_lio_radar\"; key=\"YOUTUBE_API_KEY\" ;;",
  ));
  assert.match(source, /target_radar_environment/);
  assert.match(source, /allowed_compose_env_lines/);
  assert.match(source, /awk '!\/\^--- \/ && !\/\^\\\+\\\+\\\+ \/ && \/\^\[\+-\]\//);
  assert.match(source, /\*\) return 1 ;;/);
  assert.match(source, /match_count.*-eq 1/);
  assert.match(source, /Docker Compose changed outside the allowlisted service environment passthroughs/);
  assert.doesNotMatch(
    source,
    /blocked_runtime_changes=.*infra\/docker-compose\.prod\.yml/s,
  );
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
