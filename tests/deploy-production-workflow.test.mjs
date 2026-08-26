import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL("../.github/workflows/deploy-production.yml", import.meta.url);
const entrypointUrl = new URL("../scripts/github-actions-deploy-entrypoint.sh", import.meta.url);

test("production deployment waits for successful post-merge CI", async () => {
  const workflow = await readFile(workflowUrl, "utf8");

  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows: \[CI\]/);
  assert.match(workflow, /types: \[completed\]/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /workflow_run\.event == 'push'/);
  assert.match(workflow, /workflow_run\.head_branch == 'main'/);
  assert.match(workflow, /workflow_run\.head_repository\.full_name == github\.repository/);
});

test("production deployment uses an immutable guarded SHA", async () => {
  const workflow = await readFile(workflowUrl, "utf8");

  assert.match(workflow, /workflow_run\.head_sha/);
  assert.match(workflow, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(workflow, /"deploy \$RELEASE_SHA"/);
  assert.doesNotMatch(workflow, /:\s*latest\b/);
  assert.doesNotMatch(workflow, /git pull/);
});

test("production deployment is serialized and keeps SSH host verification", async () => {
  const workflow = await readFile(workflowUrl, "utf8");

  assert.match(workflow, /group: al-lio-production/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /environment:\s+name: Production/);
  assert.match(workflow, /vars\.PRODUCTION_AUTO_DEPLOY_ENABLED == 'true'/);
  assert.match(workflow, /StrictHostKeyChecking=yes/);
  assert.match(workflow, /PRODUCTION_SSH_KNOWN_HOSTS/);
  assert.doesNotMatch(workflow, /StrictHostKeyChecking=no/);
  assert.doesNotMatch(workflow, /ssh-keyscan/);
});

test("production deployment keeps a deliberate manual fallback", async () => {
  const workflow = await readFile(workflowUrl, "utf8");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /release_sha:/);
  assert.match(workflow, /required: true/);
  assert.match(workflow, /inputs\.release_sha/);
});

test("the forced SSH command exposes only the guarded deployment operation", async () => {
  const entrypoint = await readFile(entrypointUrl, "utf8");

  assert.match(entrypoint, /SSH_ORIGINAL_COMMAND/);
  assert.match(entrypoint, /\^deploy\[\[:space:\]\]\(\[0-9a-f\]\{40\}\)\$/);
  assert.match(entrypoint, /AL_LIO_DEPLOY_CONFIRMATION="\$release_sha"/);
  assert.match(entrypoint, /\.\/scripts\/deploy-production\.sh "\$release_sha"/);
  assert.match(entrypoint, /"\$releases_dir"\/al-lio-\*/);
  assert.doesNotMatch(entrypoint, /\beval\b/);
});
