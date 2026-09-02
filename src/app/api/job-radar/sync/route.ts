import { NextResponse } from "next/server";
import { tryGetCurrentUserId } from "@/lib/auth/current-user";
import { syncJobRadar } from "@/lib/job-radar/sync";
import {
  acquireJobRadarSyncGuard,
  logJobRadarSyncOutcome,
  releaseJobRadarSyncGuard,
} from "@/lib/job-radar/sync-guard";
import { describeJobRadarSyncError } from "@/lib/job-radar/sync-guard-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const userId = await tryGetCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Durable per-user guard before any outbound collector or sync-state write:
  // 429 while the cooldown has not elapsed, 409 while this user's sync is
  // already in flight. 409 (not 202) because nothing is queued - the request
  // simply did no work.
  const guard = await acquireJobRadarSyncGuard(userId);
  if (guard.status === "cooldown") {
    logJobRadarSyncOutcome({ userId, outcome: "throttled", retryAfterSeconds: guard.retryAfterSeconds });
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: guard.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(guard.retryAfterSeconds) } },
    );
  }
  if (guard.status === "running") {
    logJobRadarSyncOutcome({ userId, outcome: "in_progress" });
    return NextResponse.json({ error: "sync_in_progress" }, { status: 409 });
  }

  try {
    const result = await syncJobRadar(userId);
    logJobRadarSyncOutcome({
      userId,
      outcome: "ok",
      checked: result.checked,
      inserted: result.inserted,
      errors: result.errors,
    });
    return NextResponse.json(result);
  } catch (error) {
    logJobRadarSyncOutcome({ userId, outcome: "error", error: describeJobRadarSyncError(error) });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  } finally {
    await releaseJobRadarSyncGuard(userId);
  }
}
