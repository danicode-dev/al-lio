// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.
// Source-level assertions temporarily protect a Next.js, browser, or database boundary that the plain Node runner cannot execute; replace them when the corresponding integration harness exists.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildFeaturedHackathonCards, buildUpcomingFeed, selectDashboardTodoTasks } from "../../../src/lib/dashboard/upcoming-feed.ts";

test("insertDb enforces authorization and scopes every write to the current user (issue #92)", async () => {
  const dbSource = await readFile(new URL("../../../src/lib/db.ts", import.meta.url), "utf8");
  const fnSource = dbSource.slice(dbSource.indexOf("export async function insertDb"), dbSource.indexOf("export async function updateDb"));

  assert.match(fnSource, /const userId = await tryGetCurrentUserId\(\);/);
  assert.match(fnSource, /if \(!userId\) return null;/);
  assert.match(fnSource, /user_id: userId/);
  assert.match(fnSource, /RETURNING \*/);
});

test("Quick Add course and event creation normalize empty optional fields to null and roll back on failure (issue #92)", async () => {
  const storeSource = await readFile(new URL("../../../src/components/guest-store.tsx", import.meta.url), "utf8");

  const addCourseSource = storeSource.slice(storeSource.indexOf("addCourse: async"), storeSource.indexOf("updateCourse: async"));
  for (const field of [
    'platform: data\\.platform \\|\\| null',
    'url: data\\.url \\|\\| null',
    'start_date: data\\.start_at \\|\\| null',
    'deadline: data\\.deadline_at \\|\\| null',
    'notes: data\\.notes \\|\\| null',
  ]) {
    assert.match(addCourseSource, new RegExp(field), `addCourse missing null normalization for ${field}`);
  }
  assert.match(addCourseSource, /if \(!response\?\.result\) throw new Error/);
  assert.match(addCourseSource, /courses: current\.courses\.filter\(\(course\) => course\.id !== id\)/);
  assert.match(addCourseSource, /throw error;/);

  const addHackathonSource = storeSource.slice(storeSource.indexOf("addHackathon: async"), storeSource.indexOf("updateHackathon: async"));
  for (const field of [
    'organizer: data\\.organizer \\|\\| null',
    'city: data\\.city \\|\\| null',
    'event_start_date: data\\.start_at \\|\\| null',
    'event_end_date: data\\.end_at \\|\\| null',
    'registration_deadline: data\\.registration_deadline_at \\|\\| null',
    'url: data\\.url \\|\\| null',
    'notes: data\\.notes \\|\\| null',
  ]) {
    assert.match(addHackathonSource, new RegExp(field), `addHackathon missing null normalization for ${field}`);
  }
  assert.match(addHackathonSource, /if \(!response\?\.result\) throw new Error/);
  assert.match(addHackathonSource, /hackathons: current\.hackathons\.filter\(\(hackathon\) => hackathon\.id !== id\)/);

  const addTaskSource = storeSource.slice(storeSource.indexOf("addTask: async"), storeSource.indexOf("updateTask: async"));
  assert.match(addTaskSource, /if \(!response\?\.result\) throw new Error/);
  assert.match(addTaskSource, /tasks: current\.tasks\.filter\(\(task\) => task\.id !== id\)/);
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
