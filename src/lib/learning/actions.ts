"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import {
  addLearningNoteToBloc,
  getLearningResourceForCycle,
  upsertLearningProgress,
} from "@/lib/db/repositories/learning";
import type { DbFpLearningNote, FpLearningStatus } from "@/lib/db/types";

const MAX_POSITION_SECONDS = 60 * 60 * 48;
const MAX_NOTE_LENGTH = 4000;

async function getAuthorizedResource(userId: string, resourceSlug: string) {
  const profile = await getProfileByUser(userId);
  if (!profile?.cycle_code) return null;
  return getLearningResourceForCycle(userId, profile.cycle_code, resourceSlug);
}

function normalizeSeconds(value: number, maximum = MAX_POSITION_SECONDS) {
  if (!Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  if (normalized < 0 || normalized > maximum) return null;
  return normalized;
}

export async function saveLearningProgressAction(
  resourceSlug: string,
  positionSeconds: number,
  durationSeconds: number | null,
  status: FpLearningStatus = "started",
): Promise<{ error: string | null; positionSeconds: number | null; status: FpLearningStatus | null }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const safePosition = normalizeSeconds(positionSeconds);
  const safeDuration = durationSeconds == null ? null : normalizeSeconds(durationSeconds);
  if (safePosition == null || (durationSeconds != null && (!safeDuration || safePosition > safeDuration + 60))) {
    return { error: "progress_invalid", positionSeconds: null, status: null };
  }
  if (status !== "started" && status !== "completed") {
    return { error: "status_invalid", positionSeconds: null, status: null };
  }

  const resource = await getAuthorizedResource(session.uid, resourceSlug);
  if (!resource) return { error: "resource_not_found", positionSeconds: null, status: null };

  try {
    const state = await upsertLearningProgress(session.uid, resource.id, {
      status,
      lastPositionSeconds: status === "completed" ? 0 : safePosition,
      durationSeconds: safeDuration,
    });
    if (status === "completed") {
      revalidatePath("/roadmap");
      revalidatePath(`/roadmap/${resource.competency_slug}`);
      revalidatePath("/dashboard");
      revalidatePath("/profile");
    }
    return { error: null, positionSeconds: state.last_position_seconds, status: state.status };
  } catch {
    return { error: "progress_save_failed", positionSeconds: null, status: null };
  }
}

export async function addLearningNoteAction(
  resourceSlug: string,
  timestampSeconds: number,
  body: string,
): Promise<{ error: string | null; note: DbFpLearningNote | null }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const safeTimestamp = normalizeSeconds(timestampSeconds);
  const safeBody = body.trim();
  if (safeTimestamp == null || !safeBody || safeBody.length > MAX_NOTE_LENGTH) {
    return { error: "note_invalid", note: null };
  }

  const resource = await getAuthorizedResource(session.uid, resourceSlug);
  if (!resource) return { error: "resource_not_found", note: null };

  try {
    const note = await addLearningNoteToBloc(session.uid, resource, safeTimestamp, safeBody);
    return { error: null, note };
  } catch {
    return { error: "note_save_failed", note: null };
  }
}
