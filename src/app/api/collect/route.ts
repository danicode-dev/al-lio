import { NextResponse } from "next/server";

// Retired public trigger.
//
// This endpoint previously ran four external job collectors on an
// unauthenticated GET. A repository search on the 2026-08-31 baseline found no
// in-repository runtime caller, no workflow and no script that invokes it, and
// no documented external operational caller. It is therefore failed closed: it
// never runs a collector and always returns a non-success compatibility
// response.
//
// The collector modules under `src/lib/integrations/` are intentionally left in
// place; their retention or removal is issue #276's decision, not this one
// (issue #282).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { error: "gone", detail: "This endpoint has been retired." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
