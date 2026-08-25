"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getFpContentItemBySlugForCycle, upsertFpUserContentState } from "@/lib/db/repositories/fp_catalog";
import { addResourceNote } from "@/lib/db/repositories/fp_resource_notes";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import type { DbFpResourceNote, DbFpUserContentState } from "@/lib/db/types";

const CONTENT_STATUSES = new Set<DbFpUserContentState["status"]>(["saved", "started", "completed", "dismissed"]);

async function getAuthorizedResource(userId: string, idSlug: string) {
  const profile = await getProfileByUser(userId);
  if (!profile?.cycle_code) return null;
  return getFpContentItemBySlugForCycle(idSlug, profile.cycle_code);
}

export async function addResourceNoteAction(
  idSlug: string,
  timestampSeconds: number,
  body: string
): Promise<{ error: string | null; note: DbFpResourceNote | null }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const trimmedBody = body.trim();
  const safeTimestamp = Math.floor(timestampSeconds);

  if (!trimmedBody || !Number.isFinite(safeTimestamp) || safeTimestamp < 0) {
    return { error: "note_invalid", note: null };
  }

  const item = await getAuthorizedResource(session.uid, idSlug);
  if (!item) return { error: "resource_not_found", note: null };

  try {
    const note = await addResourceNote(session.uid, item.id, safeTimestamp, trimmedBody);
    return { error: null, note };
  } catch {
    return { error: "note_save_failed", note: null };
  }
}

export async function toggleFavoriteAction(
  idSlug: string,
  isFavorite: boolean
): Promise<{ error: string | null }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const item = await getAuthorizedResource(session.uid, idSlug);
  if (!item) return { error: "resource_not_found" };

  try {
    await upsertFpUserContentState(session.uid, item.id, { is_favorite: isFavorite });
    return { error: null };
  } catch {
    return { error: "favorite_save_failed" };
  }
}

export async function markResourceStatusAction(
  idSlug: string,
  status: DbFpUserContentState["status"]
): Promise<{ error: string | null; status: DbFpUserContentState["status"] | null }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!CONTENT_STATUSES.has(status)) {
    return { error: "status_invalid", status: null };
  }

  const item = await getAuthorizedResource(session.uid, idSlug);
  if (!item) return { error: "resource_not_found", status: null };

  try {
    const state = await upsertFpUserContentState(session.uid, item.id, {
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    });
    revalidatePath("/roadmap");
    revalidatePath("/dashboard");
    revalidatePath("/courses");
    revalidatePath("/hackathons");
    return { error: null, status: state.status };
  } catch {
    return { error: "status_save_failed", status: null };
  }
}
