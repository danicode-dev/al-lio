import type { Course } from "@/components/store/types";
import type { CourseActions } from "./use-course-actions";
import type { LearningActions } from "@/features/learning/client";

export type CoursesActions = CourseActions & LearningActions;

/**
 * Framework-free catalogue model for the Courses feature: ordering, featured
 * selection, hero-image resolution, status classes and the small
 * archival/favourite helpers. Nothing here imports React or a runtime module
 * alias, so tests/unit/courses/course-catalogue-model.test.mjs can execute it
 * directly. Date-aware helpers (the collection filter, the past-date check)
 * stay next to their only caller in courses-catalogue.tsx, where the shared
 * date-filter contract is in scope.
 */

export function courseStatusClass(status: string): string {
  if (status === "empezado") return "al-course-chip-terracotta";
  if (status === "terminado") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  if (status === "pausado") return "al-course-chip-amber";
  if (status === "descartado") return "border-red-500/30 bg-red-500/10 text-red-700";
  return "";
}

export function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
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

const COURSE_HERO_POOL = { desarrollo: 5, administracion: 5, marketing: 6, deporte: 7, generico: 6 } as const;

function courseHeroFamily(course: Course): keyof typeof COURSE_HERO_POOL {
  const hay = `${course.area ?? ""} ${course.category ?? ""} ${course.title ?? ""} ${Array.isArray(course.tags) ? course.tags.join(" ") : course.tags ?? ""}`
    .toLowerCase().normalize("NFD").replace(new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g"), "");
  if (/desarroll|program|web|software|java|kotlin|frontend|backend|\bapp\b|\bdev\b|\bdam\b|\bdaw\b/.test(hay)) return "desarrollo";
  if (/administr|finan|contab|excel|gestion|factur|\baf\b/.test(hay)) return "administracion";
  if (/marketing|publicidad|redes sociales|campan|\bmp\b/.test(hay)) return "marketing";
  if (/deport|fitness|entrenam|fisic|gimnas|salud|tsaf/.test(hay)) return "deporte";
  return "generico";
}

export function courseHeroImage(course: Course): string {
  const family = courseHeroFamily(course);
  const key = course.id_slug || course.id || course.title || "x";
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const index = (Math.abs(hash) % COURSE_HERO_POOL[family]) + 1;
  return `/assets/cursos/curso-hero-${family}-${index}.jpg`;
}

function normalizePriorityText(value?: string): string {
  return String(value || "media").trim().toLowerCase();
}

export function isCourseArchived(course: Pick<Course, "status">) {
  return course.status === "terminado" || course.status === "descartado";
}

export function canToggleCourseFavorite(item: Course): boolean {
  if (item.sourceTable === "tech_opportunities") return false;
  if (item.sourceTable === "fp_content_items") return !!item.id_slug;
  return true;
}

export function toggleCourseFavoriteFor(item: Course, actions: CoursesActions) {
  if (item.sourceTable === "fp_content_items") {
    actions.toggleFpFavorite(item.id_slug!, !item.is_favorite);
  } else {
    actions.toggleCourseFavorite(item.id);
  }
}

/** Catalogue order: soonest start first, courses with no start date last. */
export function sortCoursesByStart(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => {
    const da = (a.fecha_inicio || a.start_at || "").slice(0, 10);
    const db = (b.fecha_inicio || b.start_at || "").slice(0, 10);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });
}

/**
 * One featured course for the untouched Total view: the soonest course that has
 * not started yet, ties broken by priority; if nothing is on the horizon, the
 * highest-priority active course, most recently started first. Archived and
 * finished courses are never featured.
 */
export function selectFeaturedCourse(candidates: Course[], today: string): Course | null {
  const pool = candidates.filter((c) => !isCourseArchived(c) && c.status !== "terminado");
  if (!pool.length) return null;
  const rank = (c: Course) => {
    const p = normalizePriorityText(c.prioridad);
    return p.includes("alta") ? 0 : p.includes("baja") ? 2 : 1;
  };
  const startKey = (c: Course) => (c.fecha_inicio || c.start_at || "").slice(0, 10);
  const upcoming = pool
    .filter((c) => startKey(c) >= today)
    .sort((a, b) => (startKey(a) || "9999-12-31").localeCompare(startKey(b) || "9999-12-31") || rank(a) - rank(b));
  if (upcoming.length) return upcoming[0];
  return [...pool].sort((a, b) => rank(a) - rank(b) || startKey(b).localeCompare(startKey(a)))[0] ?? null;
}

/** Shared styling for the "no courses" / "course unavailable" cards. */
export const COURSE_EMPTY_STYLES = `
  .al-course-empty { min-height: 320px; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
  .al-course-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
  .al-course-empty-illustration { width: 100%; max-width: 280px; height: auto; }
  .al-course-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
  .al-course-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
  .al-course-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; border: 1px solid var(--al-action-soft-border); cursor: pointer; text-decoration: none; }
`;
