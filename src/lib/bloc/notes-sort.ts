export type TimestampedNote = { updated_at: string };

// Date.parse (not localeCompare) so a Date-typed value that slipped past the
// server-boundary normalization, or a corrupt/legacy non-ISO string, degrades
// to "sorts last" instead of throwing and taking the whole list down.
function parseUpdatedAt(value: unknown): number {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? -Infinity : time;
  }
  if (typeof value !== "string") return -Infinity;
  const time = Date.parse(value);
  return Number.isNaN(time) ? -Infinity : time;
}

export function compareByRecentFirst<T extends TimestampedNote>(a: T, b: T): number {
  return parseUpdatedAt(b.updated_at) - parseUpdatedAt(a.updated_at);
}

export function sortByRecentFirst<T extends TimestampedNote>(notes: readonly T[]): T[] {
  return [...notes].sort(compareByRecentFirst);
}
