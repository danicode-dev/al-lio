import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import {
  getActiveFpCycles,
  getCycleSkills,
  getLearningItemsForCompetencies,
  getSharedModuleCodes,
  getUserContentStatesForItems,
} from "@/lib/db/repositories/fp_catalog";
import { buildRoadmapModules, type RoadmapSkillStatus } from "@/lib/fp/roadmap";
import { RoadmapView } from "@/components/roadmap/roadmap-view";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await getProfileByUser(session.uid);
  if (!profile?.cycle_code || !profile.cycle_group) notFound();

  const [cycleSkills, cycles, sharedModuleCodes] = await Promise.all([
    getCycleSkills(profile.cycle_code),
    getActiveFpCycles(),
    getSharedModuleCodes(),
  ]);
  const cycleName = cycles.find((cycle) => cycle.code === profile.cycle_code)?.name ?? profile.cycle_code;

  const skillIds = cycleSkills.map((skill) => skill.id);
  const learningBySkill = await getLearningItemsForCompetencies(skillIds, profile.cycle_group);

  const primaryContentBySkill = new Map<string, string>();
  for (const [skillId, items] of learningBySkill) {
    const primary = items.find((item) => item.video_url) ?? items[0] ?? null;
    if (primary) primaryContentBySkill.set(skillId, primary.id);
  }
  const stateMap = await getUserContentStatesForItems(session.uid, [...primaryContentBySkill.values()]);

  const statusBySkillId = new Map<string, RoadmapSkillStatus>();
  for (const skill of cycleSkills) {
    const hasContent = (learningBySkill.get(skill.id)?.length ?? 0) > 0;
    if (!hasContent) {
      statusBySkillId.set(skill.id, "sin_contenido");
      continue;
    }
    const primaryId = primaryContentBySkill.get(skill.id);
    const userStatus = primaryId ? stateMap.get(primaryId) : null;
    if (userStatus === "completed") statusBySkillId.set(skill.id, "completado");
    else if (userStatus === "started") statusBySkillId.set(skill.id, "en_progreso");
    else statusBySkillId.set(skill.id, "pendiente");
  }

  const modules = buildRoadmapModules(cycleSkills, statusBySkillId, sharedModuleCodes);

  return <RoadmapView cycleName={cycleName} modules={modules} />;
}
