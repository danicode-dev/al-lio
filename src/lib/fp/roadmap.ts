import type { FpCompetencyEtapa } from "@/lib/db/types";

type RoadmapSkillStatus = "completado" | "en_progreso" | "pendiente" | "sin_contenido";

type RoadmapSkill = {
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

export function moduleCompletion(mod: RoadmapModule, onlyMandatory: boolean) {
  const skills = onlyMandatory ? mod.skills.filter((skill) => skill.obligatoria) : mod.skills;
  const total = skills.length;
  const completed = skills.filter((skill) => skill.status === "completado").length;
  return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}
