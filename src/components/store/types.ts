import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";
import type { RoadmapOverview } from "@/lib/fp/roadmap";

export type TaskStatus = "pendiente" | "en_progreso" | "completada" | "pospuesta" | "cancelada";
export type TaskPriority = "alta" | "media" | "baja" | "critica";

export type ProgressNote = {
  id: string;
  text: string;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  due_at?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  reminder_at?: string;
  progress_notes: ProgressNote[];
  created_at: string;
  completed_at?: string;
};

export type Opportunity = {
  id: string;
  title: string;
  company?: string;
  url?: string;
  status: string;
  location?: string;
  created_at: string;
};

export type Course = {
  id: string;
  id_slug?: string;
  title: string;
  platform?: string;
  url?: string;
  price?: number | string;
  category?: string;
  start_at?: string;
  deadline_at?: string;
  status: "pendiente" | "empezado" | "terminado" | "pausado" | "descartado";
  entidad?: string;
  area?: string;
  modalidad?: string;
  localidad?: string;
  provincia?: string;
  formato?: string;
  certificacion_tipo?: string;
  certificacion_oficial?: boolean;
  practicas_empresa?: boolean;
  horas_totales?: number;
  horas_practicas?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  coste?: string;
  requisitos_resumen?: string;
  encaje_daw_1_5?: number;
  prioridad?: string;
  tags?: string | string[];
  fuente_url?: string;
  ultima_revision?: string;
  notes?: string;
  sourceTable?: "courses" | "tech_opportunities" | "fp_content_items";
  created_at: string;
};

export type RequiredCompetencyLearningItem = {
  skill_id: string;
  id: string;
  id_slug: string;
  title: string;
  type: string;
  source_url: string;
  video_url: string | null;
  tipo_relacion: string;
  user_status?: string | null;
};

// Canonical skill required by a hackathon or event. The same skill can be
// linked from several cycles, so stage and target-level information belongs to
// the cycle relationship rather than the skill itself.
export type RequiredCompetency = {
  id: string;
  titulo: string;
  descripcion?: string;
  horas_estimadas?: number;
  evidencia_minima?: string;
  obligatoria_para_item: boolean;
  orden_preparacion?: number;
  learningItems: RequiredCompetencyLearningItem[];
};

export type FpCatalogItem = {
  id: string;
  id_slug: string;
  type: string;
  title: string;
  description?: string;
  entity?: string;
  delivery_mode?: string;
  location?: string;
  province?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  cost?: string;
  certification?: string;
  practices?: string;
  source_url?: string;
  tags?: string[];
  suggested_action?: string;
  notes?: string;
  priority: "Alta" | "Media" | "Baja";
  requiredCompetencies?: RequiredCompetency[];
  is_favorite?: boolean;
  user_status?: string | null;
  user_completed_at?: string | null;
  created_at: string;
};

export type Hackathon = {
  id: string;
  id_slug?: string;
  categoria?: string;
  name: string;
  organizer?: string;
  province?: string;
  city?: string;
  type?: string;
  modalidad?: string;
  localidad?: string;
  status: "inscripcion_abierta" | "pendiente" | "realizado" | "revisar_futura_edicion" | "descartado";
  priority: "alta" | "media" | "baja";
  start_at?: string;
  end_at?: string;
  registration_deadline_at?: string;
  inscripcion_hasta?: string;
  certificacion_o_premio?: string;
  practicas_empresa?: boolean;
  encaje_daw_1_5?: number;
  tags?: string | string[];
  incluido_en_readme_original?: boolean;
  ultima_revision?: string;
  url?: string;
  notes?: string;
  sourceTable?: "hackathons" | "tech_opportunities" | "fp_content_items";
  requiredCompetencies?: RequiredCompetency[];
  is_favorite?: boolean;
  created_at: string;
};

export type Company = {
  id: string;
  nombre: string;
  web?: string;
  empleo_url?: string;
  categoria?: string;
  granada_note?: string;
  is_favorite: boolean;
};

export type QuickLink = {
  id: string;
  name: string;
  url: string;
  category?: string;
  created_at: string;
};

export type Store = {
  version: 2;
  userName?: string;
  tasks: Task[];
  opportunities: Opportunity[];
  techOpportunities: TechOpportunity[];
  courses: Course[];
  hackathons: Hackathon[];
  fpContent: FpCatalogItem[];
  links: QuickLink[];
  reminders: unknown[];
  roadmap: RoadmapOverview | null;
  companies: Company[];
  loadIssues?: Array<"tasks" | "courses" | "hackathons" | "opportunities" | "companies" | "roadmap">;
};

export type ReturnTypeActions = {
  addTask: (data: Omit<Task, "id" | "created_at" | "progress_notes"> & { progress_notes?: ProgressNote[] }) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => void;
  addTaskNote: (id: string, text: string) => void;
  addCourse: (data: Omit<Course, "id" | "created_at">) => Promise<void>;
  updateCourse: (id: string, data: Partial<Course>) => Promise<void>;
  completeCourse: (course: Course) => Promise<void>;
  addHackathon: (data: Omit<Hackathon, "id" | "created_at">) => Promise<void>;
  updateHackathon: (id: string, data: Partial<Hackathon>) => void;
  addLink: (data: Omit<QuickLink, "id" | "created_at">) => void;
  toggleFpFavorite: (idSlug: string, nextValue: boolean) => void;
  toggleCompanyFavorite: (companyId: string) => void;
  markLearningItemDone: (idSlug: string) => void;
  reset: () => void;
};
