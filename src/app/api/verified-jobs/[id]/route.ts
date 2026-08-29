import { NextResponse } from "next/server";
import { z } from "zod";
import { tryGetCurrentUserId } from "@/lib/auth/current-user";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { applyVerifiedJobPrivateAction, verifiedJobsEnabled } from "@/lib/jobs/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().uuid();
const actionSchema = z.object({ action: z.enum(["save", "unsave", "applied", "dismiss"]) }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await tryGetCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!verifiedJobsEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const profile = await getProfileByUser(userId);
  if (!profile?.cycle_code) return NextResponse.json({ error: "complete your FP profile first" }, { status: 409 });
  const id = idSchema.safeParse((await params).id);
  const body = actionSchema.safeParse(await req.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const state = await applyVerifiedJobPrivateAction({
    userId,
    cycleCode: profile.cycle_code,
    occurrenceId: id.data,
    action: body.data.action,
  });
  if (!state) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ state }, { headers: { "Cache-Control": "private, no-store" } });
}
