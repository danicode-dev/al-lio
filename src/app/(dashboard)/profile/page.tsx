import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getActiveFpCycles } from "@/lib/db/repositories/fp_catalog";
import { getUserById } from "@/lib/db/repositories/users";
import { getLearningOverview } from "@/lib/learning/overview";
import { getLearningNotebookSummary } from "@/lib/db/repositories/learning";
import { ProfileForm } from "@/components/profile/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await getProfileByUser(session.uid);

  if (!profile || !profile.onboarding_completed_at) redirect("/onboarding");
  if (!profile.cycle_code) redirect("/onboarding");
  const cycleCode = profile.cycle_code;

  const [cycles, user, learningOverview, learningNotebook] = await Promise.all([
    getActiveFpCycles(),
    getUserById(session.uid),
    getLearningOverview(session.uid, profile),
    getLearningNotebookSummary(session.uid, cycleCode),
  ]);

  return (
    <ProfileForm
      cycles={cycles}
      profile={profile}
      account={{ email: user?.email ?? session.email, displayName: user?.display_name ?? profile.display_name ?? profile.full_name }}
      learningOverview={learningOverview}
      learningNotebook={learningNotebook}
    />
  );
}
