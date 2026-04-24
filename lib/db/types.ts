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
