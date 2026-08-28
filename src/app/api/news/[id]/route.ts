import { NextResponse } from "next/server";
import { tryGetCurrentUserId } from "@/lib/auth/current-user";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getNextRadarNewsItem, getRadarItemDetailForUser } from "@/lib/db/repositories/radar";
import { isValidRadarItemId } from "@/lib/radar/item-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await tryGetCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isValidRadarItemId(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const profile = await getProfileByUser(userId);
  if (!profile?.cycle_code) {
    return NextResponse.json({ error: "complete your FP profile first" }, { status: 409 });
  }

  const item = await getRadarItemDetailForUser(userId, profile.cycle_code, id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  const nextItem = await getNextRadarNewsItem(userId, profile.cycle_code, item.id);
  return NextResponse.json({ item, nextItem }, { headers: { "Cache-Control": "private, no-store" } });
}
