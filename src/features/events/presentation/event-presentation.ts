import type { FpCatalogItem, Hackathon } from "@/components/store/types";
import type { EventActions } from "@/features/events/client/use-event-actions";
import type { LearningActions } from "@/features/learning/client";
import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";

// Kept local to the feature because this module is loaded directly by both the
// module is loaded directly (relative, extensionless) by both the Next.js
// build and the plain `node --test` runner, which - unlike Next's resolver -
// does not resolve path aliases or extensionless relative specifiers for
// .ts files. A real cross-module import here would work in one and break
// the other. The function is tiny and stable; if it ever changes, update
// both copies.
function fpUserStatusToHackathonStatus(userStatus?: string | null): Hackathon["status"] | undefined {
  if (userStatus === "completed") return "realizado";
  if (userStatus === "dismissed") return "descartado";
  return undefined;
}

// Shared by the Events feature and its internal detail route so the Server
// Component can resolve and authorize a single item by id using
// the exact same mapping/eligibility rules the client card list already
// uses, instead of a second, potentially-drifting implementation. List-only
// display and identity concerns stay owned by the Events feature.

// Strips combining diacritical marks (the NFD decomposition of accented
// letters) after String.prototype.normalize("NFD"), so "según"/"segun" and
// similar variants compare equal - mirrors the same normalize+strip idiom
// used throughout the Events feature for status/category text matching.
const DIACRITICS_PATTERN = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

const techHackathonCategories = new Set(["hackathon_reto"]);
const techEventCategories = new Set(["evento_tech", "reto_programacion", "concurso_programacion"]);
const fpHackathonTypes = new Set(["hackathon", "evento", "reto", "convocatoria_practicas"]);

export function techCategory(item: TechOpportunity) {
  return String(item.categoria || "").trim().toLowerCase();
}

function isTechHackathon(item: TechOpportunity) {
  const category = techCategory(item);
  return techHackathonCategories.has(category) || category.includes("hackathon");
}

export function isTechHackathonOrEvent(item: TechOpportunity) {
  const category = techCategory(item);
  return isTechHackathon(item) || techEventCategories.has(category) || category.includes("evento") || category.includes("reto") || category.includes("concurso");
}

export function isFpHackathonLike(item: FpCatalogItem) {
  return fpHackathonTypes.has(item.type);
}

export function textLooksPositive(value?: string | null) {
  const normalized = String(value || "").toLowerCase().normalize("NFD").replace(DIACRITICS_PATTERN, "");
  return normalized.startsWith("si") || normalized.includes("beca formativa");
}

export function normalizeHackathonStatus(value?: string | null): Hackathon["status"] {
  const normalized = String(value || "").toLowerCase().normalize("NFD").replace(DIACRITICS_PATTERN, "");
  if (normalized.includes("final") || normalized.includes("realiz")) return "realizado";
  if (normalized.includes("descart")) return "descartado";
  if (normalized.includes("abiert") || normalized.includes("inscrip")) return "inscripcion_abierta";
  if (normalized.includes("futura")) return "revisar_futura_edicion";
  return "pendiente";
}

export function normalizeTechPriority(value?: string | null): Hackathon["priority"] {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("alta")) return "alta";
  if (normalized.includes("baja")) return "baja";
  return "media";
}

// item.notes carries import/moderation provenance (issue #118) - never
// student-facing. Only the suggested action is public copy.
export function fpItemNotes(item: FpCatalogItem) {
  return item.suggested_action || undefined;
}

export function techOpportunityToHackathon(item: TechOpportunity): Hackathon {
  return {
    id: `tech-${item.id_slug}`,
    id_slug: item.id_slug,
    categoria: item.categoria ?? undefined,
    name: item.nombre,
    organizer: item.entidad ?? undefined,
    province: item.provincia ?? undefined,
    city: item.localidad ?? undefined,
    type: item.area_o_tipo ?? item.categoria ?? undefined,
    modalidad: item.modalidad ?? undefined,
    localidad: item.localidad ?? undefined,
    status: normalizeHackathonStatus(item.estado),
    priority: normalizeTechPriority(item.prioridad),
    start_at: item.fecha_inicio ?? "",
    end_at: item.fecha_fin ?? "",
    registration_deadline_at: "",
    certificacion_o_premio: item.certificacion_o_premio ?? undefined,
    practicas_empresa: textLooksPositive(item.practicas_empresa),
    encaje_daw_1_5: item.encaje_daw_1_5 ?? undefined,
    tags: item.tags ?? undefined,
    ultima_revision: item.ultima_revision ?? undefined,
    url: item.fuente_url ?? undefined,
    notes: [item.requisitos_resumen, item.notas].filter(Boolean).join("\n\n") || undefined,
    sourceTable: "tech_opportunities",
    created_at: item.created_at,
  };
}

