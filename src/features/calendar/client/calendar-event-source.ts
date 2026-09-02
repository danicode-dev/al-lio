import { isFpCourseLike, isTechCourse } from "@/features/courses/presentation";
import { isTechHackathonOrEvent } from "@/features/events/presentation";
import { calendarHref } from "@/lib/dashboard/calendar-events";
import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";
import type { FpCatalogItem, Store } from "@/components/store/types";
import { sortCalendarEvents as sortEvents, type CalendarEvent } from "@/components/calendar/calendar-model";

// Derives the calendar's event list from the shared application store: tasks,
// courses, hackathons, tech opportunities and FP catalogue items, deduplicated
// per day/type/title and sorted. Kept out of calendar-feature.tsx so the
// wrapper only wires the view together.

function catalogCalendarHref(type: CalendarEvent["type"], id: string) {
  if (type === "course") return calendarHref.course(id);
  if (type === "hackathon") return calendarHref.hackathon(id);
  return "/hackathons";
}

function fpItemToCalendarEvents(item: FpCatalogItem): CalendarEvent[] {
  const type: CalendarEvent["type"] = isFpCourseLike(item) ? "course" : "hackathon";
  const href = catalogCalendarHref(type, `fp-${item.id_slug}`);
  const events: CalendarEvent[] = [];

  if (item.start_date) {
    events.push({ id: `fp-${item.id_slug}-start`, type, title: item.title, date_at: item.start_date, status: item.status, href });
  }

  if (item.end_date && item.end_date !== item.start_date) {
    events.push({ id: `fp-${item.id_slug}-end`, type, title: `Fin ${item.title}`, date_at: item.end_date, status: item.status, href });
  }

  return events;
}

export function getCalendarEvents(store: Store): CalendarEvent[] {
  const events: CalendarEvent[] = [
    ...store.tasks.filter((task) => task.due_at).map((task) => ({ id: task.id, type: "task" as const, title: task.status === "completada" ? `OK ${task.title}` : task.title, date_at: task.due_at || "", status: task.status, href: calendarHref.task(task.id), description: task.description || undefined })),
    ...store.courses.flatMap((course) => {
      const href = calendarHref.course(course.id);
      return [
        ...(course.fecha_inicio || course.start_at ? [{ id: `${course.id}-start`, type: "course" as const, title: course.title, date_at: course.fecha_inicio || course.start_at || "", status: course.status, href }] : []),
        ...(course.fecha_fin || course.deadline_at ? [{ id: `${course.id}-deadline`, type: "course" as const, title: `Limite ${course.title}`, date_at: course.fecha_fin || course.deadline_at || "", status: course.status, href }] : []),
      ];
    }),
    ...store.hackathons.flatMap((hackathon) => {
      const href = calendarHref.hackathon(hackathon.id);
      return [
        ...(hackathon.start_at ? [{ id: `${hackathon.id}-start`, type: "hackathon" as const, title: hackathon.name, date_at: hackathon.start_at, status: hackathon.status, href }] : []),
        ...(hackathon.registration_deadline_at ? [{ id: `${hackathon.id}-deadline`, type: "hackathon" as const, title: `Inscripcion ${hackathon.name}`, date_at: hackathon.registration_deadline_at, status: hackathon.status, href }] : []),
      ];
    }),
    ...store.techOpportunities.flatMap(techOpportunityToCalendarEvents),
    ...store.fpContent.flatMap(fpItemToCalendarEvents),
  ];

  return dedupeCalendarEvents(events).sort(sortEvents);
}

function techOpportunityToCalendarEvents(item: TechOpportunity): CalendarEvent[] {
  const type = techCalendarType(item);
  const href = catalogCalendarHref(type, `tech-${item.id_slug}`);
  const status = item.estado ?? undefined;
  const events: CalendarEvent[] = [];

  if (item.fecha_inicio) {
    events.push({ id: `${item.id_slug}-start`, type, title: item.nombre, date_at: item.fecha_inicio, status, href });
  }

  if (item.fecha_fin && item.fecha_fin !== item.fecha_inicio) {
    events.push({ id: `${item.id_slug}-end`, type, title: `Fin ${item.nombre}`, date_at: item.fecha_fin, status, href });
  }

  return events;
}

function techCalendarType(item: TechOpportunity): CalendarEvent["type"] {
  if (isTechCourse(item)) return "course";
  if (isTechHackathonOrEvent(item)) return "hackathon";
  return "event";
}

function dedupeCalendarEvents(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent>();

  for (const event of events) {
    const day = dateKey(event.date_at);
    if (!day) continue;
    const baseTitle = event.title.replace(/^(OK|Limite|Inscripcion|Fin)\s+/i, "").trim().toLowerCase();
    const key = `${event.type}:${day}:${baseTitle}`;
    if (!map.has(key)) map.set(key, event);
  }

  return Array.from(map.values());
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(value?: string) {
  const date = parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
