// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.

import assert from "node:assert/strict";

import test from "node:test";

import { buildFeaturedHackathonCards, buildUpcomingFeed, selectDashboardTodoTasks } from "../../../src/lib/dashboard/upcoming-feed.ts";

const REFERENCE_TODAY = new Date("2026-09-01T00:00:00.000Z");

function mockTask(overrides = {}) {
  return { id: "task-1", title: "Tarea", status: "pendiente", due_at: "2026-09-05", created_at: "2026-08-01T00:00:00.000Z", ...overrides };
}

function mockCourse(overrides = {}) {
  return { id: "course-1", title: "Curso", status: "empezado", start_at: "2026-09-05", created_at: "2026-08-01T00:00:00.000Z", ...overrides };
}

function mockHackathonItem(overrides = {}) {
  return { id: "hackathon-1", name: "Evento", status: "inscripcion_abierta", start_at: "2026-09-05", created_at: "2026-08-01T00:00:00.000Z", ...overrides };
}

function mockFpItem(overrides = {}) {
  return {
    id: "fp-item-1",
    id_slug: "fp-item-1",
    type: "evento",
    title: "Evento del catálogo",
    is_favorite: true,
    user_status: null,
    start_date: "2026-09-05",
    created_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

const emptyFeedParams = { tasks: [], courses: [], hackathons: [], fpContent: [], todoTaskIds: new Set(), today: REFERENCE_TODAY };

test("selectDashboardTodoTasks returns the most recently created tasks, most recent first (issue #93)", () => {
  const older = mockTask({ id: "a", created_at: "2026-07-01T00:00:00.000Z" });
  const newer = mockTask({ id: "b", created_at: "2026-08-15T00:00:00.000Z" });
  const result = selectDashboardTodoTasks([older, newer], 1);
  assert.deepEqual(result.map((task) => task.id), ["b"]);
});

test("buildUpcomingFeed excludes tasks already shown in To-do, includes the rest (issue #93)", () => {
  const shown = mockTask({ id: "shown", due_at: "2026-09-05" });
  const notShown = mockTask({ id: "not-shown", due_at: "2026-09-06" });
  const result = buildUpcomingFeed({ ...emptyFeedParams, tasks: [shown, notShown], todoTaskIds: new Set(["shown"]) });
  assert.deepEqual(result.map((item) => item.id), ["task-not-shown"]);
});

test("buildUpcomingFeed only includes dated items within the next 14 days (issue #93)", () => {
  const undated = mockTask({ id: "undated", due_at: undefined });
  const tooFar = mockTask({ id: "too-far", due_at: "2026-10-01" });
  const inRange = mockTask({ id: "in-range", due_at: "2026-09-10" });
  const inPast = mockTask({ id: "in-past", due_at: "2026-08-01" });
  const result = buildUpcomingFeed({ ...emptyFeedParams, tasks: [undated, tooFar, inRange, inPast] });
  assert.deepEqual(result.map((item) => item.id), ["task-in-range"]);
});

test("buildUpcomingFeed chooses the next valid date when an earlier deadline has already passed (issue #93)", () => {
  const course = mockCourse({ deadline_at: "2026-08-20", start_at: "2026-09-06" });
  const hackathon = mockHackathonItem({ registration_deadline_at: "2026-08-25", start_at: "2026-09-07" });
  const fpEvent = mockFpItem({ start_date: "2026-08-20", end_date: "2026-09-08" });
  const result = buildUpcomingFeed({ ...emptyFeedParams, courses: [course], hackathons: [hackathon], fpContent: [fpEvent] });

  assert.deepEqual(result.map((item) => item.date), ["2026-09-06", "2026-09-07", "2026-09-08"]);
});

test("buildUpcomingFeed preserves distinct tasks that share title and date (issue #93)", () => {
  const first = mockTask({ id: "first", title: "Llamar", due_at: "2026-09-05" });
  const second = mockTask({ id: "second", title: "Llamar", due_at: "2026-09-05" });
  const result = buildUpcomingFeed({ ...emptyFeedParams, tasks: [first, second] });

  assert.deepEqual(result.map((item) => item.id), ["task-first", "task-second"]);
});

test("buildUpcomingFeed excludes completed/dismissed/archived items across every source (issue #93)", () => {
  const doneTask = mockTask({ id: "done", status: "completada" });
  const cancelledTask = mockTask({ id: "cancelled", status: "cancelada" });
  const finishedCourse = mockCourse({ id: "finished", status: "terminado" });
  const archivedHackathon = mockHackathonItem({ id: "archived", status: "descartado" });
  const completedFp = mockFpItem({ id_slug: "completed-fp", user_status: "completed" });
  const result = buildUpcomingFeed({
    ...emptyFeedParams,
    tasks: [doneTask, cancelledTask],
    courses: [finishedCourse],
    hackathons: [archivedHackathon],
    fpContent: [completedFp],
  });
  assert.deepEqual(result, []);
});

test("buildUpcomingFeed includes active user courses/events with an actionable date, and saved FP events, only (issue #93)", () => {
  const course = mockCourse();
  const hackathon = mockHackathonItem();
  const savedFp = mockFpItem({ id_slug: "saved", is_favorite: true });
  const unsavedFp = mockFpItem({ id_slug: "unsaved", is_favorite: false });
  const nonEventFp = mockFpItem({ id_slug: "not-an-event", type: "curso_basico", is_favorite: true });
  const result = buildUpcomingFeed({
    ...emptyFeedParams,
    courses: [course],
    hackathons: [hackathon],
    fpContent: [savedFp, unsavedFp, nonEventFp],
  });
  const ids = result.map((item) => item.id).sort();
  assert.deepEqual(ids, ["course-course-1", "fp-saved", "hackathon-hackathon-1"]);
});

test("buildUpcomingFeed orders chronologically and deduplicates by identity, with a normalized-title fallback (issue #93)", () => {
  const later = mockTask({ id: "later", due_at: "2026-09-12" });
  const sooner = mockTask({ id: "sooner", due_at: "2026-09-03" });
  const ordered = buildUpcomingFeed({ ...emptyFeedParams, tasks: [later, sooner] });
  assert.deepEqual(ordered.map((item) => item.id), ["task-sooner", "task-later"]);

  // Same catalogue event, reached through two different collections with two
  // different generated ids: a real identity (id_slug) collapses them to one.
  const asHackathon = mockHackathonItem({ id: "dup-a", id_slug: "shared-slug", start_at: "2026-09-06" });
  const asFp = mockFpItem({ id_slug: "shared-slug", start_date: "2026-09-06" });
  const dedupedById = buildUpcomingFeed({ ...emptyFeedParams, hackathons: [asHackathon], fpContent: [asFp] });
  assert.equal(dedupedById.length, 1, "the same id_slug must collapse to a single feed item");

  // No shared id_slug at all: falls back to normalized title + date + destination.
  const courseA = mockCourse({ id: "c-a", id_slug: undefined, title: "Preparación Física", start_at: "2026-09-07" });
  const courseB = mockCourse({ id: "c-b", id_slug: undefined, title: "preparacion fisica", start_at: "2026-09-07" });
  const dedupedByFallback = buildUpcomingFeed({ ...emptyFeedParams, courses: [courseA, courseB] });
  assert.equal(dedupedByFallback.length, 1, "same normalized title + date + destination must also collapse to one item");
});

test("buildFeaturedHackathonCards shows saved catalogue events first, and never claims there are none when is_favorite is true (issue #93)", () => {
  const saved = mockFpItem({ id_slug: "saved-1" });
  const result = buildFeaturedHackathonCards({ hackathons: [], fpContent: [saved], today: REFERENCE_TODAY });
  assert.equal(result.length, 1, "a favourited FP event/challenge must always appear, even alone");
  assert.equal(result[0].id, "fp-saved-1");
});

test("buildFeaturedHackathonCards tops up with the user's own events only when fewer than three are saved (issue #93)", () => {
  const savedOne = mockFpItem({ id_slug: "saved-1" });
  const userHackathon = mockHackathonItem({ id: "own-1" });
  const withOneSaved = buildFeaturedHackathonCards({ hackathons: [userHackathon], fpContent: [savedOne], today: REFERENCE_TODAY });
  assert.deepEqual(withOneSaved.map((item) => item.id).sort(), ["fp-saved-1", "hackathon-own-1"]);

  const savedThree = ["a", "b", "c"].map((slug) => mockFpItem({ id_slug: slug, title: `Evento ${slug}` }));
  const withThreeSaved = buildFeaturedHackathonCards({ hackathons: [userHackathon], fpContent: savedThree, today: REFERENCE_TODAY });
  assert.equal(withThreeSaved.length, 3);
  assert.ok(!withThreeSaved.some((item) => item.id === "hackathon-own-1"), "must not top up once three saved items already fill the section");
});

test("buildFeaturedHackathonCards deduplicates a saved catalogue event against the user's own matching row (issue #93)", () => {
  const saved = mockFpItem({ id_slug: "shared-slug" });
  const ownSameEvent = mockHackathonItem({ id: "own-dup", id_slug: "shared-slug" });
  const result = buildFeaturedHackathonCards({ hackathons: [ownSameEvent], fpContent: [saved], today: REFERENCE_TODAY });
  assert.equal(result.length, 1, "the same event must not appear twice just because it also has a user-owned row");
});

test("buildFeaturedHackathonCards excludes expired and catalogue-inactive events (issue #93)", () => {
  const expiredSaved = mockFpItem({ id_slug: "expired-saved", start_date: "2026-08-01", end_date: "2026-08-02" });
  const closedSaved = mockFpItem({ id_slug: "closed-saved", status: "Finalizado", start_date: "2026-09-05" });
  const expiredOwned = mockHackathonItem({ id: "expired-owned", start_at: "2026-08-01", end_at: "2026-08-02" });
  const activeSaved = mockFpItem({ id_slug: "active-saved", start_date: "2026-09-05" });

  const result = buildFeaturedHackathonCards({
    hackathons: [expiredOwned],
    fpContent: [expiredSaved, closedSaved, activeSaved],
    today: REFERENCE_TODAY,
  });

  assert.deepEqual(result.map((item) => item.id), ["fp-active-saved"]);
});