export function fpItemToHackathon(item: FpCatalogItem): Hackathon {
  const canonical = item.canonical?.destination === "event" ? item.canonical : undefined;
  return {
    id: `fp-${item.id_slug}`,
    id_slug: item.id_slug,
    categoria: item.type,
    name: canonical?.title ?? item.title,
    organizer: canonical?.organizer ?? canonical?.provider ?? item.entity ?? undefined,
    province: canonical?.province ?? item.province ?? undefined,
    city: canonical?.municipality ?? item.location ?? undefined,
    type: canonical?.opportunityType ?? item.type,
    modalidad: canonical?.attendanceMode ?? item.delivery_mode ?? undefined,
    localidad: canonical?.venue ?? canonical?.municipality ?? item.location ?? undefined,
    status: canonical ? (fpUserStatusToHackathonStatus(item.user_status) ?? "pendiente") : (fpUserStatusToHackathonStatus(item.user_status) ?? normalizeHackathonStatus(item.status)),
    priority: (item.priority.toLowerCase() as Hackathon["priority"]),
    start_at: canonical?.startsAt ?? item.start_date ?? "",
    end_at: canonical?.endsAt ?? item.end_date ?? "",
    registration_deadline_at: canonical?.registrationDeadline ?? "",
    certificacion_o_premio: canonical?.certification ?? canonical?.prize ?? item.certification ?? undefined,
    practicas_empresa: item.practices === "si",
    tags: item.tags ?? undefined,
    url: canonical?.registrationUrl ?? canonical?.canonicalUrl ?? item.source_url ?? undefined,
    description: canonical?.aboutSummary ?? canonical?.summaryExpanded ?? canonical?.summaryShort ?? item.description ?? undefined,
    notes: fpItemNotes(item),
    sourceTable: "fp_content_items",
    requiredCompetencies: item.requiredCompetencies,
    is_favorite: item.is_favorite ?? false,
    canonical,
    user_status: item.user_status,
    created_at: item.created_at,
  };
}

// The one legitimate source for a hackathon/event's public description:
// item.description when present, otherwise item.notes for a plain
// user-owned row - but never for fp_content_items, whose notes field never
// carries public copy (see fpItemNotes above; this is the fix for #118).
export function hackathonPublicDescription(item: Hackathon) {
  if (item.description) return item.description;
  return item.sourceTable === "fp_content_items" ? undefined : item.notes;
}

// tech_opportunities-sourced events are deliberately excluded (issue #131) -
// that shared catalogue has no per-user favorites table (see the migration
// notes in 0007_hackathon_favorites.sql); everything else - fp_content_items
// and the student's own hackathons rows (sourceTable is undefined for those,
// since addHackathon never sets it) - can be saved.
export function canToggleHackathonFavorite(item: Hackathon): boolean {
  if (item.sourceTable === "tech_opportunities") return false;
  if (item.sourceTable === "fp_content_items") return !!item.id_slug;
  return true;
}

export function toggleHackathonFavoriteFor(item: Hackathon, actions: EventActions & LearningActions) {
  if (item.sourceTable === "fp_content_items") {
    actions.toggleFpFavorite(item.id_slug!, !item.is_favorite);
  } else {
    actions.toggleHackathonFavorite(item.id);
  }
}

