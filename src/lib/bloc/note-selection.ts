/**
 * Pure note list/filter selection for the Bloc workspace, split out of
 * bloc-notepad.tsx so the Todas / Recientes / Favoritas tab logic and the
 * search filter have direct executable coverage instead of only being read
 * through source inspection. Sibling of notes-sort.ts (whose
 * `compareByRecentFirst` this deliberately mirrors for the Recientes tab) and
 * note-export.ts. Self-contained so the plain Node test runner can execute it.
 */

export type BlocListTab = "todas" | "recientes" | "favoritas";

// Same tolerance as notes-sort.ts: a Date-typed or corrupt/legacy value that
// slipped past the server-boundary normalization sorts last instead of
// throwing and taking the whole list down.
function recencyValue(value: unknown): number {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? -Infinity : time;
  }
  if (typeof value !== "string") return -Infinity;
  const time = Date.parse(value);
  return Number.isNaN(time) ? -Infinity : time;
}

/** Exclude the not-yet-persisted phantom note from any user-facing list. */
export function dropPhantomNote<T extends { id: string }>(notes: readonly T[], phantomId: string | null): T[] {
  return phantomId ? notes.filter((note) => note.id !== phantomId) : [...notes];
}

/**
 * The notes shown for a tab: Favoritas keeps only favourites, Recientes sorts
 * by most recently edited first (favouriting never changes that order), Todas
 * keeps the incoming order.
 */
export function selectTabNotes<T extends { favorite: boolean; updated_at: string }>(
  notes: readonly T[],
  tab: BlocListTab,
): T[] {
  if (tab === "favoritas") return notes.filter((note) => note.favorite);
  if (tab === "recientes") return [...notes].sort((a, b) => recencyValue(b.updated_at) - recencyValue(a.updated_at));
  return [...notes];
}

/** Case-insensitive match across the note title and its plain-text body. */
export function searchNotes<T extends { title: string; contentText: string }>(
  notes: readonly T[],
  term: string,
): T[] {
  const query = term.trim().toLowerCase();
  if (!query) return [...notes];
  return notes.filter((note) => `${note.title} ${note.contentText}`.toLowerCase().includes(query));
}

export function countFavorites(notes: readonly { favorite: boolean }[]): number {
  return notes.filter((note) => note.favorite).length;
}
