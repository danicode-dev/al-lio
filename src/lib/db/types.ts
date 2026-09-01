// ── PostgreSQL row types (matches infra/postgres/schema.sql) ──────────────────

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
  email_confirmed_at: string | null;
  security_stamp: string;
  created_at: string;
  updated_at: string;
}

export type AuthTokenPurpose = "email_confirm" | "password_reset";

export interface DbAuthToken {
  id: string;
  user_id: string;
  purpose: AuthTokenPurpose;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface DbExternalIdentity {
  id: string;
  user_id: string;
  provider: "google";
  provider_user_id: string;
  email: string;
  created_at: string;
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

type DbRadarDestination = "news" | "course" | "event" | "job";
type DbRadarLifecycle =
  | "announced"
  | "registration_open"
  | "registration_closed"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "postponed"
  | "evergreen";

export interface DbCanonicalOpportunityFacts {
  canonical_occurrence_id: string | null;
  canonical_destination: DbRadarDestination | null;
  canonical_opportunity_type: string | null;
  canonical_title: string | null;
  canonical_summary_short: string | null;
  canonical_summary_expanded: string | null;
  canonical_about_summary: string | null;
  canonical_organizer: string | null;
  canonical_provider: string | null;
  canonical_url: string | null;
  canonical_registration_url: string | null;
  canonical_starts_at: string | null;
  canonical_ends_at: string | null;
  canonical_registration_opens_at: string | null;
  canonical_registration_deadline: string | null;
  canonical_attendance_mode: string | null;
  canonical_country: string | null;
  canonical_autonomous_community: string | null;
  canonical_province: string | null;
  canonical_municipality: string | null;
  canonical_venue: string | null;
  canonical_address: string | null;
  canonical_duration_hours: number | null;
  canonical_course_difficulty: string | null;
  canonical_minimum_education: string | null;
  canonical_other_eligibility: string[];
  canonical_credential_level: string | null;
  canonical_price_state: "free" | "paid" | null;
  canonical_price_amount_minor: number | null;
  canonical_price_currency: string | null;
  canonical_certification: string | null;
  canonical_prize: string | null;
  canonical_requirements: string[];
  canonical_audience: string[];
  canonical_learning_outcomes: string[];
  canonical_skills_tested: string[];
  canonical_preparation_tips: string[];
  canonical_source_lifecycle_status: DbRadarLifecycle | null;
  canonical_source_verified_at: string | null;
}

type FpLearningRequirement = "essential" | "recommended";
type FpLearningLevel = "inicial" | "intermedio" | "avanzado";
export type FpLearningStatus = "started" | "completed";
export type FpLearningCompletionMethod = "observed" | "self_declared" | "legacy_unspecified";
type FpLearningResourceType = "youtube_video" | "youtube_playlist" | "internal_course" | "internal_lesson";
export type FpLearningResourceRole = "primary" | "alternative" | "extension";
type FpLearningAvailability = "unknown" | "available" | "unavailable" | "restricted";

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
  youtube_url: string | null;
  duration_seconds: number | null;
  review_status: "approved";
  reviewed_at: string;
  reviewed_by: string;
  review_reason: string;
  resource_type: FpLearningResourceType;
  provider_resource_id: string | null;
  canonical_url: string | null;
  deep_link: string | null;
  channel_id: string | null;
  channel_name: string | null;
  publication_state: "candidate_reverification" | "approved" | "rejected" | "retired";
  availability_state: FpLearningAvailability;
  source_kind: "radar" | "manual_review" | "legacy_import" | "internal_catalogue";
  source_ref: string | null;
  source_verified_at: string | null;
  resource_revision: number;
  radar_revision: number | null;
  supersedes_resource_id: string | null;
  provenance: Record<string, unknown>;
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
  completion_method: FpLearningCompletionMethod | null;
  last_observed_at: string | null;
  progress_revision: number;
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

// Explicit per-user competency completion (issue #96) - row existence means
// completed. Separate from DbFpUserContentState because a skill_id (text,
// references fp_skills) is not a content_item_id (uuid, references
// fp_content_items): a different key against a different table.
export interface DbFpUserCompetencyState {
  user_id: string;
  skill_id: string;
  completed_at: string;
  completion_method: "self_declared" | "resource_observed" | "legacy_unspecified";
  evidence_resource_id: string | null;
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
  is_favorite: boolean;
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
  is_favorite: boolean;
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
