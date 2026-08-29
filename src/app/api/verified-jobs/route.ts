import { NextResponse } from "next/server";
import { tryGetCurrentUserId } from "@/lib/auth/current-user";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { listVerifiedJobsForUser, verifiedJobsEnabled } from "@/lib/jobs/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = await tryGetCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!verifiedJobsEnabled()) {
    return NextResponse.json(
      { enabled: false, jobs: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const profile = await getProfileByUser(userId);
  if (!profile?.cycle_code) {
    return NextResponse.json({ error: "complete your FP profile first" }, { status: 409 });
  }
  const rawLimit = Number(new URL(req.url).searchParams.get("limit") ?? 100);
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 100;
  const jobs = await listVerifiedJobsForUser(userId, profile.cycle_code, limit);
  return NextResponse.json(
    { enabled: true, jobs },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
