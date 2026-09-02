// Pure policy for the manual Job Radar synchronisation guard (issue #281).
//
// This module holds no `server-only` or Next.js imports and no runtime module
// alias on purpose: the cooldown/single-flight decision and the error
// sanitiser are pure and directly unit-tested. The Postgres-backed side of the
// guard lives in sync-guard.ts and its acquire SQL mirrors the WHERE logic
// below.

// A manual sync is allowed at most once per user per this window. Matches the
// existing in-process interval in sync.ts so visible behaviour is unchanged.
export const JOB_RADAR_SYNC_COOLDOWN_MS = 6 * 60 * 60 * 1000;

// A `running_since` older than this is treated as a crashed run rather than a
// live one, so a process that died mid-sync cannot lock the user out.
export const JOB_RADAR_SYNC_STALE_MS = 15 * 60 * 1000;

export type JobRadarSyncGuardOptions = {
  cooldownMs?: number;
  staleMs?: number;
  now?: number;
};

export type JobRadarSyncConflict =
  | { status: "running" }
  | { status: "cooldown"; retryAfterSeconds: number };

/**
 * Given the persisted guard row that the acquire upsert refused to take, decide
 * whether it refused because a sync is genuinely in flight (→ 409) or because
 * the per-user cooldown has not elapsed (→ 429 with Retry-After). A refusal
 * that both conditions explain is reported as `running`, the more specific
 * state. Retry-After is always at least one second.
 */
export function classifyJobRadarSyncConflict(
  row: { runningSince: number | null; lastAttemptAt: number | null },
  options: JobRadarSyncGuardOptions = {},
): JobRadarSyncConflict {
  const cooldownMs = options.cooldownMs ?? JOB_RADAR_SYNC_COOLDOWN_MS;
  const staleMs = options.staleMs ?? JOB_RADAR_SYNC_STALE_MS;
  const now = options.now ?? Date.now();

  if (row.runningSince !== null && now - row.runningSince < staleMs) {
    return { status: "running" };
  }

  const readyAt = (row.lastAttemptAt ?? 0) + cooldownMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((readyAt - now) / 1000));
  return { status: "cooldown", retryAfterSeconds };
}

/**
 * The Job Radar collectors talk to external sites, so a thrown error can carry
 * a provider URL, a response-body fragment or a credential in its message or
 * stack. Reduce it to a safe, greppable class name (plus a short runtime error
 * code when one is attached) for the route's single outcome log line. Full
 * diagnostics must come from the collector's own scoped logging, never here.
 */
export function describeJobRadarSyncError(error: unknown): string {
  if (error instanceof Error) {
    const name = error.name || "Error";
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" && /^[A-Za-z0-9_]{1,32}$/.test(code) ? `${name}:${code}` : name;
  }
  return "unknown";
}
