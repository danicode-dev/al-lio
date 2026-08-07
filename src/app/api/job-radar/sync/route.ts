import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { syncJobRadar } from "@/lib/job-radar/sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const result = await syncJobRadar(userId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
