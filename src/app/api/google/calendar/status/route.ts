import { NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/auth/session";
import { clearGoogleTokens, getCalendarCredentialStatus } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getValidatedSession();
  if (!session) return NextResponse.json({ connected: false }, { status: 401 });

  try {
    const status = await getCalendarCredentialStatus(session.uid);
    if (status === "legacy" || status === "mismatch") {
      // A credential with no owner, or one bound to a different AL-LÍO user,
      // is never trusted for this session. Clear it and ask for a reconnect
      // rather than guessing its owner (issue #280).
      await clearGoogleTokens();
      return NextResponse.json({ connected: false, reconnect: true });
    }
    return NextResponse.json({ connected: status === "ok" });
  } catch {
    return NextResponse.json({ connected: false, error: "calendar_status_unavailable" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getValidatedSession();
  if (!session) return NextResponse.json({ connected: false }, { status: 401 });

  try {
    await clearGoogleTokens();
    return NextResponse.json({ connected: false });
  } catch {
    return NextResponse.json({ connected: false, error: "calendar_disconnect_failed" }, { status: 500 });
  }
}
