import { NextResponse } from "next/server";
import { tryGetCurrentUserId } from "@/lib/auth/current-user";
import {
  updateApplicationStatus,
  addApplicationNote,
  deleteApplication,
} from "@/lib/job-radar/store";
import {
  applicationIdSchema,
  applicationUpdateInputSchema,
} from "@/lib/job-radar/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await tryGetCurrentUserId();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const parsedId = applicationIdSchema.safeParse((await params).id);
    const parsedBody = applicationUpdateInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsedId.success || !parsedBody.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    if (parsedBody.data.status) {
      await updateApplicationStatus(userId, parsedId.data, parsedBody.data.status);
    }
    if (parsedBody.data.note) {
      await addApplicationNote(userId, parsedId.data, parsedBody.data.note);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Job Radar update failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await tryGetCurrentUserId();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const parsedId = applicationIdSchema.safeParse((await params).id);
    if (!parsedId.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    await deleteApplication(userId, parsedId.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Job Radar deletion failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
