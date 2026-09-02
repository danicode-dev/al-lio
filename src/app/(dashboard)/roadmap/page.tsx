import { notFound, redirect } from "next/navigation";
import { getValidatedSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getActiveFpCycles, getLearningCompetenciesForCycle } from "@/features/learning/server";
import { LEARNING_CATALOG_DISCLAIMER } from "@/lib/learning/catalog";
import { CompetenciesView } from "@/features/learning/client";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const session = await getValidatedSession();
  if (!session) redirect("/login");

  const profile = await getProfileByUser(session.uid);
  if (!profile?.cycle_code) notFound();

  const [competencies, cycles] = await Promise.all([
    getLearningCompetenciesForCycle(session.uid, profile.cycle_code),
    getActiveFpCycles(),
  ]);
  const cycleName = cycles.find((cycle) => cycle.code === profile.cycle_code)?.name ?? profile.cycle_code;

  return <CompetenciesView cycleName={cycleName} competencies={competencies} disclaimer={LEARNING_CATALOG_DISCLAIMER} />;
}
