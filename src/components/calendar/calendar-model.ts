// Calendar model — the pure, framework-free logic behind the Calendar
// surface (issue #365): the event shape, month-grid construction, day
// grouping, ordering, done-state classification, date/time formatting and
// the per-type presentation classes. Everything here is deterministic given
// its arguments and is exercised directly by
// tests/unit/calendar/calendar-model.test.mjs. app-calendar.tsx keeps only
// the React components, the Google fetch/cache and the dialog wiring.
//
// (There is an overlapping generic date helper set in
// src/lib/catalog/date-filters.ts; reconciling the two is a separate
// follow-up and is not attempted here.)

export type CalendarEventType = "task" | "course" | "hackathon" | "event" | "google";

export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  title: string;
  date_at: string;
  end_at?: string;
  status?: string;
  href: string;
  description?: string;
};

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  htmlLink?: string;
  status?: string;
  description?: string;
};

export type CalendarMonthCell = {
  date: Date;
  key: string;
  inMonth: boolean;
};

export const WEEKDAYS_COMPACT = ["L", "M", "X", "J", "V", "S", "D"];
export const WEEKDAYS_FULL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ── Date arithmetic ─────────────────────────────────────────────────────────

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateKey(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey() {
  return dateKey(new Date().toISOString());
}

export function isSameMonth(value: string | undefined, month: Date) {
  const date = parseDate(value);
  return Boolean(date) && date!.getFullYear() === month.getFullYear() && date!.getMonth() === month.getMonth();
}

function isDateOnly(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

// A fixed 6×7 grid, Monday-first, with the leading/trailing days of the
// neighbouring months flagged `inMonth: false`.
export function buildMonthCells(month: Date): CalendarMonthCell[] {
  const first = startOfMonth(month);
  const leading = (first.getDay() + 6) % 7;
  const start = addDays(first, -leading);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return { date, key: dateKey(date.toISOString()), inMonth: date.getMonth() === month.getMonth() };
  });
}

// ── Formatting ─────────────────────────────────────────────────────────────

export function monthTitle(date: Date) {
  const title = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function formatDayTitle(value: string) {
  const date = parseDate(value);
  if (!date) return "Día seleccionado";
  const title = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "2-digit", month: "long", timeZone: "Europe/Madrid" }).format(date);
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function formatTime(value?: string) {
  const date = parseDate(value);
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function calendarTimeLabel(event: Pick<CalendarEvent, "type" | "date_at" | "end_at">) {
  if (event.type === "google" && isDateOnly(event.date_at)) return "Todo el día";
  const start = formatTime(event.date_at);
  const end = event.end_at ? formatTime(event.end_at) : "";
  return end ? `${start} - ${end}` : start;
}

export function formatLongDate(value?: string) {
  const date = parseDate(value);
  if (!date) return "sin fecha";
  const parts = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Madrid",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.day}/${values.month}/${values.year} · ${values.hour}:${values.minute}`;
}

export function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ── Events ─────────────────────────────────────────────────────────────────

export function isCalendarEventDone(event: Pick<CalendarEvent, "type" | "status">) {
  const status = String(event.status || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (event.type === "task") return status === "completada" || status === "cancelada";
  if (event.type === "course") return status.includes("termin") || status.includes("final") || status.includes("descart");
  if (event.type === "hackathon") return status.includes("realiz") || status.includes("final") || status.includes("descart");
  return status === "cancelled" || status === "cancelado";
}

export function sortCalendarEvents(a: CalendarEvent, b: CalendarEvent) {
  return String(a.date_at || "").localeCompare(String(b.date_at || ""));
}

export function groupEventsByDay(events: CalendarEvent[]) {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dateKey(event.date_at);
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }
  return grouped;
}

export function calendarEventClass(type: CalendarEvent["type"], status?: string) {
  if (isCalendarEventDone({ type, status })) return "border border-slate-200 bg-slate-100 text-slate-700 line-through";
  if (type === "task") return "border border-[#f4d3c5] bg-[#fff0e9] text-[#c6491d]";
  if (type === "course" || type === "event") return "border border-[#d3ead9] bg-[#eaf6ed] text-[#1f7a4d]";
  if (type === "google") return "border border-[#f3d0cd] bg-[#fff0ee] text-[#a43b32]";
  return "border border-[#f0dfb9] bg-[#fff7df] text-[#8a5c14]";
}

export function calendarDotClass(type: CalendarEvent["type"], status?: string) {
  if (isCalendarEventDone({ type, status })) return "bg-slate-400";
  if (type === "task") return "bg-[#f06a37]";
  if (type === "course" || type === "event") return "bg-[#1f7a4d]";
  if (type === "google") return "bg-red-500";
  return "bg-amber-500";
}

export function calendarTypeLabel(type: CalendarEvent["type"]) {
  if (type === "task") return "tarea";
  if (type === "course") return "curso";
  if (type === "hackathon") return "hackathon";
  if (type === "event") return "evento";
  return "Google";
}
