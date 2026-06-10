// ── PostgreSQL row types (matches infra/postgres/schema.sql) ──────────────────

export interface DbUser {
  id: string;
  email: string;
  password_hash: string | null;
  display_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface DbProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  target_role: string | null;
  main_location: string | null;
  skills: string[] | null;
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
