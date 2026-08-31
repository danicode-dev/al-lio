import type { Course, FpCatalogItem } from "@/components/store/types";
import {
  fpItemToCourse,
  isFpCourseLike,
  isTechCourse,
  techOpportunityToCourse,
} from "@/features/courses/presentation/course-presentation";
import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";

export function getDisplayCourses(courses: Course[], items: TechOpportunity[], fpItems: FpCatalogItem[] = []) {
  const seen = new Set(courses.map(courseIdentityKey));
  const fromTech = items
    .filter(isTechCourse)
    .map(techOpportunityToCourse)
    .filter((course) => addUniqueIdentity(seen, courseIdentityKey(course)));
  const fromFp = fpItems
    .filter(isFpCourseLike)
    .map(fpItemToCourse)
    .filter((course) => addUniqueIdentity(seen, courseIdentityKey(course)));
  return [...fromTech, ...fromFp, ...courses].sort(sortCoursesForDisplay);
}

function courseIdentityKey(course: Course) {
  return normalizedIdentity(course.fuente_url, course.url, course.id_slug, course.title);
}

function normalizedIdentity(...values: Array<string | undefined | null>) {
  const value = [...values].reverse().find((item) => item && String(item).trim());
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(edicion|edition)\s+\d+\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function addUniqueIdentity(seen: Set<string>, identity: string) {
  if (!identity || seen.has(identity)) return false;
  seen.add(identity);
  return true;
}

function sortCoursesForDisplay(a: Course, b: Course) {
  const priorityDiff = prioritySortValue(a.prioridad) - prioritySortValue(b.prioridad);
  if (priorityDiff) return priorityDiff;
  const dawDiff = (b.encaje_daw_1_5 ?? 0) - (a.encaje_daw_1_5 ?? 0);
  if (dawDiff) return dawDiff;
  return String(a.fecha_inicio || a.start_at || a.deadline_at || "9999").localeCompare(String(b.fecha_inicio || b.start_at || b.deadline_at || "9999"));
}

function prioritySortValue(value?: string) {
  const normalized = String(value || "media").trim().toLowerCase();
  if (normalized.includes("alta")) return 0;
  if (normalized.includes("media")) return 1;
  if (normalized.includes("baja")) return 2;
  return 9;
}
