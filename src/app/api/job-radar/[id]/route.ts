import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  updateApplicationStatus,
  addApplicationNote,
  deleteApplication,
} from "@/lib/job-radar/store";
import type { ApplicationStatus } from "@/lib/job-radar/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    const { id } = await params;
    const body = await req.json() as { status?: ApplicationStatus; note?: string };

    if (body.status) {
      await updateApplicationStatus(userId, id, body.status);
    }
    if (body.note?.trim()) {
      await addApplicationNote(userId, id, body.note.trim());
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    const { id } = await params;
    await deleteApplication(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
