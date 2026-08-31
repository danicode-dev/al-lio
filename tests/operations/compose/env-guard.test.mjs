import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const helperPath = fileURLToPath(new URL("../../../scripts/lib/compose-env-guard.sh", import.meta.url));
const bashPath = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";

const baseCompose = `services:
  al_lio_web:
    image: al-lio-web:\${AL_LIO_IMAGE_TAG:-local}
    environment:
      NODE_ENV: production
      AL_LIO_EXISTING_FLAG: \${AL_LIO_EXISTING_FLAG:-false}
  al_lio_radar:
    image: al-lio-radar:\${AL_LIO_RADAR_IMAGE_TAG:-local}
    environment:
      NODE_ENV: production
      WEB_DISCOVERY_ENABLED: \${AL_LIO_RADAR_WEB_DISCOVERY_ENABLED:-false}
`;

async function git(directory, ...args) {
  const { stdout } = await execFileAsync("git", args, { cwd: directory });
  return stdout.trim();
}

async function createFixture(targetCompose) {
  const root = await mkdtemp(join(tmpdir(), "al-lio-compose-guard-"));
  const composePath = join(root, "infra", "docker-compose.prod.yml");
  await mkdir(dirname(composePath), { recursive: true });
  await git(root, "init", "--quiet");
  await git(root, "config", "user.email", "tests@al-lio.invalid");
  await git(root, "config", "user.name", "AL-LIO tests");
  await writeFile(composePath, baseCompose, "utf8");
  await git(root, "add", "infra/docker-compose.prod.yml");
  await git(root, "commit", "--quiet", "-m", "base");
  const currentSha = await git(root, "rev-parse", "HEAD");

  await writeFile(composePath, targetCompose, "utf8");
  await git(root, "add", "infra/docker-compose.prod.yml");
  await git(root, "commit", "--quiet", "--allow-empty", "-m", "target");
  const releaseSha = await git(root, "rev-parse", "HEAD");
  return { root, currentSha, releaseSha };
}

async function runGuard(fixture) {
  const bash = `
set -Eeuo pipefail
repository_dir="$1"
current_sha="$2"
release_sha="$3"
COMPOSE_FILE="infra/docker-compose.prod.yml"
allowed_compose_env_mappings=()
allowed_compose_env_lines=()
source "$4"
if validate_compose_env_additions; then
  printf '%s\\n' "\${allowed_compose_env_mappings[@]}"
  exit 0
fi
exit 1
`;
  return execFileAsync(
    bashPath,
    ["-c", bash, "compose-guard", fixture.root.replaceAll("\\", "/"), fixture.currentSha, fixture.releaseSha, helperPath.replaceAll("\\", "/")],
  );
}

