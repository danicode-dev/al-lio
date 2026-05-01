import { NextRequest, NextResponse } from "next/server";
import { createGoogleAuthUrl } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
