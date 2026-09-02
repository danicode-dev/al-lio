import type { RoadmapOverview } from "@/lib/fp/roadmap";

/**
 * Pure roadmap-overview aggregation, split from `getLearningOverview` so the
 * progress maths (completion percent, next step, focus modules) has direct
 * executable coverage instead of only being exercised through the server
 * route. No `server-only` and no runtime module alias, so
 * tests/unit/learning/roadmap-overview.test.mjs runs it directly.
 */

export type RoadmapCompetencyInput = {
  id: string;
  slug: string;
  title: string;
  completed_count: number;
  resource_count: number;
  next_resource_slug: string | null;
};

function percent(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export function buildRoadmapOverview(
  competencies: RoadmapCompetencyInput[],
  cycleName: string,
  cycleCode: string,
): RoadmapOverview {
  const completed = competencies.reduce((sum, item) => sum + item.completed_count, 0);
  const total = competencies.reduce((sum, item) => sum + item.resource_count, 0);
  const next = competencies.find((item) => item.completed_count < item.resource_count) ?? null;

  return {
    cycleName,
    cycleCode,
    completion: { completed, total, percent: percent(completed, total) },
    nextStep: next
      ? {
          moduleCode: next.slug,
          moduleName: next.title,
          skillId: next.id,
          skillTitle: next.next_resource_slug ? "Continúa con el siguiente curso" : `Explora ${next.title}`,
          href: next.next_resource_slug
            ? `/aprende/${encodeURIComponent(next.next_resource_slug)}`
            : `/roadmap/${encodeURIComponent(next.slug)}`,
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
        percent: percent(item.completed_count, item.resource_count),
        estimatedHours: null,
      })),
  };
}
