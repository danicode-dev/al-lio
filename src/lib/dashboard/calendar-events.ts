import type { CalendarEvent } from "@/components/calendar/app-calendar";
import { sortCalendarEvents } from "@/components/calendar/app-calendar";
import type { Store } from "@/components/store/types";
import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";

const fpCourseTypes = new Set(["curso_basico", "curso_complementario", "herramienta", "recurso", "evidencia_recomendada"]);
const techCourseCategories = new Set(["curso"]);
const techHackathonCategories = new Set(["hackathon_reto"]);
const techEventCategories = new Set(["evento_tech", "reto_programacion", "concurso_programacion"]);

// Every calendar event points at the item it represents, not at the list
// page it lives on: a task opens in Tareas, a course/event opens its own
// detail route. `tech-` / `fp-` prefixed ids are the same ones
// resolveCourseById / resolveHackathonById already accept.
export const calendarHref = {
  task: (id: string) => `/tasks?task=${encodeURIComponent(id)}`,
  course: (id: string) => `/courses/${encodeURIComponent(id)}`,
  hackathon: (id: string) => `/hackathons/${encodeURIComponent(id)}`,
};

function catalogHref(type: CalendarEvent["type"], id: string) {
  if (type === "course") return calendarHref.course(id);
  if (type === "hackathon") return calendarHref.hackathon(id);
  // "event" is the residual tech category with no guaranteed detail page.
  return "/hackathons";
}

export function getDashboardCalendarEvents(store: Store): CalendarEvent[] {
  const events: CalendarEvent[] = [
    ...store.tasks.filter((task) => task.due_at).map((task) => ({
      id: task.id,
      type: "task" as const,
      title: task.status === "completada" ? `OK ${task.title}` : task.title,
      date_at: task.due_at || "",
      status: task.status,
      href: calendarHref.task(task.id),
      description: task.description || undefined,
    })),
    ...store.courses.flatMap((course) => {
      const href = calendarHref.course(course.id);
      return [
        ...(course.fecha_inicio || course.start_at ? [{ id: `${course.id}-start`, type: "course" as const, title: course.title, date_at: course.fecha_inicio || course.start_at || "", status: course.status, href }] : []),
        ...(course.fecha_fin || course.deadline_at ? [{ id: `${course.id}-deadline`, type: "course" as const, title: `Límite ${course.title}`, date_at: course.fecha_fin || course.deadline_at || "", status: course.status, href }] : []),
      ];
    }),
    ...store.hackathons.flatMap((hackathon) => {
      const href = calendarHref.hackathon(hackathon.id);
      return [
        ...(hackathon.start_at ? [{ id: `${hackathon.id}-start`, type: "hackathon" as const, title: hackathon.name, date_at: hackathon.start_at, status: hackathon.status, href }] : []),
        ...(hackathon.registration_deadline_at ? [{ id: `${hackathon.id}-deadline`, type: "hackathon" as const, title: `Inscripción ${hackathon.name}`, date_at: hackathon.registration_deadline_at, status: hackathon.status, href }] : []),
      ];
    }),
    ...store.techOpportunities.flatMap(techOpportunityToCalendarEvents),
    ...store.fpContent.flatMap((item) => {
      const type: CalendarEvent["type"] = fpCourseTypes.has(item.type) ? "course" : "hackathon";
      const href = catalogHref(type, `fp-${item.id_slug}`);
      return [
        ...(item.start_date ? [{ id: `fp-${item.id_slug}-start`, type, title: item.title, date_at: item.start_date, status: item.status, href }] : []),
        ...(item.end_date && item.end_date !== item.start_date ? [{ id: `fp-${item.id_slug}-end`, type, title: `Fin ${item.title}`, date_at: item.end_date, status: item.status, href }] : []),
      ];
    }),
  ];

  return dedupeCalendarEvents(events).sort(sortCalendarEvents);
}

function techOpportunityToCalendarEvents(item: TechOpportunity): CalendarEvent[] {
  const type = techCalendarType(item);
  const href = catalogHref(type, `tech-${item.id_slug}`);
  return [
    ...(item.fecha_inicio ? [{ id: `${item.id_slug}-start`, type, title: item.nombre, date_at: item.fecha_inicio, status: item.estado ?? undefined, href }] : []),
    ...(item.fecha_fin && item.fecha_fin !== item.fecha_inicio ? [{ id: `${item.id_slug}-end`, type, title: `Fin ${item.nombre}`, date_at: item.fecha_fin, status: item.estado ?? undefined, href }] : []),
  ];
}

function techCalendarType(item: TechOpportunity): CalendarEvent["type"] {
  const category = String(item.categoria || "").trim().toLowerCase();
  if (techCourseCategories.has(category)) return "course";
  if (techHackathonCategories.has(category) || techEventCategories.has(category) || /hackathon|evento|reto|concurso/.test(category)) return "hackathon";
  return "event";
}

function dedupeCalendarEvents(events: CalendarEvent[]) {
  const uniqueEvents = new Map<string, CalendarEvent>();
  for (const event of events) {
    const day = dateKey(event.date_at);
    if (!day) continue;
    const baseTitle = event.title.replace(/^(OK|Límite|Inscripción|Fin)\s+/i, "").trim().toLowerCase();
    const key = `${event.type}:${day}:${baseTitle}`;
    if (!uniqueEvents.has(key)) uniqueEvents.set(key, event);
  }
  return Array.from(uniqueEvents.values());
}

function dateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
