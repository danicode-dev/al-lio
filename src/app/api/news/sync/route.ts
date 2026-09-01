// COMPAT-REGISTER: news-json-sync (docs/architecture/COMPATIBILITY_REGISTER.md)
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return deprecatedResponse();
}

export async function GET() {
  return deprecatedResponse();
}

function deprecatedResponse() {
  return NextResponse.json(
    { ok: false, error: "legacy news sync disabled; AL-LIO Radar owns collection" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
