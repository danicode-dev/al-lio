import type { FpCompetencyEtapa } from "@/lib/db/types";
import type { CycleSkill } from "@/lib/db/repositories/fp_catalog";

export type RoadmapSkillStatus = "completado" | "en_progreso" | "pendiente" | "sin_contenido";

export type RoadmapSkill = {
  id: string;
  titulo: string;
  descripcion: string | null;
  obligatoria: boolean;
  ordenGlobal: number;
  status: RoadmapSkillStatus;
};

export type RoadmapModule = {
  codigo: string;
  nombre: string;
  etapa: FpCompetencyEtapa;
  ordenGlobal: number;
  skills: RoadmapSkill[];
};

const ETAPA_ORDER: FpCompetencyEtapa[] = [
  "0_antes_de_empezar",
  "1_fundamentos",
  "2_aplicacion",
  "3_empleabilidad",
  "4_proyecto",
];

// Agrupa las habilidades planas de un ciclo en sus modulos formales. Un
// modulo puede pisar dos etapas (ej. un modulo con contenido de fundamentos
// y de aplicacion); en ese caso se queda con la etapa mas temprana, porque
// es cuando el alumno empieza a tocarlo.
export function buildRoadmapModules(
  cycleSkills: CycleSkill[],
  statusBySkillId: Map<string, RoadmapSkillStatus>
): RoadmapModule[] {
  const byModule = new Map<string, RoadmapModule>();

  for (const cs of cycleSkills) {
    const codigo = cs.modulo_codigo ?? "sin-modulo";
    const nombre = cs.modulo_nombre ?? "Sin módulo asignado";

    let mod = byModule.get(codigo);
    if (!mod) {
      mod = { codigo, nombre, etapa: cs.etapa, ordenGlobal: cs.orden_global, skills: [] };
      byModule.set(codigo, mod);
    } else {
      if (ETAPA_ORDER.indexOf(cs.etapa) < ETAPA_ORDER.indexOf(mod.etapa)) mod.etapa = cs.etapa;
      mod.ordenGlobal = Math.min(mod.ordenGlobal, cs.orden_global);
    }

    mod.skills.push({
      id: cs.id,
      titulo: cs.titulo,
      descripcion: cs.descripcion,
      obligatoria: cs.obligatoria_roadmap_base,
      ordenGlobal: cs.orden_global,
      status: statusBySkillId.get(cs.id) ?? "sin_contenido",
    });
  }

  const modules = [...byModule.values()];
  for (const mod of modules) mod.skills.sort((a, b) => a.ordenGlobal - b.ordenGlobal);
  modules.sort((a, b) => a.ordenGlobal - b.ordenGlobal);
  return modules;
}

export function moduleCompletion(mod: RoadmapModule, onlyMandatory: boolean) {
  const skills = onlyMandatory ? mod.skills.filter((skill) => skill.obligatoria) : mod.skills;
  const total = skills.length;
  const completed = skills.filter((skill) => skill.status === "completado").length;
  return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}
