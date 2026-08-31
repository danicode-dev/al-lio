import "server-only";
// Composes the feature-owned learning overview for server-rendered routes.

import { getActiveFpCycles } from "@/features/learning/server/catalogue-repository";
import { getLearningCompetenciesForCycle } from "@/features/learning/server/repository";
import type { DbProfile } from "@/lib/db/types";
import type { RoadmapOverview } from "@/lib/fp/roadmap";

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
  const completed = competencies.reduce((sum, item) => sum + item.completed_count, 0);
  const total = competencies.reduce((sum, item) => sum + item.resource_count, 0);
  const next = competencies.find((item) => item.completed_count < item.resource_count) ?? null;

  return {
    cycleName,
    cycleCode: profile.cycle_code,
    completion: { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 },
    nextStep: next
      ? {
          moduleCode: next.slug,
          moduleName: next.title,
          skillId: next.id,
          skillTitle: next.next_resource_slug ? "Continúa con el siguiente curso" : `Explora ${next.title}`,
          href: next.next_resource_slug ? `/aprende/${encodeURIComponent(next.next_resource_slug)}` : `/roadmap/${encodeURIComponent(next.slug)}`,
          hasContent: next.resource_count > 0,
        }
      : null,
    focusModules: competencies
      .filter((item) => item.completed_count < item.resource_count)
      .slice(0, 3)
      .map((item) => ({
        code: item.slug,
        name: item.title,
        completed: item.completed_count,
        total: item.resource_count,
        percent: item.resource_count > 0 ? Math.round((item.completed_count / item.resource_count) * 100) : 0,
        estimatedHours: null,
      })),
  };
}