async function expectAccepted(targetCompose, expectedMappings) {
  const fixture = await createFixture(targetCompose);
  try {
    const { stdout } = await runGuard(fixture);
    assert.deepEqual(stdout.trim().split(/\r?\n/).filter(Boolean), expectedMappings);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

async function expectRejected(targetCompose) {
  const fixture = await createFixture(targetCompose);
  try {
    await assert.rejects(runGuard(fixture));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

test("accepts future namespaced web and Radar passthroughs without an exact line allowlist", async () => {
  const target = baseCompose
    .replace(
      "      AL_LIO_EXISTING_FLAG: ${AL_LIO_EXISTING_FLAG:-false}",
      "      AL_LIO_EXISTING_FLAG: ${AL_LIO_EXISTING_FLAG:-false}\n      AL_LIO_FUTURE_FLAG: ${AL_LIO_FUTURE_FLAG:-false}",
    )
    .replace(
      "      WEB_DISCOVERY_ENABLED: ${AL_LIO_RADAR_WEB_DISCOVERY_ENABLED:-false}",
      "      WEB_DISCOVERY_ENABLED: ${AL_LIO_RADAR_WEB_DISCOVERY_ENABLED:-false}\n      DISCOVERY_CADENCE_MINUTES: ${AL_LIO_RADAR_DISCOVERY_CADENCE_MINUTES:-240}",
    );

  await expectAccepted(target, ["al_lio_web:AL_LIO_FUTURE_FLAG", "al_lio_radar:DISCOVERY_CADENCE_MINUTES"]);
});

test("accepts the learning environment additions that triggered the 58a76e9 bootstrap incident", async () => {
  const target = baseCompose.replace(
    "      WEB_DISCOVERY_ENABLED: ${AL_LIO_RADAR_WEB_DISCOVERY_ENABLED:-false}",
    [
      "      WEB_DISCOVERY_ENABLED: ${AL_LIO_RADAR_WEB_DISCOVERY_ENABLED:-false}",
      "      LEARNING_DELIVERY_ENABLED: ${AL_LIO_RADAR_LEARNING_DELIVERY_ENABLED:-false}",
      "      YOUTUBE_API_KEY: ${AL_LIO_RADAR_YOUTUBE_API_KEY:-}",
    ].join("\n"),
  );

  await expectAccepted(target, ["al_lio_radar:LEARNING_DELIVERY_ENABLED", "al_lio_radar:YOUTUBE_API_KEY"]);
});

test("rejects unsafe namespaces, source variables and defaults", async () => {
  const variants = [
    "      NODE_OPTIONS: ${AL_LIO_RADAR_NODE_OPTIONS:---inspect}",
    "      DISCOVERY_CADENCE_MINUTES: ${UNSCOPED_DISCOVERY_CADENCE_MINUTES:-240}",
    "      DISCOVERY_CADENCE_MINUTES: ${AL_LIO_RADAR_DISCOVERY_CADENCE_MINUTES:-$(id)}",
  ];

  for (const mapping of variants) {
    const target = baseCompose.replace(
      "      WEB_DISCOVERY_ENABLED: ${AL_LIO_RADAR_WEB_DISCOVERY_ENABLED:-false}",
      "      WEB_DISCOVERY_ENABLED: ${AL_LIO_RADAR_WEB_DISCOVERY_ENABLED:-false}\n" + mapping,
    );
    await expectRejected(target);
  }
});

test("rejects duplicate, modified and removed environment mappings", async () => {
  await expectRejected(baseCompose.replace(
    "      AL_LIO_EXISTING_FLAG: ${AL_LIO_EXISTING_FLAG:-false}",
    "      AL_LIO_EXISTING_FLAG: ${AL_LIO_EXISTING_FLAG:-false}\n      AL_LIO_EXISTING_FLAG: ${AL_LIO_EXISTING_FLAG:-false}",
  ));
  await expectRejected(baseCompose.replace("      NODE_ENV: production", "      NODE_ENV: development"));
  await expectRejected(baseCompose.replace("      AL_LIO_EXISTING_FLAG: ${AL_LIO_EXISTING_FLAG:-false}\n", ""));
});

test("rejects valid-looking mappings outside the approved service environment blocks", async () => {
  await expectRejected(baseCompose + "  unrelated_service:\n    environment:\n      AL_LIO_FUTURE_FLAG: ${AL_LIO_FUTURE_FLAG:-false}\n");
});

test("rejects every material Compose change", async () => {
  const variants = [
    baseCompose.replace("    image: al-lio-web:${AL_LIO_IMAGE_TAG:-local}", "    image: al-lio-web:unexpected"),
    baseCompose.replace("    environment:\n      NODE_ENV: production", "    ports:\n      - \"3000:3000\"\n    environment:\n      NODE_ENV: production"),
    baseCompose.replace("    environment:\n      NODE_ENV: production", "    volumes:\n      - data:/app/data\n    environment:\n      NODE_ENV: production"),
    baseCompose.replace("    environment:\n      NODE_ENV: production", "    command: [\"sh\", \"-c\", \"id\"]\n    environment:\n      NODE_ENV: production"),
  ];

  for (const target of variants) await expectRejected(target);
});
