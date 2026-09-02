// Executable coverage for the pure Calendar model extracted in issue #365
// (src/components/calendar/calendar-model.ts). Dates use the local Date
// constructor or a midday-UTC instant so a y-m-d assertion never depends on
// the runner's timezone.

import assert from "node:assert/strict";
import test from "node:test";

import {
  addMonths,
  buildMonthCells,
  calendarDotClass,
  calendarEventClass,
  calendarTimeLabel,
  calendarTypeLabel,
  dateKey,
  formatLongDate,
  groupEventsByDay,
  isCalendarEventDone,
  sortCalendarEvents,
  startOfMonth,
  toDateInputValue,
  toTimeInputValue,
  todayKey,
} from "../../../src/components/calendar/calendar-model.ts";

test("buildMonthCells is a fixed 6x7 Monday-first grid with in/out month flags (issue #365)", () => {
  // September 2026 starts on a Tuesday, so the grid opens on Monday 31 Aug.
  const cells = buildMonthCells(new Date(2026, 8, 1));
  assert.equal(cells.length, 42);
  assert.equal(cells[0].key, "2026-08-31");
  assert.equal(cells[0].inMonth, false);
  assert.equal(cells.filter((cell) => cell.inMonth).length, 30, "September has 30 days");
  const firstInMonth = cells.find((cell) => cell.inMonth);
  assert.equal(firstInMonth.date.getDate(), 1);
  assert.equal(firstInMonth.key, "2026-09-01");
  assert.equal(cells.at(-1).inMonth, false, "the grid always trails into the next month");
});

test("startOfMonth / addMonths normalise to day 1 and wrap the year (issue #365)", () => {
  assert.equal(startOfMonth(new Date(2026, 8, 17)).getDate(), 1);
  const nextYear = addMonths(new Date(2026, 11, 10), 1);
  assert.equal(nextYear.getFullYear(), 2027);
  assert.equal(nextYear.getMonth(), 0);
  assert.equal(nextYear.getDate(), 1);
});

test("dateKey / todayKey return a y-m-d key or an empty string for junk (issue #365)", () => {
  assert.equal(dateKey(""), "");
  assert.equal(dateKey("not-a-date"), "");
  assert.equal(dateKey(undefined), "");
  assert.equal(dateKey("2026-09-12T12:00:00.000Z"), "2026-09-12");
  assert.match(todayKey(), /^\d{4}-\d{2}-\d{2}$/);
});

test("isCalendarEventDone reads each type's own finished vocabulary, accent-insensitive (issue #365)", () => {
  assert.equal(isCalendarEventDone({ type: "task", status: "Completada" }), true);
  assert.equal(isCalendarEventDone({ type: "task", status: "cancelada" }), true);
  assert.equal(isCalendarEventDone({ type: "task", status: "en_progreso" }), false);
  assert.equal(isCalendarEventDone({ type: "course", status: "Terminado" }), true);
  assert.equal(isCalendarEventDone({ type: "course", status: "Descartado" }), true);
  assert.equal(isCalendarEventDone({ type: "course", status: "Abierto" }), false);
  assert.equal(isCalendarEventDone({ type: "hackathon", status: "Realizado" }), true);
  assert.equal(isCalendarEventDone({ type: "google", status: "cancelled" }), true);
  assert.equal(isCalendarEventDone({ type: "google", status: "confirmed" }), false);
});

test("sortCalendarEvents orders ascending by date_at and groupEventsByDay buckets by key, dropping undated events (issue #365)", () => {
  const events = [
    { id: "b", type: "task", title: "B", date_at: "2026-09-12T09:00:00.000Z", href: "/x" },
    { id: "a", type: "task", title: "A", date_at: "2026-09-10T09:00:00.000Z", href: "/x" },
    { id: "c", type: "course", title: "C", date_at: "2026-09-12T15:00:00.000Z", href: "/x" },
    { id: "d", type: "event", title: "D", date_at: "", href: "/x" },
  ];
  const sorted = [...events].sort(sortCalendarEvents);
  assert.deepEqual(sorted.map((event) => event.id), ["d", "a", "b", "c"]);

  const byDay = groupEventsByDay(sorted);
  assert.deepEqual([...byDay.keys()].sort(), ["2026-09-10", "2026-09-12"]);
  assert.deepEqual(byDay.get("2026-09-12").map((event) => event.id), ["b", "c"], "same-day order is preserved");
  assert.equal(byDay.has(""), false, "an undated event never lands in a day bucket");
});

test("calendarTimeLabel: all-day Google, single time, and a start-end range (issue #365)", () => {
  assert.equal(calendarTimeLabel({ type: "google", date_at: "2026-09-12" }), "Todo el día");
  assert.equal(calendarTimeLabel({ type: "task", date_at: "2026-09-12T08:05:00.000Z" }).length, 5);
  const range = calendarTimeLabel({ type: "google", date_at: "2026-09-12T08:00:00.000Z", end_at: "2026-09-12T09:30:00.000Z" });
  assert.match(range, /^\d{2}:\d{2} - \d{2}:\d{2}$/);
});

test("formatLongDate and the date/time input serialisers (issue #365)", () => {
  assert.equal(formatLongDate("not-a-date"), "sin fecha");
  assert.equal(formatLongDate(undefined), "sin fecha");
  assert.match(formatLongDate("2026-09-12T10:30:00.000Z"), /^\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}$/);

  const date = new Date(2026, 8, 12, 8, 5);
  assert.equal(toDateInputValue(date), "2026-09-12");
  assert.equal(toTimeInputValue(date), "08:05");
});

test("per-type presentation classes: done events read as struck-through slate, live ones keep their family (issue #365)", () => {
  assert.match(calendarEventClass("task", "pendiente"), /bg-\[#fff0e9\]/);
  assert.match(calendarEventClass("course", "abierto"), /bg-\[#eaf6ed\]/);
  assert.match(calendarEventClass("google", "confirmed"), /bg-\[#fff0ee\]/);
  assert.match(calendarEventClass("task", "completada"), /line-through/);
  assert.equal(calendarDotClass("task", "completada"), "bg-slate-400");
  assert.equal(calendarTypeLabel("task"), "tarea");
  assert.equal(calendarTypeLabel("google"), "Google");
});
