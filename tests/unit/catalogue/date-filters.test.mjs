// Deterministic coverage for the shared catalogue date helpers. Every
// time-relative case passes an explicit `now` so the result never depends on
// the clock. Dates are built with the local Date constructor and round-tripped
// through toISOString(), which keeps dateKey/todayKey timezone-stable.
import assert from "node:assert/strict";
import test from "node:test";

import {
  addDays,
  addMonths,
  buildMonthCells,
  dateKey,
  formatDateLabel,
  isPastActionDate,
  isWithinUpcomingWindow,
  pad,
  startOfMonth,
  todayKey,
} from "../../../src/lib/catalog/date-filters.ts";

test("parseDate-backed helpers treat missing and invalid input as no date", () => {
  assert.equal(dateKey(undefined), "");
  assert.equal(dateKey(null), "");
  assert.equal(dateKey(""), "");
  assert.equal(dateKey("not-a-date"), "");
  assert.equal(formatDateLabel(undefined), "sin fecha");
  assert.equal(formatDateLabel(""), "sin fecha");
  assert.equal(formatDateLabel("not-a-date"), "sin fecha");
});

test("dateKey returns the local YYYY-MM-DD of a round-tripped instant, zero-padded", () => {
  assert.equal(dateKey(new Date(2026, 5, 15, 12).toISOString()), "2026-06-15");
  assert.equal(dateKey(new Date(2026, 0, 5, 12).toISOString()), "2026-01-05");
  assert.equal(todayKey(new Date(2026, 8, 1, 9, 30)), "2026-09-01");
  assert.equal(pad(3), "03");
  assert.equal(pad(12), "12");
});

test("isPastActionDate classifies past, today and future against an injected now", () => {
  const now = new Date(2026, 5, 15, 10);
  assert.equal(isPastActionDate(new Date(2026, 5, 14, 23).toISOString(), now), true);
  assert.equal(isPastActionDate(new Date(2026, 5, 15, 1).toISOString(), now), false, "today is not past");
  assert.equal(isPastActionDate(new Date(2026, 5, 16, 0).toISOString(), now), false, "future is not past");
  assert.equal(isPastActionDate(undefined, now), false);
  assert.equal(isPastActionDate("", now), false);
  assert.equal(isPastActionDate("not-a-date", now), false);
});

test("isWithinUpcomingWindow includes today through day 30 and excludes day 31", () => {
  const now = new Date(2026, 5, 15, 12); // window is 2026-06-15 .. 2026-07-15
  assert.equal(isWithinUpcomingWindow("2026-06-15", now), true, "today, inclusive");
  assert.equal(isWithinUpcomingWindow("2026-07-15", now), true, "day 30, inclusive");
  assert.equal(isWithinUpcomingWindow("2026-07-16", now), false, "day 31, excluded");
  assert.equal(isWithinUpcomingWindow("2026-06-14", now), false, "yesterday, excluded");
});

test("isWithinUpcomingWindow reads only the leading date and rejects missing or invalid values", () => {
  const now = new Date(2026, 5, 15, 12);
  assert.equal(isWithinUpcomingWindow("2026-06-20T23:59:59Z", now), true, "time suffix is ignored");
  assert.equal(isWithinUpcomingWindow(undefined, now), false);
  assert.equal(isWithinUpcomingWindow(null, now), false);
  assert.equal(isWithinUpcomingWindow("", now), false);
  assert.equal(isWithinUpcomingWindow("garbage-xx", now), false);
});

test("startOfMonth, addMonths and addDays honour month and year boundaries", () => {
  const midJune = new Date(2026, 5, 15, 23, 59);
  const first = startOfMonth(midJune);
  assert.equal(first.getFullYear(), 2026);
  assert.equal(first.getMonth(), 5);
  assert.equal(first.getDate(), 1);
  assert.equal(first.getHours(), 0);

  const nextYear = addMonths(new Date(2026, 11, 10), 1);
  assert.equal(nextYear.getFullYear(), 2027);
  assert.equal(nextYear.getMonth(), 0);
  assert.equal(nextYear.getDate(), 1);

  const prevYear = addMonths(new Date(2026, 0, 15), -1);
  assert.equal(prevYear.getFullYear(), 2025);
  assert.equal(prevYear.getMonth(), 11);

  const rolled = addDays(new Date(2026, 5, 30, 8), 1);
  assert.equal(rolled.getMonth(), 6);
  assert.equal(rolled.getDate(), 1);
});

test("buildMonthCells produces a 42-cell Monday-first grid for a month starting on Monday", () => {
  const cells = buildMonthCells(new Date(2026, 5, 1)); // 2026-06-01 is a Monday
  assert.equal(cells.length, 42);
  assert.equal(cells[0].date.getDay(), 1, "first column is Monday");
  assert.equal(cells[0].date.getDate(), 1);
  assert.equal(cells[0].inMonth, true);
  assert.equal(cells.filter((cell) => cell.inMonth).length, 30, "June has 30 in-month days");
  assert.equal(cells[41].inMonth, false);
  for (const cell of cells) {
    assert.equal(cell.key, dateKey(cell.date.toISOString()), "key matches the cell's own date");
  }
});

test("buildMonthCells pads leading days for a month starting on Sunday, still Monday-first", () => {
  const cells = buildMonthCells(new Date(2026, 2, 1)); // 2026-03-01 is a Sunday
  assert.equal(cells.length, 42);
  assert.equal(cells[0].date.getDay(), 1, "grid still starts on Monday");
  assert.equal(cells[0].inMonth, false, "the six leading cells belong to February");
  assert.equal(cells[6].date.getDate(), 1, "March 1 lands in the seventh cell");
  assert.equal(cells[6].inMonth, true);
  assert.equal(cells.filter((cell) => cell.inMonth).length, 31, "March has 31 in-month days");
});

test("formatDateLabel keeps the es-ES date-only rendering", () => {
  const label = formatDateLabel("2026-03-15");
  assert.notEqual(label, "sin fecha");
  assert.match(label, /15/);
  assert.match(label, /2026/);
});
