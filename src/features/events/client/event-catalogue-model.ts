import type { Hackathon, RequiredCompetency } from "@/components/store/types";
import type { EventActions } from "@/features/events/client";
import type { LearningActions } from "@/features/learning/client";
import type { TaskActions } from "@/features/tasks/client";

/**
 * Framework-free catalogue model for the Events and challenges feature: status
 * labels/classes, lifecycle labels, ordering, and the aptitude-progress
 * calculation. Nothing here imports React or a runtime module alias (only
 * `import type`, which strip-types erases), so
 * tests/unit/events/catalogue-model.test.mjs can execute it directly. Featured
 * selection lives in `@/lib/fp/event-lifecycle`; date-aware helpers (the
 * collection filter, the past-date check) live in `./hackathon-dates`, next to
 * their component callers, where the shared date-filter contract is in scope.
 */

/**
 * The combined action surface both Events views dispatch: the catalogue
 * container and the detail view (which also owns the aptitude checklist).
 */
export type EventsActions = EventActions & LearningActions & Pick<TaskActions, "addTask">;

export function hackathonStatusLabel(status: string): string {
  const m: Record<string, string> = {
    inscripcion_abierta: "Inscripción abierta",
    pendiente: "Pendiente",
    realizado: "Realizado",
    revisar_futura_edicion: "Revisar",
    descartado: "Descartado",
  };
  return m[status] ?? status;
}

export function hackathonStatusPillClass(status: Hackathon["status"]): string {
  const classes: Record<Hackathon["status"], string> = {
    inscripcion_abierta: "al-catalog-status-open",
    pendiente: "al-catalog-status-pending",
    realizado: "al-catalog-status-complete",
    revisar_futura_edicion: "al-catalog-status-review",
    descartado: "al-catalog-status-dismissed",
  };
  return classes[status];
}

export function opportunityLifecycleLabel(value?: string): string | undefined {
  const labels: Record<string, string> = {
    announced: "Anunciado",
    registration_open: "Inscripción abierta",
    registration_closed: "Inscripción cerrada",
    ongoing: "En curso",
    completed: "Finalizado",
    cancelled: "Cancelado",
    postponed: "Aplazado",
    evergreen: "Disponible sin convocatoria",
  };
  return value ? labels[value] : undefined;
}

export function isCompetencyDone(competency: RequiredCompetency): boolean {
  return !!competency.completed;
}

export function isHackathonArchived(hackathon: Pick<Hackathon, "status">) {
  return hackathon.status === "realizado" || hackathon.status === "descartado";
}

/** Catalogue order: soonest start first, events with no start date last. */
export function sortHackathonsByStart(hackathons: Hackathon[]): Hackathon[] {
  return [...hackathons].sort((a, b) => {
    const da = (a.start_at || "").slice(0, 10);
    const db = (b.start_at || "").slice(0, 10);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });
}

/**
 * Preparation progress for an event: required vs recommended competencies
 * marked done, plus the started/completed counts across the deduplicated
 * preparation resources. This organises the student's preparation; it never
 * evaluates their level.
 */
export function hackathonAptitudeProgress(item: Hackathon) {
  const competencies = item.requiredCompetencies ?? [];
  const required = competencies.filter((competency) => competency.obligatoria_para_item);
  const recommended = competencies.filter((competency) => !competency.obligatoria_para_item);
  const resources = [...new Map(
    competencies.flatMap((competency) => competency.preparationResources ?? []).map((resource) => [resource.id, resource]),
  ).values()];
  return {
    done: required.filter(isCompetencyDone).length,
    total: required.length,
    requiredDone: required.filter(isCompetencyDone).length,
    requiredTotal: required.length,
    recommendedDone: recommended.filter(isCompetencyDone).length,
    recommendedTotal: recommended.length,
    resourcesStarted: resources.filter((resource) => resource.user_status === "started").length,
    resourcesCompleted: resources.filter((resource) => resource.user_status === "completed").length,
  };
}

/** Shared styling for the "no events" / "event unavailable" cards. */
export const HACK_EMPTY_STYLES = `
  .al-hack-empty-wrap { display: grid; gap: 14px; grid-template-columns: 1fr; }
  @media (min-width: 640px) { .al-hack-empty-wrap.al-hack-empty-two { grid-template-columns: 1fr 1fr; } }
  .al-hack-empty { min-height: 320px; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
  .al-hack-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
  .al-hack-empty-illustration { width: 100%; max-width: 280px; height: auto; }
  .al-hack-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
  .al-hack-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
  .al-hack-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; border: 1px solid var(--al-action-soft-border); cursor: pointer; text-decoration: none; }
`;
