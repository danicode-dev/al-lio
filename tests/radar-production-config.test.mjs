import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const composeUrl = new URL("../infra/docker-compose.prod.yml", import.meta.url);
const productionEnvUrl = new URL("../.env.production.example", import.meta.url);
const runbookUrl = new URL("../docs/operations/OPENWEBINARS_NEWS_PILOT.md", import.meta.url);

test("production Compose passes the reviewed Radar controls with dormant defaults", async () => {
  const compose = await readFile(composeUrl, "utf8");
  const radar = compose.split("  al_lio_radar:")[1]?.split("  al_lio_migrator:")[0] ?? "";

  const expected = [
    "AL_LIO_DELIVERY_SCHEMA_VERSION: ${AL_LIO_RADAR_DELIVERY_SCHEMA_VERSION:-3}",
    "AUTONOMOUS_PUBLICATION_ENABLED: ${AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_ENABLED:-false}",
    "AUTONOMOUS_PUBLICATION_DESTINATIONS: ${AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_DESTINATIONS:-news}",
    "AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON: ${AL_LIO_RADAR_AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON:-}",
    "DAILY_PUBLICATION_TIMEZONE: ${AL_LIO_RADAR_DAILY_PUBLICATION_TIMEZONE:-Europe/Madrid}",
    "DAILY_PUBLICATION_TIME: ${AL_LIO_RADAR_DAILY_PUBLICATION_TIME:-09:00}",
    "WEB_DISCOVERY_ENABLED: ${AL_LIO_RADAR_WEB_DISCOVERY_ENABLED:-false}",
    "LEARNING_DISCOVERY_ENABLED: ${AL_LIO_RADAR_LEARNING_DISCOVERY_ENABLED:-false}",
    "YOUTUBE_WATCH_ENABLED: ${AL_LIO_RADAR_YOUTUBE_WATCH_ENABLED:-false}",
    "LEARNING_DELIVERY_ENABLED: ${AL_LIO_RADAR_LEARNING_DELIVERY_ENABLED:-false}",
    "YOUTUBE_API_KEY: ${AL_LIO_RADAR_YOUTUBE_API_KEY:-}",
    "JOB_RADAR_ENABLED: ${AL_LIO_RADAR_JOB_RADAR_ENABLED:-false}",
  ];

  for (const mapping of expected) assert.match(radar, new RegExp(mapping.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(radar, /OPENAI_API_KEY/);
});

test("production examples remain dormant when the new variables are copied", async () => {
  const env = await readFile(productionEnvUrl, "utf8");

  assert.match(env, /^AL_LIO_RADAR_V4_PROJECT_DESTINATIONS=$/m);
  assert.match(env, /^AL_LIO_RADAR_DELIVERY_SCHEMA_VERSION=3$/m);
  assert.match(env, /^AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_ENABLED=false$/m);
  assert.match(env, /^AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_DESTINATIONS=news$/m);
  assert.match(env, /^AL_LIO_RADAR_AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON=\{\}$/m);
  for (const flag of ["WEB_DISCOVERY", "LEARNING_DISCOVERY", "YOUTUBE_WATCH", "LEARNING_DELIVERY", "JOB_RADAR"]) {
    assert.match(env, new RegExp(`^AL_LIO_RADAR_${flag}_ENABLED=false$`, "m"));
  }
  assert.match(env, /^AL_LIO_RADAR_YOUTUBE_API_KEY=$/m);
});

test("the activation runbook authorizes only OpenWebinars for DAW and DAM", async () => {
  const runbook = await readFile(runbookUrl, "utf8");
  const approvedMatrix = "AL_LIO_RADAR_AUTONOMOUS_NEWS_SOURCE_CYCLE_MATRIX_JSON={\"openwebinars-blog\":[\"DAW\",\"DAM\"]}";

  assert.match(runbook, new RegExp(approvedMatrix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(runbook, /AL_LIO_RADAR_V4_PROJECT_DESTINATIONS=news/);
  assert.match(runbook, /AL_LIO_RADAR_DELIVERY_SCHEMA_VERSION=4/);
  assert.match(runbook, /AL_LIO_RADAR_AUTONOMOUS_PUBLICATION_ENABLED=true/);
  assert.match(runbook, /three normal 09:00 windows are observation evidence, not a gate/);
  assert.doesNotMatch(runbook, /AUTONOMOUS_PUBLICATION_DESTINATIONS=news,(?:course|event|job)/);
});
