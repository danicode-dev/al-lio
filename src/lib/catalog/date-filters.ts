// Shared, pure date helpers for the Courses and Events catalogues.
//
// Both catalogue features classified dates, built calendars and formatted
// labels with their own byte-for-byte identical copies of this logic. The
// helpers below are those copies, moved verbatim so the two catalogues can
// never drift: local-time day semantics, the raw slice(0, 10) window
// comparison and the es-ES formatting are all preserved exactly.
//
// Each time-relative predicate accepts an explicit `now` so tests are
// deterministic; callers that omit it keep the previous `new Date()` behaviour.

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function dateKey(value?: string | null): string {
  const date = parseDate(value ?? undefined);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(now: Date = new Date()): string {
  return dateKey(now.toISOString());
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export type MonthCell = { date: Date; key: string; inMonth: boolean };

// A 42-cell (6 x 7) month grid whose first column is Monday. Cells outside
// the target month are flagged with `inMonth: false`.
export function buildMonthCells(month: Date): MonthCell[] {
  const first = startOfMonth(month);
  const leading = (first.getDay() + 6) % 7;
  const start = addDays(first, -leading);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return { date, key: dateKey(date.toISOString()), inMonth: date.getMonth() === month.getMonth() };
  });
}

// True when `value` resolves to a real calendar day strictly before today.
// Absent or unparseable values are never past.
export function isPastActionDate(value?: string | null, now: Date = new Date()): boolean {
  const date = parseDate(value ?? undefined);
  return Boolean(date) && startOfDay(date!) < startOfDay(now);
}

// "Prox. inicio": the leading YYYY-MM-DD of `value` must fall within
// [today, today + days], inclusive. Empty or non-date values sort outside the
// window, matching the original plain string comparison.
export function isWithinUpcomingWindow(
  value: string | null | undefined,
  now: Date = new Date(),
  days = 30,
): boolean {
  const day = (value ?? "").slice(0, 10);
  return day >= todayKey(now) && day <= dateKey(addDays(now, days).toISOString());
}

export function formatShortDateTime(value?: string | null): string {
  const date = parseDate(value ?? undefined);
  if (!date) return "sin fecha";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatDateLabel(value?: string | null): string {
  if (!value) return "sin fecha";
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(Number(year), Number(month) - 1, Number(day)));
  }
  return formatShortDateTime(value);
}
