import "server-only";
// Composes the feature-owned learning overview for server-rendered routes.

import { getActiveFpCycles } from "@/features/learning/server/catalogue-repository";
import { getLearningCompetenciesForCycle } from "@/features/learning/server/repository";
import type { DbProfile } from "@/lib/db/types";
import type { RoadmapOverview } from "@/lib/fp/roadmap";
import { buildRoadmapOverview } from "./roadmap-overview";

export async function getLearningOverview(
  userId: string,
  profile: Pick<DbProfile, "cycle_code">,
): Promise<RoadmapOverview | null> {
  if (!profile.cycle_code) return null;
  const [competencies, cycles] = await Promise.all([
    getLearningCompetenciesForCycle(userId, profile.cycle_code),
    getActiveFpCycles(),
  ]);
  const cycleName = cycles.find((cycle) => cycle.code === profile.cycle_code)?.name ?? profile.cycle_code;
  return buildRoadmapOverview(competencies, cycleName, profile.cycle_code);
}
