import { NextResponse } from "next/server";
import { clearGoogleTokens, isGoogleCalendarConnected } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ connected: await isGoogleCalendarConnected() });
  } catch (error) {
    return NextResponse.json({ connected: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearGoogleTokens();
    return NextResponse.json({ connected: false });
  } catch (error) {
    return NextResponse.json({ connected: false, error: (error as Error).message }, { status: 500 });
  }
}
