import type { FpCompetencyEtapa } from "@/lib/db/types";
import type { CycleSkill } from "@/features/learning/server/catalogue-repository";

export type RoadmapSkillStatus = "completado" | "en_progreso" | "pendiente" | "sin_contenido";

export type RoadmapSkill = {
  id: string;
  titulo: string;
  descripcion: string | null;
  horasEstimadas: number | null;
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
  esComun: boolean;
};

export type RoadmapOverview = {
  cycleName: string;
  cycleCode: string;
  completion: {
    completed: number;
    total: number;
    percent: number;
  };
  nextStep: {
    moduleCode: string;
    moduleName: string;
    skillId: string;
    skillTitle: string;
    href: string;
    hasContent: boolean;
  } | null;
  focusModules: Array<{
    code: string;
    name: string;
    completed: number;
    total: number;
    percent: number;
    estimatedHours: number | null;
  }>;
};

const ETAPA_ORDER: FpCompetencyEtapa[] = [
  "0_antes_de_empezar",
  "1_fundamentos",
  "2_aplicacion",
  "3_empleabilidad",
  "4_proyecto",
];

// Group a cycle's flat skill list into formal modules. A module can span two
// stages; in that case use the earliest stage because that is when the student
// first encounters it.
export function buildRoadmapModules(
  cycleSkills: CycleSkill[],
  statusBySkillId: Map<string, RoadmapSkillStatus>,
  sharedModuleCodes: Set<string>
): RoadmapModule[] {
  const byModule = new Map<string, RoadmapModule>();

  for (const cs of cycleSkills) {
    const codigo = cs.modulo_codigo ?? "sin-modulo";
    const nombre = cs.modulo_nombre ?? "Sin módulo asignado";

    let mod = byModule.get(codigo);
    if (!mod) {
      mod = {
        codigo,
        nombre,
        etapa: cs.etapa,
        ordenGlobal: cs.orden_global,
        skills: [],
        esComun: sharedModuleCodes.has(codigo),
      };
      byModule.set(codigo, mod);
    } else {
      if (ETAPA_ORDER.indexOf(cs.etapa) < ETAPA_ORDER.indexOf(mod.etapa)) mod.etapa = cs.etapa;
      mod.ordenGlobal = Math.min(mod.ordenGlobal, cs.orden_global);
    }

    mod.skills.push({
      id: cs.id,
      titulo: cs.titulo,
      descripcion: cs.descripcion,
      horasEstimadas: cs.horas_estimadas,
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
