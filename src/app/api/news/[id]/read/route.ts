import { NextResponse } from "next/server";
import { tryGetCurrentUserId } from "@/lib/auth/current-user";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { setRadarItemStatus } from "@/lib/db/repositories/radar";
import { isValidRadarItemId } from "@/lib/radar/item-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await tryGetCurrentUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isValidRadarItemId(id)) return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  const profile = await getProfileByUser(userId);
  if (!profile?.cycle_code) return NextResponse.json({ ok: false, error: "profile incomplete" }, { status: 409 });
  const updated = await setRadarItemStatus(userId, profile.cycle_code, id, "read");
  if (!updated) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
