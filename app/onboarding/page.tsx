import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getActiveFpCycles } from "@/lib/db/repositories/fp_catalog";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [cycles, profile] = await Promise.all([
    getActiveFpCycles(),
    getProfileByUser(session.uid),
  ]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <OnboardingForm cycles={cycles} profile={profile} />
    </main>
  );
}
