import { redirect } from "next/navigation";
import { getValidatedSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getActiveFpCycles } from "@/lib/db/repositories/fp_catalog";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getValidatedSession();
  if (!session) redirect("/login");

  const [cycles, profile] = await Promise.all([
    getActiveFpCycles(),
    getProfileByUser(session.uid),
  ]);

  // A student who has already completed the questionnaire never sees it
  // again by typing the URL - the dashboard gate would send them back here,
  // so this is the other half of that pair.
  if (profile?.onboarding_completed_at && profile.cycle_code) {
    redirect("/dashboard");
  }

  return <OnboardingForm cycles={cycles} profile={profile} />;
}
