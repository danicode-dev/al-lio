import { redirect } from "next/navigation";
import { getValidatedSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getActiveFpCycles } from "@/features/learning/server";
import { getUserById } from "@/lib/db/repositories/users";
import { getLearningOverview } from "@/features/learning/domain";
import { ProfileForm } from "@/features/account";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getValidatedSession();
  if (!session) redirect("/login");

  const profile = await getProfileByUser(session.uid);

  if (!profile || !profile.onboarding_completed_at) redirect("/onboarding");
  if (!profile.cycle_code) redirect("/onboarding");

  const [cycles, user, learningOverview] = await Promise.all([
    getActiveFpCycles(),
    getUserById(session.uid),
    getLearningOverview(session.uid, profile),
  ]);

  return (
    <ProfileForm
      cycles={cycles}
      profile={profile}
      account={{ email: user?.email ?? session.email, displayName: user?.display_name ?? profile.display_name ?? profile.full_name }}
      learningOverview={learningOverview}
    />
  );
}
