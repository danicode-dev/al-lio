// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.
// Source-level assertions temporarily protect a Next.js, browser, or database boundary that the plain Node runner cannot execute; replace them when the corresponding integration harness exists.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildFeaturedHackathonCards, buildUpcomingFeed, selectDashboardTodoTasks } from "../../../src/lib/dashboard/upcoming-feed.ts";

test("product writes use feature-owned, user-scoped repositories instead of a generic table/column action (issue #92, #275)", async () => {
  await assert.rejects(readFile(new URL("../../../src/lib/db.ts", import.meta.url), "utf8"), /ENOENT/);
  for (const feature of ["tasks", "courses", "events"]) {
    const repository = await readFile(new URL(`../../../src/features/${feature}/server/repository.ts`, import.meta.url), "utf8");
    const actions = await readFile(new URL(`../../../src/features/${feature}/server/actions.ts`, import.meta.url), "utf8");
    assert.match(repository, /user_id = \$\d|user_id,/, `${feature} repository must scope writes to user_id`);
    assert.doesNotMatch(repository, /Object\.keys\(data\)|\$\{table\}/, `${feature} repository must not derive SQL identifiers from client data`);
    assert.match(actions, /getCurrentUserId\(\)/, `${feature} actions must derive identity from the live session`);
    assert.match(actions, /\.strict\(\)/, `${feature} action payloads must reject unknown fields`);
  }
});

test("Quick Add mutations validate optional fields and each feature rolls back optimistic creation on failure (issue #92, #275)", async () => {
  const cases = [
    ["courses", "course", "courses"],
    ["events", "item", "hackathons"],
    ["tasks", "task", "tasks"],
  ];
  for (const [feature, itemName, collection] of cases) {
    const client = await readFile(new URL(`../../../src/features/${feature}/client/use-${feature === "events" ? "event" : feature === "courses" ? "course" : "task"}-actions.ts`, import.meta.url), "utf8");
    const server = await readFile(new URL(`../../../src/features/${feature}/server/actions.ts`, import.meta.url), "utf8");
    assert.match(server, /safeParse\(input\)/, `${feature} validates unknown input before persistence`);
    assert.match(client, new RegExp(`${collection}: current\\.${collection}\\.filter\\(\\(${itemName}\\) => ${itemName}\\.id !== id\\)`));
    assert.match(client, /throw error;/);
  }
});

test("Quick Add awaits persistence, blocks duplicate submits and keeps entered values open on failure (issue #92)", async () => {
  const quickAddSource = await readFile(new URL("../../../src/components/quick-add.tsx", import.meta.url), "utf8");

  // Idempotent retry: a second submit while one is already in flight is a no-op.
  assert.match(quickAddSource, /if \(submitting\) return;/);
  assert.match(quickAddSource, /setSubmitting\(true\)/);
  assert.match(quickAddSource, /disabled=\{submitting\}/);

  // The dialog only closes after every awaited action resolves, inside the try
  // block - a rejection skips the close and keeps the uncontrolled form (and
  // whatever the user typed) mounted for retry instead of resetting it.
  const submitFnSource = quickAddSource.slice(quickAddSource.indexOf("async function submit"), quickAddSource.indexOf("return (\n    <>"));
  assert.match(submitFnSource, /await actions\.addTask/);
  assert.match(submitFnSource, /await actions\.addCourse/);
  assert.match(submitFnSource, /await actions\.addHackathon/);
  const setOpenIdx = submitFnSource.indexOf("setOpen(false)");
  const catchIdx = submitFnSource.indexOf("} catch");
  assert.ok(setOpenIdx > -1 && catchIdx > setOpenIdx, "setOpen(false) must be the last step of the try block, before the catch");

  // No unconditional reset() on submit that would blow away the entered
  // values regardless of whether persistence actually succeeded.
  assert.doesNotMatch(quickAddSource, /currentTarget\.reset\(\)/);
});

test("DashboardTodo and DashboardFocusCarousel read the shared pure feed helpers, not a reimplemented inline version (issue #93)", async () => {
  const todoSource = await readFile(new URL("../../../src/components/dashboard/dashboard-todo.tsx", import.meta.url), "utf8");
  assert.match(todoSource, /selectDashboardTodoTasks\(store\.tasks\)/);

  const carouselSource = await readFile(new URL("../../../src/components/dashboard/dashboard-focus-carousel.tsx", import.meta.url), "utf8");
  assert.match(carouselSource, /buildUpcomingFeed\(\{/);
  assert.match(carouselSource, /buildFeaturedHackathonCards\(\{/);
  // No carousel redesign: the same four rotating sections and the same
  // auto-advance mechanism must still be present, unchanged.
  assert.match(carouselSource, /"upcoming".*"opportunities".*"work".*"hackathons"/s);
  assert.match(carouselSource, /window\.setInterval\(\(\) => move\(1\), 8000\)/);
});

test("DashboardView's layout grids define a shrinkable base track, not only the xl desktop layout (issue #103)", async () => {
  const source = await readFile(new URL("../../../src/components/dashboard/dashboard-view.tsx", import.meta.url), "utf8");

  // A Tailwind grid with only an `xl:grid-cols-…` variant has no explicit
  // grid-template-columns below 1280px, so it falls back to an implicit
  // auto track that does not shrink below its children's min-content width -
  // that intrinsic width becoming wider than the viewport is exactly what
  // produced the reported horizontal overflow. grid-cols-1 (Tailwind's own
  // `repeat(1, minmax(0, 1fr))`) is the base track that can actually shrink.
  const gridDivs = [...source.matchAll(/<div className="([^"]*\bgrid\b[^"]*)">/g)].map((m) => m[1]);
  const withXlCols = gridDivs.filter((className) => className.includes("xl:grid-cols-"));
  assert.equal(withXlCols.length, 2, "expected the To-do/route/calendar row and the opportunities/progress row");
  for (const className of withXlCols) {
    assert.match(className, /\bgrid-cols-1\b/, `grid must define a base grid-cols-1 (got: "${className}")`);
  }
});

test("DashboardFocusCarousel's card grid defines a shrinkable base track, not only the sm layout (issue #103)", async () => {
  const source = await readFile(new URL("../../../src/components/dashboard/dashboard-focus-carousel.tsx", import.meta.url), "utf8");
  const match = source.match(/<div className="([^"]*\bgrid\b[^"]*\bsm:grid-cols-3\b[^"]*)">/);
  assert.ok(match, "expected to find the card grid using sm:grid-cols-3");
  assert.match(match[1], /\bgrid-cols-1\b/, `card grid must define a base grid-cols-1 (got: "${match[1]}")`);
});

test("the Dashboard overflow fix does not fall back to hiding overflow globally (issue #103)", async () => {
  const [globalsCss, layoutSource] = await Promise.all([
    readFile(new URL("../../../src/app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../../../src/app/(dashboard)/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(globalsCss, /overflow-x:\s*hidden/i, "must not hide horizontal overflow globally in place of a real layout fix");
  assert.doesNotMatch(layoutSource, /overflow-x-hidden/, "must not hide horizontal overflow globally in place of a real layout fix");
});

test("desktop's xl three-column composition is untouched (issue #103)", async () => {
  const source = await readFile(new URL("../../../src/components/dashboard/dashboard-view.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /grid grid-cols-1 items-start gap-4 xl:grid-cols-\[minmax\(300px,1\.08fr\)_minmax\(350px,1\.14fr\)_minmax\(260px,\.78fr\)\]/,
    "the xl: three-column track definition must be byte-for-byte unchanged, only the mobile base was added",
  );
});
