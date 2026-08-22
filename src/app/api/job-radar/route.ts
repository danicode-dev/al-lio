import { NextResponse } from "next/server";
import { tryGetCurrentUserId } from "@/lib/auth/current-user";
import { getApplications, insertManualApplication } from "@/lib/job-radar/store";
import { manualApplicationInputSchema } from "@/lib/job-radar/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function internalError(operation: string, error: unknown) {
  console.error(`Job Radar ${operation} failed`, error);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

export async function GET() {
  try {
    const userId = await tryGetCurrentUserId();
    if (!userId) return unauthorized();
    const applications = await getApplications(userId);
    return NextResponse.json(
      { applications },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return internalError("list", error);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await tryGetCurrentUserId();
    if (!userId) return unauthorized();
    const parsed = manualApplicationInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const application = await insertManualApplication(userId, parsed.data);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return internalError("create", error);
  }
}
