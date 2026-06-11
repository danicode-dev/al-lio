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
  nueva:         "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  revisada:      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  aplicada:      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  en_proceso:    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  descartada:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  sin_respuesta: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  oferta:        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
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
  source: "radar" | "manual";
  page_hash: string | null;
  status: ApplicationStatus;
  detected_at: string;
  applied_at: string | null;
  notes: ApplicationNote[];
  is_new: boolean;
  is_saved: boolean;
  created_at: string;
  updated_at: string;
}

export interface RadarCompany {
  name: string;
  careers_url: string;
}
