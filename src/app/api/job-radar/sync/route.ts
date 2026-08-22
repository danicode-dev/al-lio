import { NextResponse } from "next/server";
import { tryGetCurrentUserId } from "@/lib/auth/current-user";
import { syncJobRadar } from "@/lib/job-radar/sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const userId = await tryGetCurrentUserId();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const result = await syncJobRadar(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Job Radar synchronization failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
