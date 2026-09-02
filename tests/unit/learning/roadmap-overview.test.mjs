// Executable coverage for the pure roadmap-overview aggregation split from
// getLearningOverview in issue #368.

import assert from "node:assert/strict";
import test from "node:test";

import { buildRoadmapOverview } from "../../../src/features/learning/domain/roadmap-overview.ts";

const competency = (over = {}) => ({
  id: "s1",
  slug: "modulo-1",
  title: "Módulo 1",
  completed_count: 0,
  resource_count: 0,
  next_resource_slug: null,
  ...over,
});

test("buildRoadmapOverview reports an empty cycle with no next step and no focus modules", () => {
  const overview = buildRoadmapOverview([], "Desarrollo de Aplicaciones Web", "DAW");
  assert.equal(overview.cycleName, "Desarrollo de Aplicaciones Web");
  assert.equal(overview.cycleCode, "DAW");
  assert.deepEqual(overview.completion, { completed: 0, total: 0, percent: 0 });
  assert.equal(overview.nextStep, null);
  assert.deepEqual(overview.focusModules, []);
});

test("buildRoadmapOverview sums completion and rounds the percent", () => {
  const overview = buildRoadmapOverview(
    [
      competency({ id: "a", slug: "a", completed_count: 2, resource_count: 3 }),
      competency({ id: "b", slug: "b", completed_count: 1, resource_count: 4 }),
    ],
    "Cycle",
    "C",
  );
  assert.deepEqual(overview.completion, { completed: 3, total: 7, percent: 43 });
});

test("buildRoadmapOverview points the next step at the first incomplete module and picks the right href", () => {
  const withNextResource = buildRoadmapOverview(
    [
      competency({ id: "done", slug: "done", completed_count: 2, resource_count: 2 }),
      competency({ id: "go", slug: "modulo-go", title: "Bucles", completed_count: 1, resource_count: 3, next_resource_slug: "curso-bucles" }),
    ],
    "Cycle",
    "C",
  );
  assert.deepEqual(withNextResource.nextStep, {
    moduleCode: "modulo-go",
    moduleName: "Bucles",
    skillId: "go",
    skillTitle: "Continúa con el siguiente curso",
    href: "/aprende/curso-bucles",
    hasContent: true,
  });

  const withoutNextResource = buildRoadmapOverview(
    [competency({ id: "go", slug: "modulo-go", title: "Bucles", completed_count: 0, resource_count: 2, next_resource_slug: null })],
    "Cycle",
    "C",
  );
  assert.deepEqual(withoutNextResource.nextStep, {
    moduleCode: "modulo-go",
    moduleName: "Bucles",
    skillId: "go",
    skillTitle: "Explora Bucles",
    href: "/roadmap/modulo-go",
    hasContent: true,
  });

  // A module with no resources is never the next step (0 < 0 is false).
  const noResources = buildRoadmapOverview(
    [competency({ id: "empty", slug: "empty", completed_count: 0, resource_count: 0 })],
    "Cycle",
    "C",
  );
  assert.equal(noResources.nextStep, null);
});

test("buildRoadmapOverview lists at most three incomplete focus modules with their own percent", () => {
  const overview = buildRoadmapOverview(
    [
      competency({ id: "1", slug: "m1", completed_count: 4, resource_count: 4 }),
      competency({ id: "2", slug: "m2", completed_count: 1, resource_count: 4 }),
      competency({ id: "3", slug: "m3", completed_count: 0, resource_count: 2 }),
      competency({ id: "4", slug: "m4", completed_count: 3, resource_count: 10 }),
      competency({ id: "5", slug: "m5", completed_count: 0, resource_count: 5 }),
    ],
    "Cycle",
    "C",
  );
  assert.deepEqual(overview.focusModules.map((m) => m.code), ["m2", "m3", "m4"]);
  assert.equal(overview.focusModules[0].percent, 25);
  assert.equal(overview.focusModules[2].percent, 30);
  assert.ok(overview.focusModules.every((m) => m.estimatedHours === null));
});
