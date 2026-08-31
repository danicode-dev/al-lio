"use client";

import { useEffect, useState } from "react";
import { isFpCourseLike, isTechCourse } from "@/lib/courses/course-presentation";
import { isTechHackathonOrEvent } from "@/lib/hackathons/hackathon-presentation";
import { toast } from "sonner";
import { CalendarView, sortCalendarEvents as sortEvents, type CalendarEvent } from "@/components/calendar/app-calendar";
import { calendarHref } from "@/lib/dashboard/calendar-events";
import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";
import { useStore } from "@/shared/store/store-provider";
import { StudentHeaderActions } from "@/components/student-header-actions";
import type { FpCatalogItem, Store } from "@/components/store/types";
function GoogleCalendarStatusControl() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/google/calendar/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (alive) setConnected(Boolean(data.connected));
      })
      .catch(() => {
        if (alive) setConnected(false);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function disconnect() {
    setBusy(true);
    try {
      const res = await fetch("/api/google/calendar/status", { method: "DELETE" });
      if (!res.ok) throw new Error("Error al desconectar");
      setConnected(false);
      toast.success("Google Calendar desconectado");
    } catch {
      toast.error("Error al desconectar Google Calendar");
    } finally {
      setBusy(false);
    }
  }

  const label = connected ? "Google Calendar conectado" : "Conectar Google Calendar";

  if (loading) {
    return (
      <span className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-[#ece7dc] bg-white px-3 text-xs font-semibold text-[#9a958a] sm:h-9 sm:w-auto sm:whitespace-nowrap">
        <GoogleGlyph />
        <span>Comprobando Google Calendar…</span>
      </span>
    );
  }

  if (connected) {
    return (
      <button
        type="button"
        className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-100 disabled:opacity-60 sm:h-9 sm:w-auto sm:whitespace-nowrap"
        onClick={disconnect}
        disabled={busy}
        title="Google Calendar conectado. Toca para desconectar."
      >
        <GoogleGlyph />
        <span>{busy ? "Desconectando…" : label}</span>
      </button>
    );
  }

  return (
    <a
      href="/api/google/calendar/auth?next=/dashboard"
      className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-[#f4b398] bg-[#fff7f3] px-3 text-xs font-bold text-[#c94f21] shadow-sm transition-colors hover:bg-[#ffe9df] sm:h-9 sm:w-auto sm:whitespace-nowrap"
      title="Conectar Google Calendar"
    >
      <GoogleGlyph />
      <span>{label}</span>
    </a>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.2a5.3 5.3 0 0 1-2.3 3.48v2.88h3.72c2.18-2 3.44-4.96 3.44-8.37Z" />
      <path fill="#34A853" d="M12 24c3.1 0 5.7-1.03 7.6-2.78l-3.72-2.88c-1.03.69-2.35 1.1-3.88 1.1-2.98 0-5.5-2.01-6.4-4.72H1.75v2.97A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.6 14.72a7.2 7.2 0 0 1 0-4.6V7.15H1.75a12 12 0 0 0 0 10.54l3.85-2.97Z" />
      <path fill="#EA4335" d="M12 4.75c1.68 0 3.19.58 4.38 1.71l3.28-3.28C17.7 1.28 15.1 0 12 0A11.99 11.99 0 0 0 1.75 7.15L5.6 10.12C6.5 7.41 9.02 4.75 12 4.75Z" />
    </svg>
  );
}

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

function getCalendarEvents(store: Store): CalendarEvent[] {
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

export function CalendarFeature() {
  const { store } = useStore();
  return (
    <div className="space-y-6 pb-6">
      <CalendarView
        events={getCalendarEvents(store)}
        completedTasks={store.tasks}
        headerActions={<StudentHeaderActions />}
        calendarStatus={<GoogleCalendarStatusControl />}
      />
    </div>
  );
}
