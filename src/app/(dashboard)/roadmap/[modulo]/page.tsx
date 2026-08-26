import { notFound, redirect } from "next/navigation";
import { getValidatedSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getLearningCompetencyForCycle } from "@/lib/db/repositories/learning";
import { CompetencyCoursesView } from "@/components/learning/competency-courses-view";

export const dynamic = "force-dynamic";

export default async function CompetencyPage({ params }: { params: Promise<{ modulo: string }> }) {
  const { modulo } = await params;
  const session = await getValidatedSession();
  if (!session) redirect("/login");
  const profile = await getProfileByUser(session.uid);
  if (!profile?.cycle_code) notFound();
  const competency = await getLearningCompetencyForCycle(session.uid, profile.cycle_code, modulo);
  if (!competency) redirect("/roadmap");
  return <CompetencyCoursesView competency={competency} />;
}
