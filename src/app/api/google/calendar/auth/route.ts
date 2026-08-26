import { NextRequest, NextResponse } from "next/server";
import { createGoogleAuthUrl } from "@/lib/google/calendar";
import { getValidatedSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Calendar consent is an optional action inside the authenticated product
// (issue #132) - it must never be reachable as a way to log in or create an
// account. That flow now lives at /api/auth/google/start.
export async function GET(req: NextRequest) {
  const session = await getValidatedSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  try {
    return NextResponse.redirect(
      await createGoogleAuthUrl(req.nextUrl.searchParams.get("next")),
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo iniciar Google Calendar" },
      { status: 500 },
    );
  }
}
