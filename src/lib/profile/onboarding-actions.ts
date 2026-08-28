"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getValidatedSession } from "@/lib/auth/session";
import { upsertProfile } from "@/lib/db/repositories/profiles";
import { CYCLE_CODES, cycleGroupForCode } from "@/lib/profile/onboarding-options";
import type { FpAcademicYear } from "@/lib/db/types";

const studentProfileSchema = z.object({
  cycleCode: z.enum(CYCLE_CODES),
  academicYear: z.enum(["1", "2"]).transform((value) => Number(value) as FpAcademicYear),
});

export type OnboardingState = {
  error: string | null;
};

export async function completeOnboardingAction(
  _previousState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const session = await getValidatedSession();
  if (!session) redirect("/login");

  const parsed = studentProfileSchema.safeParse({
    cycleCode: formData.get("cycleCode"),
    academicYear: formData.get("academicYear"),
  });

  if (!parsed.success) {
    return { error: "onboarding_invalid" };
  }

  const { cycleCode, academicYear } = parsed.data;

  try {
    await upsertProfile(session.uid, {
      cycle_code: cycleCode,
      cycle_group: cycleGroupForCode(cycleCode),
      academic_year: academicYear,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_version: 1,
    });
  } catch {
    return { error: "onboarding_save_failed" };
  }

  redirect("/dashboard");
}

export type ProfileUpdateState = {
  error: string | null;
  savedAt: number | null;
};

export async function updateProfileAction(
  previousState: ProfileUpdateState,
  formData: FormData
): Promise<ProfileUpdateState> {
  const session = await getValidatedSession();
  if (!session) redirect("/login");

  const parsed = studentProfileSchema.safeParse({
    cycleCode: formData.get("cycleCode"),
    academicYear: formData.get("academicYear"),
  });

  if (!parsed.success) {
    return { error: "onboarding_invalid", savedAt: previousState.savedAt };
  }

  const { cycleCode, academicYear } = parsed.data;

  try {
    await upsertProfile(session.uid, {
      cycle_code: cycleCode,
      cycle_group: cycleGroupForCode(cycleCode),
      academic_year: academicYear,
    });
  } catch {
    return { error: "onboarding_save_failed", savedAt: previousState.savedAt };
  }

  revalidatePath("/profile");
  return { error: null, savedAt: Date.now() };
}
