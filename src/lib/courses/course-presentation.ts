import type { Course, FpCatalogItem } from "@/components/store/types";
import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";

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
  type?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  modality?: string;
  courseDifficulty?: string;
  minimumEducation?: string;
  otherEligibility: string[];
  credentialLevel?: string;
  duration?: string;
  certification?: string;
  requirements: string[];
  learningOutcomes: string[];
  price?: string;
  lifecycle?: string;
  status: Course["status"];
  description?: string;
  sourceUrl?: string;
  verifiedAt?: string;
};

function nonEmpty(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getCoursePresentation(course: Course): CoursePresentation {
  const canonical = course.canonical?.destination === "course" ? course.canonical : undefined;
  const hours = canonical?.durationHours
    ?? (typeof course.horas_totales === "number" && course.horas_totales > 0 ? course.horas_totales : undefined);
  const amount = canonical?.priceState === "free"
    ? "Gratis"
    : canonical?.priceState === "paid" && canonical.priceAmountMinor !== undefined && canonical.priceCurrency
      ? new Intl.NumberFormat("es-ES", { style: "currency", currency: canonical.priceCurrency }).format(canonical.priceAmountMinor / 100)
      : nonEmpty(typeof course.price === "string" ? course.price : course.coste);
  return {
    id: course.id,
    title: canonical?.title ?? nonEmpty(course.title) ?? "Curso",
    provider: canonical?.provider ?? canonical?.organizer ?? nonEmpty(course.entidad) ?? nonEmpty(course.platform),
    type: canonical?.opportunityType ?? nonEmpty(course.category),
    startDate: canonical?.startsAt ?? nonEmpty(course.fecha_inicio) ?? nonEmpty(course.start_at),
    endDate: canonical?.endsAt ?? nonEmpty(course.fecha_fin) ?? nonEmpty(course.deadline_at),
    location: canonical
      ? [canonical.venue ?? canonical.municipality, canonical.province].filter(Boolean).join(" / ") || undefined
      : [nonEmpty(course.localidad), nonEmpty(course.provincia)].filter(Boolean).join(" / ") || undefined,
    modality: canonical?.attendanceMode ?? nonEmpty(course.modalidad),
    courseDifficulty: canonical?.courseDifficulty,
    minimumEducation: canonical?.minimumEducation,
    otherEligibility: canonical?.otherEligibility ?? [],
    credentialLevel: canonical?.credentialLevel,
    duration: hours ? `${hours} h` : undefined,
    certification: canonical?.certification ?? nonEmpty(course.certificacion_tipo),
    requirements: canonical?.requirements ?? (nonEmpty(course.requisitos_resumen) ? [course.requisitos_resumen!.trim()] : []),
    learningOutcomes: canonical?.learningOutcomes ?? [],
    price: amount,
    lifecycle: canonical?.sourceLifecycleStatus,
    status: course.status,
    description: canonical?.aboutSummary ?? canonical?.summaryExpanded ?? canonical?.summaryShort,
    sourceUrl: canonical?.registrationUrl ?? canonical?.canonicalUrl ?? nonEmpty(course.fuente_url) ?? nonEmpty(course.url),
    verifiedAt: canonical?.sourceVerifiedAt,
  };
}

// Extracted from guest-app.tsx (mirrors the identical extraction for
// hackathons in issue #135's hackathon-presentation.ts) so the internal
// detail route - a Server Component - can resolve and authorize a single
// course by id using the exact same mapping/eligibility rules the client
// card list already uses, instead of a second, potentially-drifting
// implementation. guest-app.tsx still owns getDisplayCourses/
// courseIdentityKey (list-only concerns with no server-side caller), and
// imports the functions below rather than redefining them.

// Duplicated (not imported) from hackathon-presentation.ts's identical
// helpers: this module is loaded directly (relative, extensionless) by
// both the Next.js build and the plain `node --test` runner, which -
// unlike Next's resolver - does not resolve path aliases or extensionless
// relative specifiers for .ts files, including transitively through a
// second local module. Both copies are tiny and stable.
const DIACRITICS_PATTERN = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function techCategory(item: TechOpportunity) {
  return String(item.categoria || "").trim().toLowerCase();
}

function textLooksPositive(value?: string | null) {
  const normalized = String(value || "").toLowerCase().normalize("NFD").replace(DIACRITICS_PATTERN, "");
  return normalized.startsWith("si") || normalized.includes("beca formativa");
}

// item.notes carries import/moderation provenance (issue #118) - never
// student-facing. Only the suggested action is public copy.
function fpItemNotes(item: FpCatalogItem) {
  return item.suggested_action || undefined;
}

const techCourseCategories = new Set(["curso"]);
const fpCourseTypes = new Set(["curso_basico", "curso_complementario", "herramienta", "recurso", "evidencia_recomendada"]);

export function isTechCourse(item: TechOpportunity) {
  return techCourseCategories.has(techCategory(item));
}

export function isFpCourseLike(item: FpCatalogItem) {
  return fpCourseTypes.has(item.type);
}

function normalizeCourseStatus(value?: string | null): Course["status"] {
  const normalized = String(value || "").toLowerCase().normalize("NFD").replace(DIACRITICS_PATTERN, "");
  if (normalized.includes("final") || normalized.includes("termin")) return "terminado";
  if (normalized.includes("paus")) return "pausado";
  if (normalized.includes("descart")) return "descartado";
  if (normalized.includes("curso") || normalized.includes("abiert")) return "empezado";
  return "pendiente";
}

// The per-user fp_user_content_state status (saved/started/completed/dismissed)
// takes priority over the catalogue's own display status once the student has
// actually interacted with the item - "saved" alone isn't a lifecycle verdict,
// so it falls through to the catalogue status like an untouched item would.
function fpUserStatusToCourseStatus(userStatus?: string | null): Course["status"] | undefined {
  if (userStatus === "completed") return "terminado";
  if (userStatus === "dismissed") return "descartado";
  if (userStatus === "started") return "empezado";
  return undefined;
}

export function techOpportunityToCourse(item: TechOpportunity): Course {
  return {
    id: `tech-${item.id_slug}`,
    id_slug: item.id_slug,
    title: item.nombre,
    platform: item.entidad ?? undefined,
    url: item.fuente_url ?? undefined,
    price: item.coste ?? undefined,
    category: item.area_o_tipo ?? item.categoria ?? undefined,
    start_at: item.fecha_inicio ?? "",
    deadline_at: item.fecha_fin ?? "",
    status: normalizeCourseStatus(item.estado),
    entidad: item.entidad ?? undefined,
    area: item.area_o_tipo ?? undefined,
    modalidad: item.modalidad ?? undefined,
    localidad: item.localidad ?? undefined,
    provincia: item.provincia ?? undefined,
    certificacion_tipo: item.certificacion_o_premio ?? undefined,
    practicas_empresa: textLooksPositive(item.practicas_empresa),
    horas_totales: item.horas_totales ?? undefined,
    horas_practicas: item.horas_practicas ?? undefined,
    fecha_inicio: item.fecha_inicio ?? undefined,
    fecha_fin: item.fecha_fin ?? undefined,
    estado: item.estado ?? undefined,
    coste: item.coste ?? undefined,
    requisitos_resumen: item.requisitos_resumen ?? undefined,
    encaje_daw_1_5: item.encaje_daw_1_5 ?? undefined,
    prioridad: item.prioridad ?? undefined,
    tags: item.tags ?? undefined,
    fuente_url: item.fuente_url ?? undefined,
    ultima_revision: item.ultima_revision ?? undefined,
    notes: [item.requisitos_resumen, item.notas].filter(Boolean).join("\n\n") || undefined,
    sourceTable: "tech_opportunities",
    created_at: item.created_at,
  };
}

export function fpItemToCourse(item: FpCatalogItem): Course {
  const canonical = item.canonical?.destination === "course" ? item.canonical : undefined;
  return {
    id: `fp-${item.id_slug}`,
    id_slug: item.id_slug,
    title: canonical?.title ?? item.title,
    platform: canonical?.provider ?? canonical?.organizer ?? item.entity ?? undefined,
    url: canonical?.registrationUrl ?? canonical?.canonicalUrl ?? item.source_url ?? undefined,
    price: item.cost ?? undefined,
    category: canonical?.opportunityType ?? item.type,
    start_at: canonical?.startsAt ?? item.start_date ?? "",
    deadline_at: canonical?.endsAt ?? item.end_date ?? "",
    status: canonical ? (fpUserStatusToCourseStatus(item.user_status) ?? "pendiente") : (fpUserStatusToCourseStatus(item.user_status) ?? normalizeCourseStatus(item.status)),
    entidad: canonical?.provider ?? canonical?.organizer ?? item.entity ?? undefined,
    area: canonical?.opportunityType ?? item.type,
    modalidad: canonical?.attendanceMode ?? item.delivery_mode ?? undefined,
    localidad: canonical?.venue ?? canonical?.municipality ?? item.location ?? undefined,
    provincia: canonical?.province ?? item.province ?? undefined,
    certificacion_tipo: canonical?.certification ?? item.certification ?? undefined,
    practicas_empresa: item.practices === "si",
    fecha_inicio: canonical?.startsAt ?? item.start_date ?? undefined,
    fecha_fin: canonical?.endsAt ?? item.end_date ?? undefined,
    estado: canonical?.sourceLifecycleStatus ?? item.status ?? undefined,
    coste: item.cost ?? undefined,
    requisitos_resumen: canonical?.requirements.join("; ") || item.description || undefined,
    prioridad: item.priority,
    tags: item.tags ?? undefined,
    fuente_url: canonical?.registrationUrl ?? canonical?.canonicalUrl ?? item.source_url ?? undefined,
    notes: fpItemNotes(item),
    sourceTable: "fp_content_items",
    is_favorite: item.is_favorite ?? false,
    aptitudes: item.courseAptitudes,
    canonical,
    user_status: item.user_status,
    created_at: item.created_at,
  };
}

// Resolves a single course by its display id (mirrors resolveHackathonById
// from issue #135 exactly, including the authorization reasoning: an id
// that doesn't resolve here was never sent to this user in the first
// place, since courses/techOpportunities/fpContent are already per-user/
// per-cycle scoped by their respective repository queries - "not found"
// and "not yours" are indistinguishable here by construction).
export function resolveCourseById(
  id: string,
  courses: Course[],
  techOpportunities: TechOpportunity[],
  fpContent: FpCatalogItem[],
): Course | null {
  if (id.startsWith("tech-")) {
    const slug = id.slice("tech-".length);
    const item = techOpportunities.find((candidate) => candidate.id_slug === slug && isTechCourse(candidate));
    return item ? techOpportunityToCourse(item) : null;
  }
  if (id.startsWith("fp-")) {
    const slug = id.slice("fp-".length);
    const item = fpContent.find((candidate) => candidate.id_slug === slug && isFpCourseLike(candidate));
    return item ? fpItemToCourse(item) : null;
  }
  return courses.find((candidate) => candidate.id === id) ?? null;
}
