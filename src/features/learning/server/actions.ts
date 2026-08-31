"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  getCycleSkillById,
  getFpContentItemBySlugForCycle,
  markUserCompetencyCompleted,
  upsertFpUserContentState,
} from "@/features/learning/server/catalogue-repository";
import { getProfileByUser } from "@/lib/db/repositories/profiles";

const slugSchema = z.string().trim().min(1).max(240);
const skillIdSchema = z.string().trim().min(1).max(240);
const contentStatusSchema = z.enum(["saved", "started", "completed", "dismissed"]);

async function getAuthorizedResource(userId: string, idSlug: string) {
  const profile = await getProfileByUser(userId);
  if (!profile?.cycle_code) return null;
  return getFpContentItemBySlugForCycle(idSlug, profile.cycle_code);
}

export async function toggleLearningFavoriteAction(input: unknown): Promise<{ error: string | null }> {
  const parsed = z.object({ idSlug: slugSchema, isFavorite: z.boolean() }).strict().safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const userId = await getCurrentUserId();
  const item = await getAuthorizedResource(userId, parsed.data.idSlug);
  if (!item) return { error: "resource_not_found" };
  try {
    await upsertFpUserContentState(userId, item.id, { is_favorite: parsed.data.isFavorite });
    return { error: null };
  } catch {
    return { error: "favorite_save_failed" };
  }
}

export async function markLearningResourceStatusAction(input: unknown): Promise<{ error: string | null }> {
  const parsed = z.object({ idSlug: slugSchema, status: contentStatusSchema }).strict().safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const userId = await getCurrentUserId();
  const item = await getAuthorizedResource(userId, parsed.data.idSlug);
  if (!item) return { error: "resource_not_found" };
  try {
    await upsertFpUserContentState(userId, item.id, {
      status: parsed.data.status,
      completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
    });
    revalidatePath("/roadmap");
    revalidatePath("/courses");
    revalidatePath("/hackathons");
    return { error: null };
  } catch {
    return { error: "status_save_failed" };
  }
}

export async function markLearningCompetencyCompletedAction(input: unknown): Promise<{ error: string | null }> {
  const parsed = z.object({ skillId: skillIdSchema }).strict().safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };
  const userId = await getCurrentUserId();
  const profile = await getProfileByUser(userId);
  if (!profile?.cycle_code) return { error: "skill_not_found" };
  const skill = await getCycleSkillById(profile.cycle_code, parsed.data.skillId);
  if (!skill) return { error: "skill_not_found" };
  try {
    await markUserCompetencyCompleted(userId, parsed.data.skillId);
    revalidatePath("/hackathons");
    return { error: null };
  } catch {
    return { error: "competency_save_failed" };
  }
}
