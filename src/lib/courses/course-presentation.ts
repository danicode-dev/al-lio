import type { Course } from "@/components/store/types";

// One public presentation model shared by the course card and its detail
// view, across all three supported origins (user courses, fp_content_items,
// tech_opportunities - see Course.sourceTable). Centralizing the field
// fallback priority here means the card and the detail surface can never
// drift out of sync, and `description` has exactly one legitimate source:
// requisitos_resumen. It never falls back to `notes`, which can carry raw
// import/moderation provenance for tech_opportunities-sourced rows (see
// techOpportunityToCourse) - rendering that as student-facing copy is
// exactly the regression class fixed for Hackathons in issue #118.
export type CoursePresentation = {
  id: string;
  title: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  modality?: string;
  priority?: string;
  status: Course["status"];
  description?: string;
  sourceUrl?: string;
};

function nonEmpty(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getCoursePresentation(course: Course): CoursePresentation {
  return {
    id: course.id,
    title: nonEmpty(course.title) ?? "Curso sin titulo",
    provider: nonEmpty(course.entidad) ?? nonEmpty(course.platform),
    startDate: nonEmpty(course.fecha_inicio) ?? nonEmpty(course.start_at),
    endDate: nonEmpty(course.fecha_fin) ?? nonEmpty(course.deadline_at),
    location: [nonEmpty(course.localidad), nonEmpty(course.provincia)].filter(Boolean).join(" / ") || undefined,
    modality: nonEmpty(course.modalidad),
    priority: nonEmpty(course.prioridad),
    status: course.status,
    description: nonEmpty(course.requisitos_resumen),
    sourceUrl: nonEmpty(course.fuente_url) ?? nonEmpty(course.url),
  };
}
