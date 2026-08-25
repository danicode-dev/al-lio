import type { Hackathon } from "@/components/store/types";

type PreparationInput = Pick<Hackathon, "requiredCompetencies">;

// Preparation is complete only when the event has at least one mandatory
// competency and every one of them is explicitly marked done via the
// Events aptitude checklist (fp_user_competency_state). Never inferred from
// videos, learning resources, or fp_user_learning_state - an event with no
// mandatory competencies is never "prepared", it simply has nothing to
// derive completion from.
export function isPreparationComplete(item: PreparationInput): boolean {
  const mandatory = (item.requiredCompetencies ?? []).filter((competency) => competency.obligatoria_para_item);
  return mandatory.length > 0 && mandatory.every((competency) => competency.completed === true);
}

type FeaturedCandidate = Pick<
  Hackathon,
  | "id"
  | "status"
  | "registration_deadline_at"
  | "inscripcion_hasta"
  | "start_at"
  | "end_at"
  | "requiredCompetencies"
>;

function featuredActionableDate(item: FeaturedCandidate): string {
  return item.registration_deadline_at || item.inscripcion_hasta || item.start_at || item.end_at || "9999-99-99";
}

// Chooses the next event or challenge to feature. Callers must pass only
// already-active candidates (not archived, not past its actionable date) -
// this function's own job is solely the featured-specific exclusion
// (preparation-complete) plus the selection order:
//   1. prefer open registration, falling back to the full active pool;
//   2. nearest actionable date (registration deadline, start, then end);
//   3. a stable identity tiebreak (id) so the result never depends on
//      incidental array order when two candidates tie on date.
// A preparation-complete event is excluded from the featured pool only -
// it stays in Active with its own "Preparación lista" feedback until the
// user explicitly marks it Realizado, a separate action entirely.
export function selectFeaturedHackathon<T extends FeaturedCandidate>(activeCandidates: T[]): T | null {
  const eligible = activeCandidates.filter((item) => !isPreparationComplete(item));
  const open = eligible.filter((item) => item.status === "inscripcion_abierta");
  const pool = open.length > 0 ? open : eligible;
  if (pool.length === 0) return null;

  return [...pool].sort((a, b) => {
    const dateDiff = featuredActionableDate(a).localeCompare(featuredActionableDate(b));
    if (dateDiff !== 0) return dateDiff;
    return a.id.localeCompare(b.id);
  })[0];
}

// Mirrors fpUserStatusToCourseStatus's shape for the Hackathon/Events
// display model. Only "completed" and "dismissed" carry meaning here -
// there is no "started" concept for an event.
export function fpUserStatusToHackathonStatus(userStatus?: string | null): Hackathon["status"] | undefined {
  if (userStatus === "completed") return "realizado";
  if (userStatus === "dismissed") return "descartado";
  return undefined;
}
