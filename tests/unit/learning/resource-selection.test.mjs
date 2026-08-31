// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.

import assert from "node:assert/strict";

import test from "node:test";

import { isSafeHttpUrl, selectAptitudeVideos } from "../../../src/lib/fp/event-cta.ts";

function mockLearningItem(overrides = {}) {
  return {
    id: "li-1",
    id_slug: "li-1-slug",
    title: "Recurso",
    type: "curso_basico",
    source_url: "https://example.com/recurso",
    video_url: null,
    internal_learning_slug: null,
    tipo_relacion: "ensena",
    ...overrides,
  };
}

test("isSafeHttpUrl accepts only absolute http(s) URLs, rejecting javascript:/data:/relative/malformed values (issue #112)", () => {
  assert.equal(isSafeHttpUrl("https://youtube.com/watch?v=x"), true);
  assert.equal(isSafeHttpUrl("http://example.com"), true);
  for (const bad of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "/relative/path",
    "not a url",
    "ftp://example.com",
    "",
    null,
    undefined,
  ]) {
    assert.equal(isSafeHttpUrl(bad), false, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test("selectAptitudeVideos returns every safely-linked video resource, never just one arbitrary pick (issue #112)", () => {
  assert.deepEqual(selectAptitudeVideos([]), []);
  assert.deepEqual(selectAptitudeVideos([mockLearningItem({ id_slug: "a" }), mockLearningItem({ id_slug: "b" })]), [], "no video_url anywhere - nothing to show");

  const videoA = mockLearningItem({ id: "a-id", id_slug: "a", title: "Curso A", video_url: "https://youtube.com/watch?v=a" });
  const videoB = mockLearningItem({ id: "b-id", id_slug: "b", title: "Curso B", video_url: "https://youtube.com/watch?v=b" });
  const noVideo = mockLearningItem({ id: "c-id", id_slug: "c" });
  const result = selectAptitudeVideos([noVideo, videoB, videoA]);
  assert.equal(result.length, 2, "both real video candidates must be returned - not one chosen over the other");
  assert.deepEqual(result.map((r) => r.id_slug), ["a", "b"], "stable id_slug order for reproducible rendering, not array-position order");
});

test("selectAptitudeVideos never treats an unsafe video_url as a real candidate (issue #112)", () => {
  const unsafe = mockLearningItem({ video_url: "javascript:alert(1)" });
  const mixed = mockLearningItem({ id: "safe-id", id_slug: "safe", video_url: "https://youtube.com/watch?v=safe" });
  assert.deepEqual(selectAptitudeVideos([unsafe]), []);
  assert.deepEqual(selectAptitudeVideos([unsafe, mixed]).map((r) => r.id_slug), ["safe"]);
});
