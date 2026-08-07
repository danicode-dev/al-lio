import { NextResponse } from "next/server";
import { forceSync, syncIfNeeded } from "@/lib/news/sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";
  try {
    const status = force ? await forceSync() : await syncIfNeeded(true);
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("[news/sync] failed:", (err as Error).message);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// Permite también GET para uso desde scripts CLI / cron locales
export async function GET() {
  try {
    const status = await syncIfNeeded(false);
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
