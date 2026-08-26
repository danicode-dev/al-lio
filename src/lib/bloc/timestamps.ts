// PostgreSQL timestamptz columns reach this boundary as native Date
// instances by default (no `pg` type parser override exists in this repo),
// even though the DB row types declare them as `string`. Anything read from
// the database must be normalized here, once, before it crosses into a
// client component - otherwise string-only operations (e.g. localeCompare)
// downstream crash on a Date instance that slipped through untouched.
const EPOCH_ISO = new Date(0).toISOString();

export function toIsoTimestamp(value: unknown, fallback: string = EPOCH_ISO): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value.toISOString();
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return fallback;
}
