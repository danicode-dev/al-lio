import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await checkDatabaseConnection();
    return NextResponse.json(
      { ok: true, app: "al-lio", database: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, app: "al-lio", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
