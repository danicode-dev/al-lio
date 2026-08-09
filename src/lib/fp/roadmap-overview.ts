import "server-only";

import type { DbProfile } from "@/lib/db/types";
import {
  getActiveFpCycles,
  getCycleSkills,
  getLearningItemsForCompetencies,
  getSharedModuleCodes,
  getUserContentStatesForItems,
} from "@/lib/db/repositories/fp_catalog";
import {
  buildRoadmapModules,
  moduleCompletion,
  type RoadmapOverview,
  type RoadmapModule,
  type RoadmapSkillStatus,
} from "@/lib/fp/roadmap";

/**
 * Resumen de aprendizaje para superficies de producto (Dashboard y Roadmap).
 * La fuente de verdad sigue siendo el estado de los contenidos del alumno;
 * no se inventa una "ultima leccion" que todavia no persistimos.
 */
export async function getRoadmapOverview(
  userId: string,
  profile: Pick<DbProfile, "cycle_code" | "cycle_group">,
): Promise<{ overview: RoadmapOverview; modules: RoadmapModule[] } | null> {
  if (!profile.cycle_code || !profile.cycle_group) return null;

  const [cycleSkills, cycles, sharedModuleCodes] = await Promise.all([
    getCycleSkills(profile.cycle_code),
    getActiveFpCycles(),
    getSharedModuleCodes(),
  ]);

  const learningBySkill = await getLearningItemsForCompetencies(
    cycleSkills.map((skill) => skill.id),
    profile.cycle_group,
  );

  const primaryContentBySkill = new Map<string, string>();
  for (const [skillId, items] of learningBySkill) {
    const primary = items.find((item) => item.video_url) ?? items[0] ?? null;
    if (primary) primaryContentBySkill.set(skillId, primary.id);
  }

  const stateMap = await getUserContentStatesForItems(userId, [...primaryContentBySkill.values()]);
  const statusBySkillId = new Map<string, RoadmapSkillStatus>();

  for (const skill of cycleSkills) {
    const hasContent = (learningBySkill.get(skill.id)?.length ?? 0) > 0;
    if (!hasContent) {
      statusBySkillId.set(skill.id, "sin_contenido");
      continue;
    }

    const userStatus = stateMap.get(primaryContentBySkill.get(skill.id) ?? "");
    statusBySkillId.set(
      skill.id,
      userStatus === "completed" ? "completado" : userStatus === "started" ? "en_progreso" : "pendiente",
    );
  }

  const modules = buildRoadmapModules(cycleSkills, statusBySkillId, sharedModuleCodes);
  const visibleSkills = modules.flatMap((module) => module.skills).filter((skill) => skill.status !== "sin_contenido");
  const completed = visibleSkills.filter((skill) => skill.status === "completado").length;
  const total = visibleSkills.length;

  const mandatorySteps = modules
    .flatMap((module) => module.skills.map((skill) => ({ module, skill })));
  const next = mandatorySteps.find(({ skill }) => skill.obligatoria && (skill.status === "en_progreso" || skill.status === "pendiente"))
    ?? mandatorySteps.find(({ skill }) => skill.obligatoria && skill.status === "sin_contenido");

  const focusModules = modules
    .filter((module) => module.skills.some((skill) => skill.status !== "completado" && skill.status !== "sin_contenido"))
    .slice(0, 3)
    .map((module) => {
      const progress = moduleCompletion(module, false);
      const estimatedHours = module.skills.reduce<number | null>((sum, skill) => {
        if (skill.horasEstimadas == null) return sum;
        return (sum ?? 0) + skill.horasEstimadas;
      }, null);

      return {
        code: module.codigo,
        name: module.nombre,
        ...progress,
        estimatedHours,
      };
    });

  const cycleName = cycles.find((cycle) => cycle.code === profile.cycle_code)?.name ?? profile.cycle_code;

  return {
    modules,
    overview: {
      cycleName,
      cycleCode: profile.cycle_code,
      completion: {
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      nextStep: next
        ? {
            moduleCode: next.module.codigo,
            moduleName: next.module.nombre,
            skillId: next.skill.id,
            skillTitle: next.skill.titulo,
            href: `/roadmap/${encodeURIComponent(next.module.codigo)}?paso=${encodeURIComponent(next.skill.id)}`,
            hasContent: next.skill.status !== "sin_contenido",
          }
        : null,
      focusModules,
    },
  };
}
