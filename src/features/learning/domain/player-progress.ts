/**
 * Pure player, progress and note-list state for the learning resource page,
 * split out of learning-player.tsx and aprende/[slug]/page.tsx so the seek
 * resolution, the save-throttle guard, the note ordering and the resume label
 * have direct executable coverage. No `server-only` and no runtime module
 * alias: it is imported by both the client player and the server route, and
 * tests/unit/learning/player-progress.test.mjs runs it directly.
 */

// A saved position only counts once the student is a few seconds in and has
// not finished; a completed resource, or one barely started, plays from the
// top. An explicit "Ir al momento" deep link always wins over the resume.
const RESUME_MIN_SECONDS = 5;

// Progress is only persisted once the position has advanced at least this far
// since the last save (unless forced), so scrubbing or a chatty timer does not
// fire a write on every tick.
export const PROGRESS_SAVE_THRESHOLD_SECONDS = 15;

const MAX_SEEK_SECONDS = 60 * 60 * 48;

/** Parse the `?at=` deep-link parameter: digits only, within 48 hours, else null. */
export function parseLearningSeekParam(value: string | string[] | undefined): number | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !/^\d+$/.test(candidate)) return null;
  const seconds = Number(candidate);
  return Number.isSafeInteger(seconds) && seconds >= 0 && seconds <= MAX_SEEK_SECONDS ? seconds : null;
}

type ResourceProgress = { status: string | null; last_position_seconds: number };

/** Where the player should start: the explicit deep-link seek, else the resume position, else 0. */
export function resolveInitialSeekSeconds(explicitSeek: number | null, resource: ResourceProgress): number {
  if (explicitSeek !== null) return explicitSeek;
  if (resource.status === "completed" || resource.last_position_seconds <= RESUME_MIN_SECONDS) return 0;
  return resource.last_position_seconds;
}

/** True when the current position is far enough past the last saved one to persist again. */
export function shouldSaveProgress(currentPosition: number, lastSavedPosition: number, force: boolean): boolean {
  return force || currentPosition - lastSavedPosition >= PROGRESS_SAVE_THRESHOLD_SECONDS;
}

/** Insert a note and keep the list ordered by its video timestamp. */
export function insertNoteSorted<T extends { timestamp_seconds: number }>(notes: readonly T[], note: T): T[] {
  return [...notes, note].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
}
