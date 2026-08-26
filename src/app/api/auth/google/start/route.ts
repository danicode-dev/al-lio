import { NextRequest, NextResponse } from "next/server";
import { createGoogleIdentityAuthUrl } from "@/lib/google/identity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    return NextResponse.redirect(
      await createGoogleIdentityAuthUrl(req.nextUrl.searchParams.get("next")),
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo iniciar el acceso con Google" },
      { status: 500 },
    );
  }
}
