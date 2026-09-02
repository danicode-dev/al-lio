import "server-only";

import { query } from "@/lib/db/pool";
import {
  JOB_RADAR_SYNC_COOLDOWN_MS,
  JOB_RADAR_SYNC_STALE_MS,
  classifyJobRadarSyncConflict,
  describeJobRadarSyncError,
  type JobRadarSyncConflict,
} from "./sync-guard-policy";

// Backed by public.job_radar_sync_state (0017_job_radar_sync_state.sql) rather
// than an in-process value, so the cooldown and the single-flight lock survive
// a restart and hold across instances. The guard is always keyed by the
// server-derived user id; the route never accepts a user id from the request.

const GUARD_STORE = "postgres:public.job_radar_sync_state";

export type JobRadarSyncGuard = { status: "acquired" } | JobRadarSyncConflict;

function secondsInterval(ms: number): string {
  return `${Math.max(1, Math.round(ms / 1000))} seconds`;
}

/**
 * Atomically take the per-user guard iff no sync is in flight (or the last one
 * is older than the stale threshold) and the cooldown has elapsed. On success
 * the row records a fresh `running_since` and `last_attempt_at`. On a refusal a
 * follow-up read classifies it as `running` or `cooldown`. If the store is
 * unreachable the guard fails open: syncJobRadar depends on the same Postgres
 * and will fail through the route's handled 500 a moment later, so allowing the
 * attempt does not widen the abuse window while a transient blip stays visible
 * in one log line.
 */
export async function acquireJobRadarSyncGuard(userId: string): Promise<JobRadarSyncGuard> {
  const cooldown = secondsInterval(JOB_RADAR_SYNC_COOLDOWN_MS);
  const stale = secondsInterval(JOB_RADAR_SYNC_STALE_MS);

  try {
    const acquired = await query(
      `INSERT INTO public.job_radar_sync_state AS s (user_id, running_since, last_attempt_at)
       VALUES ($1, now(), now())
       ON CONFLICT (user_id) DO UPDATE SET
         running_since = now(),
         last_attempt_at = now()
       WHERE (s.running_since IS NULL OR s.running_since < now() - $2::interval)
         AND s.last_attempt_at <= now() - $3::interval
       RETURNING user_id`,
      [userId, stale, cooldown],
    );

    if ((acquired.rowCount ?? 0) > 0) return { status: "acquired" };

    const state = await query<{ running_since: Date | null; last_attempt_at: Date | null }>(
      `SELECT running_since, last_attempt_at FROM public.job_radar_sync_state WHERE user_id = $1`,
      [userId],
    );
    const row = state.rows[0];
    return classifyJobRadarSyncConflict({
      runningSince: row?.running_since ? row.running_since.getTime() : null,
      lastAttemptAt: row?.last_attempt_at ? row.last_attempt_at.getTime() : null,
    });
  } catch (error) {
    reportJobRadarSyncGuardUnavailable("acquire", error);
    return { status: "acquired" };
  }
}

/**
 * Clear the in-flight flag after a sync finishes, whether it succeeded or
 * threw. `last_attempt_at` is left untouched so the cooldown that prevents an
 * immediate replay stays in place. Best effort: if this write fails the flag
 * clears anyway on the next acquire once it passes the stale threshold.
 */
export async function releaseJobRadarSyncGuard(userId: string): Promise<void> {
  try {
    await query(
      `UPDATE public.job_radar_sync_state SET running_since = NULL WHERE user_id = $1`,
      [userId],
    );
  } catch (error) {
    reportJobRadarSyncGuardUnavailable("release", error);
  }
}

type JobRadarSyncOutcome = "ok" | "error" | "throttled" | "in_progress";

/**
 * One structured, greppable line per manual sync request. Structured
 * identifiers and outcome metadata only: never a provider credential, a full
 * external response or a raw error object.
 */
export function logJobRadarSyncOutcome(fields: {
  userId: string;
  outcome: JobRadarSyncOutcome;
  retryAfterSeconds?: number;
  checked?: number;
  inserted?: number;
  errors?: number;
  error?: string;
}): void {
  const parts = ["event=job_radar_sync", `outcome=${fields.outcome}`, `userId=${fields.userId}`];
  if (fields.retryAfterSeconds !== undefined) parts.push(`retryAfterSeconds=${fields.retryAfterSeconds}`);
  if (fields.checked !== undefined) parts.push(`checked=${fields.checked}`);
  if (fields.inserted !== undefined) parts.push(`inserted=${fields.inserted}`);
  if (fields.errors !== undefined) parts.push(`errors=${fields.errors}`);
  if (fields.error) parts.push(`error=${fields.error}`);
  const line = parts.join(" ");
  if (fields.outcome === "error") console.error(line);
  else console.info(line);
}

function reportJobRadarSyncGuardUnavailable(operation: "acquire" | "release", error: unknown): void {
  const disposition = operation === "acquire" ? "allowing the attempt (fail-open)" : "skipped release";
  console.error(
    `event=job_radar_sync_guard store=${GUARD_STORE} operation=${operation} outcome=store_unavailable; ${disposition}`,
    describeJobRadarSyncError(error),
  );
}
