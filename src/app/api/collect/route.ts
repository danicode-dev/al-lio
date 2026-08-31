// Retired public trigger.
//
// This endpoint previously ran four external job collectors on an
// unauthenticated GET. A repository search on the 2026-08-31 baseline found no
// in-repository runtime caller, no workflow and no script that invokes it, and
// no documented external operational caller. It is therefore failed closed: it
// never runs a collector and always returns a non-success compatibility
// response.
//
// The unreachable collector implementation and its unused credential contract
// were removed after the repository-hygiene classification in issue #334. The
// route stays as an explicit compatibility response so an old caller cannot
// silently fall through to a different handler or trigger external work.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { error: "gone", detail: "This endpoint has been retired." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
