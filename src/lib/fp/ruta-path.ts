import "server-only";
import { getLearningItemsForCompetencies, getUserContentStatesForItems } from "@/lib/db/repositories/fp_catalog";
import { getResourceNotes } from "@/lib/db/repositories/fp_resource_notes";
import type { FpCycleCode } from "@/lib/db/types";
import type { RutaPathStep } from "@/components/ruta/ruta-path-view";

export type RutaPathSkillInput = {
  id: string;
  titulo: string;
  descripcion: string | null;
  obligatoria: boolean;
};

// Ensambla los pasos de RutaPathView a partir de cualquier lista de
// habilidades (las exigidas por un hackathon, o todas las de un modulo del
// Roadmap). El origen de la lista no importa aqui: solo necesita id/titulo/
// descripcion/obligatoria.
export async function buildRutaPathSteps(
  userId: string,
  skills: RutaPathSkillInput[],
  cycleCode: FpCycleCode
): Promise<RutaPathStep[]> {
  if (skills.length === 0) return [];

  const skillIds = skills.map((skill) => skill.id);
  const learningBySkill = await getLearningItemsForCompetencies(skillIds, cycleCode);

  const stepsRaw = skills.map((skill) => {
    const learningItems = learningBySkill.get(skill.id) ?? [];
    const primaryItem = learningItems.find((item) => item.video_url) ?? null;
    const otherItems = learningItems.filter((item) => item.id_slug !== primaryItem?.id_slug);
    return { skill, primaryItem, otherItems };
  });

  const primaryContentIds = stepsRaw
    .map((step) => step.primaryItem?.id)
    .filter((id): id is string => Boolean(id));

  const [statusMap, notesArrays] = await Promise.all([
    getUserContentStatesForItems(userId, primaryContentIds),
    Promise.all(primaryContentIds.map((id) => getResourceNotes(userId, id))),
  ]);
  const notesByContentId = new Map(primaryContentIds.map((id, index) => [id, notesArrays[index]]));

  return stepsRaw.map(({ skill, primaryItem, otherItems }) => ({
    competencyId: skill.id,
    title: skill.titulo,
    description: skill.descripcion,
    obligatoria: skill.obligatoria,
    primary: primaryItem
      ? {
          idSlug: primaryItem.id_slug,
          videoUrl: primaryItem.video_url as string,
          sourceUrl: primaryItem.source_url,
          resourceTitle: primaryItem.title,
        }
      : null,
    otherResources: otherItems.map((item) => ({
      idSlug: item.id_slug,
      title: item.title,
      sourceUrl: item.source_url,
    })),
    initialStatus: primaryItem ? statusMap.get(primaryItem.id) ?? null : null,
    initialNotes: primaryItem
      ? (notesByContentId.get(primaryItem.id) ?? []).map((note) => ({
          id: note.id,
          timestampSeconds: note.timestamp_seconds,
          body: note.body,
          createdAt: note.created_at,
        }))
      : [],
  }));
}
