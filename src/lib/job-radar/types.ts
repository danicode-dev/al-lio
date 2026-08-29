export type ApplicationStatus =
  | "nueva"
  | "revisada"
  | "aplicada"
  | "en_proceso"
  | "descartada"
  | "sin_respuesta"
  | "oferta";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "nueva",
  "revisada",
  "aplicada",
  "en_proceso",
  "descartada",
  "sin_respuesta",
  "oferta",
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  nueva:         "Nueva",
  revisada:      "Revisada",
  aplicada:      "Aplicada",
  en_proceso:    "En proceso",
  descartada:    "Descartada",
  sin_respuesta: "Sin respuesta",
  oferta:        "Oferta",
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  nueva:         "bg-blue-100 text-blue-800",
  revisada:      "bg-slate-100 text-slate-700",
  aplicada:      "bg-yellow-100 text-yellow-800",
  en_proceso:    "bg-purple-100 text-purple-800",
  descartada:    "bg-red-100 text-red-700",
  sin_respuesta: "bg-orange-100 text-orange-800",
  oferta:        "bg-green-100 text-green-800",
};

export interface ApplicationNote {
  text: string;
  created_at: string;
}

export interface JobApplication {
  id: string;
  user_id: string;
  company_name: string;
  company_url: string;
  job_title: string;
  job_url: string | null;
  source: "radar" | "manual" | "verified_radar";
  canonical_occurrence_id: string | null;
  canonical_entity_id: string | null;
  page_hash: string | null;
  status: ApplicationStatus;
  detected_at: string;
  applied_at: string | null;
  notes: ApplicationNote[];
  is_new: boolean;
  is_saved: boolean;
  is_dismissed: boolean;
  created_at: string;
  updated_at: string;
}

export interface RadarCompany {
  name: string;
  careers_url: string;
}