// Resolves a single hackathon/event by its display id (issue #135) without
// running the full list merge/dedupe/sort pipeline - dedup only matters when
// building a list where the same event could appear from two sources at
// once; a single id lookup is already unambiguous once its source prefix is
// known. Used by both the /hackathons/[id] Server Component (authorization:
// an id that doesn't resolve here was never sent to this user in the first
// place, since hackathons/techOpportunities/fpContent are already
// per-user/per-cycle scoped by their respective repository queries - so
// "not found" and "not yours" are indistinguishable here by construction,
// exactly like getRadarItemDetailForUser) and the client card/hero, so the
// two can never resolve the same id to two different objects.
export function resolveHackathonById(
  id: string,
  hackathons: Hackathon[],
  techOpportunities: TechOpportunity[],
  fpContent: FpCatalogItem[],
): Hackathon | null {
  if (id.startsWith("tech-")) {
    const slug = id.slice("tech-".length);
    const item = techOpportunities.find((candidate) => candidate.id_slug === slug && isTechHackathonOrEvent(candidate));
    return item ? techOpportunityToHackathon(item) : null;
  }
  if (id.startsWith("fp-")) {
    const slug = id.slice("fp-".length);
    const item = fpContent.find((candidate) => candidate.id_slug === slug && isFpHackathonLike(candidate));
    return item ? fpItemToHackathon(item) : null;
  }
  return hackathons.find((candidate) => candidate.id === id) ?? null;
}

// The public detail contract for issue #135: separates clean, student-facing
// fields from provenance/moderation data (item.notes for tech_opportunities
// rows, id_slug, sourceTable). Shared by the card, hero and detail view so
// they can never drift out of sync - mirrors getCoursePresentation exactly.
export type HackathonPresentation = {
  id: string;
  title: string;
  organizer?: string;
  type?: string;
  status: Hackathon["status"];
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  location?: string;
  modality?: string;
  description?: string;
  sourceUrl?: string;
  certification?: string;
  prize?: string;
  price?: string;
  lifecycle?: string;
  otherEligibility: string[];
  audience: string[];
  requirements: string[];
  skillsTested: string[];
  preparationTips: string[];
  verifiedAt?: string;
  isFavorite: boolean;
  canToggleFavorite: boolean;
};

function nonEmpty(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getHackathonPresentation(item: Hackathon): HackathonPresentation {
  const canonical = item.canonical?.destination === "event" ? item.canonical : undefined;
  const price = canonical?.priceState === "free"
    ? "Gratis"
    : canonical?.priceState === "paid" && canonical.priceAmountMinor !== undefined && canonical.priceCurrency
      ? new Intl.NumberFormat("es-ES", { style: "currency", currency: canonical.priceCurrency }).format(canonical.priceAmountMinor / 100)
      : undefined;
  return {
    id: item.id,
    title: canonical?.title ?? nonEmpty(item.name) ?? "Evento o reto",
    organizer: canonical?.organizer ?? canonical?.provider ?? nonEmpty(item.organizer),
    type: canonical?.opportunityType ?? nonEmpty(item.type),
    status: item.status,
    startDate: canonical?.startsAt ?? nonEmpty(item.start_at),
    endDate: canonical?.endsAt ?? nonEmpty(item.end_at),
    registrationDeadline: canonical?.registrationDeadline ?? nonEmpty(item.inscripcion_hasta) ?? nonEmpty(item.registration_deadline_at),
    location: canonical
      ? [canonical.venue ?? canonical.municipality, canonical.province].filter(Boolean).join(" / ") || undefined
      : [nonEmpty(item.localidad ?? item.city), nonEmpty(item.province)].filter(Boolean).join(" / ") || undefined,
    modality: canonical?.attendanceMode ?? nonEmpty(item.modalidad),
    description: canonical?.aboutSummary ?? canonical?.summaryExpanded ?? canonical?.summaryShort ?? nonEmpty(hackathonPublicDescription(item)),
    sourceUrl: canonical?.registrationUrl ?? canonical?.canonicalUrl ?? nonEmpty(item.url),
    certification: canonical?.certification,
    prize: canonical?.prize,
    price,
    lifecycle: canonical?.sourceLifecycleStatus,
    otherEligibility: canonical?.otherEligibility ?? [],
    audience: canonical?.audience ?? [],
    requirements: canonical?.requirements ?? [],
    skillsTested: canonical?.skillsTested ?? [],
    preparationTips: canonical?.preparationTips ?? [],
    verifiedAt: canonical?.sourceVerifiedAt,
    isFavorite: !!item.is_favorite,
    canToggleFavorite: canToggleHackathonFavorite(item),
  };
}
