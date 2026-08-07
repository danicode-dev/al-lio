import { NextResponse } from "next/server";
import { setItemStatus } from "@/lib/news/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const item = await setItemStatus(id, "saved");
  if (!item) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}
