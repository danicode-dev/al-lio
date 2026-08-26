"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getValidatedSession } from "@/lib/auth/session";
import { getCycleSkillById, markUserCompetencyCompleted } from "@/lib/db/repositories/fp_catalog";
import { getProfileByUser } from "@/lib/db/repositories/profiles";

async function getAuthorizedSkill(userId: string, skillId: string) {
  const profile = await getProfileByUser(userId);
  if (!profile?.cycle_code) return null;
  return getCycleSkillById(profile.cycle_code, skillId);
}

export async function markCompetencyCompletedAction(skillId: string): Promise<{ error: string | null }> {
  const session = await getValidatedSession();
  if (!session) redirect("/login");

  const skill = await getAuthorizedSkill(session.uid, skillId);
  if (!skill) return { error: "skill_not_found" };

  try {
    await markUserCompetencyCompleted(session.uid, skillId);
    revalidatePath("/hackathons");
    return { error: null };
  } catch {
    return { error: "competency_save_failed" };
  }
}
