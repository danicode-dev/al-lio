// ── PostgreSQL row types (matches infra/postgres/schema.sql) ──────────────────

export interface DbJobApplication {
  id: string;
  user_id: string;
  company_name: string;
  company_url: string;
  job_title: string;
  job_url: string | null;
  source: string;
  page_hash: string | null;
  status: string;
  detected_at: string;
  applied_at: string | null;
  notes: Array<{ text: string; created_at: string }>;
  is_new: boolean;
  is_saved: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCompany {
  id: string;
  id_slug: string;
  nombre: string;
  web: string | null;
  empleo_url: string | null;
  tipo_empleo: string | null;
  categoria: string | null;
  granada_note: string | null;
  fuente: string | null;
  cycle_group: FpCycleGroup;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbUser {
  id: string;
  email: string;
  password_hash: string | null;
  display_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export type FpCycleCode = "DAW" | "DAM" | "AF" | "TSAF" | "MP";
export type FpCycleGroup = "DEV" | "AF" | "TSAF" | "MP";
export type FpAcademicYear = 1 | 2;

export interface DbProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  target_role: string | null;
  main_location: string | null;
  skills: string[] | null;
  cycle_code: FpCycleCode | null;
  cycle_group: FpCycleGroup | null;
  academic_year: FpAcademicYear | null;
  interests: string[];
  onboarding_completed_at: string | null;
  onboarding_version: number;
  created_at: string;
  updated_at: string;
}

export interface DbFpCycle {
  code: FpCycleCode;
  group_code: FpCycleGroup;
  name: string;
  short_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbFpContentItem {
  id: string;
  id_slug: string;
  type: string;
  title: string;
  description: string;
  entity: string | null;
  delivery_mode: string | null;
  location: string | null;
  province: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  cost: string | null;
  certification: string | null;
  practices: string | null;
  source_url: string;
  tags: string[];
  suggested_action: string | null;
  last_reviewed_at: string | null;
  notes: string | null;
  source_year: string;
  video_url: string | null;
  radar_semantic_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbFpResourceNote {
  id: string;
  user_id: string;
  content_item_id: string;
  timestamp_seconds: number;
  body: string;
  created_at: string;
  updated_at: string;
}

export type FpLearningRequirement = "essential" | "recommended";
export type FpLearningLevel = "inicial" | "intermedio" | "avanzado";
export type FpLearningStatus = "started" | "completed";

export interface DbFpLearningCompetency {
  id: string;
  cycle_code: FpCycleCode;
  slug: string;
  title: string;
  description: string;
  requirement: FpLearningRequirement;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbFpLearningResource {
  id: string;
  slug: string;
  title: string;
  description: string;
  provider: string;
  language: "es";
  level: FpLearningLevel;
  youtube_url: string;
  duration_seconds: number | null;
  review_status: "approved";
  reviewed_at: string;
  reviewed_by: string;
  review_reason: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbFpUserLearningState {
  user_id: string;
  resource_id: string;
  status: FpLearningStatus;
  last_position_seconds: number;
  duration_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface DbFpLearningNote {
  id: string;
  user_id: string;
  resource_id: string;
  timestamp_seconds: number;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface DbFpContentCycleFit {
  content_item_id: string;
  cycle_code: FpCycleCode;
  cycle_group: FpCycleGroup;
  priority: "Alta" | "Media" | "Baja";
  fit_score: number;
  audience_year: FpAcademicYear | null;
  created_at: string;
  updated_at: string;
}

export interface DbFpUserContentState {
  user_id: string;
  content_item_id: string;
  status: "saved" | "started" | "completed" | "dismissed";
  is_favorite: boolean;
  notes: string | null;
  reminder_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type FpCompetencyEtapa =
  | "0_antes_de_empezar"
  | "1_fundamentos"
  | "2_aplicacion"
  | "3_empleabilidad"
  | "4_proyecto";

export type FpItemCompetencyRelation = "requiere" | "ensena" | "demuestra";

// Canonical skill catalogue: one row per real skill without cycle duplication.
// For example, Git remains one row even when DAW and DAM both require it. Cycle
// placement belongs to DbFpCycleSkill.
export interface DbFpSkill {
  id: string;
  titulo: string;
  descripcion: string | null;
  horas_estimadas: number | null;
  criterios_superacion: string | null;
  evidencia_minima: string | null;
  umbral_superacion: string | null;
  aplicable_a: string | null;
  fuente_titulo_url: string | null;
  fuente_curriculo_url: string | null;
  tipo_criterio: string | null;
  ultima_revision: string | null;
  created_at: string;
  updated_at: string;
}

// Placement of a skill inside one cycle path. A skill shared by several cycles
// has one relationship row per cycle and the same skill_id in each row.
export interface DbFpCycleSkill {
  cycle_code: FpCycleCode;
  skill_id: string;
  orden_global: number;
  etapa: FpCompetencyEtapa;
  bloque: string | null;
  modulo_codigo: string | null;
  modulo_nombre: string | null;
  nivel_objetivo: number | null;
  obligatoria_roadmap_base: boolean;
  basico_antes_de_empezar: boolean;
  prerrequisito_texto: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbFpItemCompetency {
  content_item_id: string;
  skill_id: string;
  tipo_relacion: FpItemCompetencyRelation;
  orden_preparacion: number | null;
  nivel_minimo_recomendado: number | null;
  obligatoria_para_item: boolean;
  motivo_relacion: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSource {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  source_type: "api" | "rss" | "deeplink" | "manual";
  status: "active" | "planned" | "disabled";
  logo_url: string | null;
  base_url: string | null;
  last_checked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbQuickSearch {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  keyword: string;
  location: string | null;
  generated_url: string;
  category: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOpportunity {
  id: string;
  user_id: string;
  source: string;
  source_type: string | null;
  title: string;
  company: string | null;
  description: string | null;
  location: string | null;
  province: string | null;
  remote: boolean | null;
  url: string;
  published_at: string | null;
  detected_at: string | null;
  category: string | null;
  tags: string[] | null;
  level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  status: string;
  score: number | null;
  external_id: string | null;
  unique_hash: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbHackathon {
  id: string;
  user_id: string;
  id_slug: string | null;
  categoria: string | null;
  name: string;
  organizer: string | null;
  logo_url: string | null;
  province: string;
  city: string | null;
  type: string;
  modalidad: string | null;
  localidad: string | null;
  status: string;
  event_start_date: string | null;
  event_end_date: string | null;
  registration_deadline: string | null;
  inscripcion_hasta: string | null;
  certificacion_o_premio: string | null;
  practicas_empresa: boolean | null;
  encaje_daw_1_5: number | null;
  tags: string | null;
  incluido_en_readme_original: boolean | null;
  ultima_revision: string | null;
  detected_at: string | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  url: string | null;
  notes: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCourse {
  id: string;
  user_id: string;
  id_slug: string | null;
  title: string;
  platform: string | null;
  url: string | null;
  price: number | null;
  category: string | null;
  status: string;
  start_date: string | null;
  deadline: string | null;
  entidad: string | null;
  area: string | null;
  modalidad: string | null;
  localidad: string | null;
  provincia: string | null;
  formato: string | null;
  certificacion_tipo: string | null;
  certificacion_oficial: boolean | null;
  practicas_empresa: boolean | null;
  horas_totales: number | null;
  horas_practicas: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
  coste: string | null;
  requisitos_resumen: string | null;
  encaje_daw_1_5: number | null;
  prioridad: string | null;
  tags: string | null;
  fuente_url: string | null;
  ultima_revision: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  completed_at: string | null;
  progress_notes: unknown[];
  reminder_at: string | null;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBlocNote {
  id: string;
  user_id: string;
  title: string;
  content_html: string;
  content_text: string;
  is_favorite: boolean;
  source_type: "learning_resource" | null;
  source_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbReminder {
  id: string;
  user_id: string;
  title: string;
  remind_at: string;
  related_type: string | null;
  related_id: string | null;
  sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbQuickLink {
  id: string;
  user_id: string;
  name: string;
  url: string;
  category: string | null;
  icon: string | null;
  description: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTechOpportunity {
  id: string;
  id_slug: string;
  categoria: string | null;
  nombre: string;
  entidad: string | null;
  area_o_tipo: string | null;
  modalidad: string | null;
  localidad: string | null;
  provincia: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
  certificacion_o_premio: string | null;
  practicas_empresa: string | null;
  horas_totales: number | null;
  horas_practicas: number | null;
  coste: string | null;
  requisitos_resumen: string | null;
  encaje_daw_1_5: number | null;
  prioridad: string | null;
  tags: string | null;
  fuente_url: string | null;
  ultima_revision: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

// ── App domain types ──────────────────────────────────────────────────────────

export type EntityStatus = {
  opportunity: "guardada" | "pendiente_revision" | "aplicada" | "entrevista" | "rechazada" | "descartada";
  hackathon: "inscripcion_abierta" | "pendiente" | "realizado" | "revisar_futura_edicion" | "descartado";
  task: "pendiente" | "en_progreso" | "completada" | "pospuesta" | "cancelada";
  course: "pendiente" | "empezado" | "terminado" | "pausado" | "descartado";
};

export type NormalizedOpportunity = {
  source: string;
  source_type: "api" | "rss" | "deeplink" | "manual";
  title: string;
  company?: string;
  description?: string;
  location?: string;
  province?: string;
  remote?: boolean;
  url: string;
  published_at?: string;
  detected_at?: string;
  category?: string;
  tags?: string[];
  level?: string;
  salary_min?: number;
  salary_max?: number;
  status?: string;
  score?: number;
  external_id?: string;
  unique_hash?: string;
};

export type HackathonSeed = {
  name: string;
  organizer: string;
  province: string;
  city: string;
  type: string;
  status: EntityStatus["hackathon"];
  url: string;
  notes: string;
  priority: "alta" | "media" | "baja";
};
