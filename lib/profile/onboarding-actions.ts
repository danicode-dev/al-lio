"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { upsertProfile } from "@/lib/db/repositories/profiles";
import { CYCLE_CODES, ONBOARDING_INTEREST_OPTIONS, cycleGroupForCode } from "@/lib/profile/onboarding-options";
import type { FpAcademicYear } from "@/lib/db/types";

const onboardingSchema = z.object({
  cycleCode: z.enum(CYCLE_CODES),
  academicYear: z.enum(["1", "2"]).transform((value) => Number(value) as FpAcademicYear),
  interests: z.array(z.enum(ONBOARDING_INTEREST_OPTIONS)).max(ONBOARDING_INTEREST_OPTIONS.length),
});

export type OnboardingState = {
  error: string | null;
};

export async function completeOnboardingAction(
  _previousState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = onboardingSchema.safeParse({
    cycleCode: formData.get("cycleCode"),
    academicYear: formData.get("academicYear"),
    interests: formData.getAll("interests"),
  });

  if (!parsed.success) {
    return { error: "onboarding_invalid" };
  }

  const { cycleCode, academicYear, interests } = parsed.data;

  try {
    await upsertProfile(session.uid, {
      cycle_code: cycleCode,
      cycle_group: cycleGroupForCode(cycleCode),
      academic_year: academicYear,
      interests,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_version: 1,
    });
  } catch {
    return { error: "onboarding_save_failed" };
  }

  redirect("/dashboard");
}
