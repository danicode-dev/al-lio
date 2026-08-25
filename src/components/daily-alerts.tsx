"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  FolderKanban,
  GraduationCap,
  ListTodo,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/components/guest-store";
import type { Store } from "@/components/store/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type GcalEvent = { id: string; title: string; start: string; htmlLink?: string };

type Alert = {
  id: string;
  type: "task" | "hackathon" | "course" | "gcal";
  title: string;
  category: string;
  timeLabel: string;
  href: string;
  urgent: boolean;
};

// ── Date helpers (self-contained, no external deps) ────────────────────────────

function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  if (isSameDay(d, today)) {
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(d, tomorrow)) return "Mañana";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// ── Alert builder ─────────────────────────────────────────────────────────────

function buildAlerts(store: Store, gcalEvents: GcalEvent[]): Alert[] {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const alerts: Alert[] = [];

  // Urgent / due-today tasks
  for (const task of store.tasks) {
    if (task.status === "completada" || task.status === "cancelada") continue;
    const due = task.due_at ? new Date(task.due_at) : null;
    const isOverdue = due && due < now;
    const isDueToday = due && isSameDay(due, now);
    const isUrgent =
      task.priority === "alta" ||
      task.priority === "critica" ||
      task.category === "urgente";
    if (!isOverdue && !isDueToday && !isUrgent) continue;
    alerts.push({
      id: `task-${task.id}`,
      type: "task",
      title: task.title,
      category: isOverdue ? "Tarea vencida" : isUrgent ? "Tarea urgente" : "Tarea hoy",
      timeLabel: due ? formatTimeLabel(task.due_at!) : "",
      href: "/tasks",
      urgent: Boolean(isOverdue) || isUrgent,
    });
  }

  // Hackathons with deadline or start within 48 h
  for (const h of store.hackathons) {
    if (h.status === "realizado" || h.status === "descartado") continue;
    const deadline = h.registration_deadline_at ? new Date(h.registration_deadline_at) : null;
    const start = h.start_at ? new Date(h.start_at) : null;
    if (deadline && deadline >= now && deadline <= in48h) {
      alerts.push({
        id: `hackathon-${h.id}`,
        type: "hackathon",
        title: h.name,
        category: "Evento o reto",
        timeLabel: formatTimeLabel(h.registration_deadline_at!),
        href: "/hackathons",
        urgent: isSameDay(deadline, now),
      });
    } else if (start && isSameDay(start, now)) {
      alerts.push({
        id: `hackathon-start-${h.id}`,
        type: "hackathon",
        title: h.name,
        category: "Evento o reto hoy",
        timeLabel: formatTimeLabel(h.start_at!),
        href: "/hackathons",
        urgent: true,
      });
    }
  }

  // Courses with deadline within 48 h
  for (const c of store.courses) {
    if (c.status === "terminado" || c.status === "descartado" || c.status === "pausado") continue;
    const deadline = c.deadline_at ? new Date(c.deadline_at) : null;
    if (deadline && deadline >= now && deadline <= in48h) {
      alerts.push({
        id: `course-${c.id}`,
        type: "course",
        title: c.title,
        category: "Curso",
        timeLabel: formatTimeLabel(c.deadline_at!),
        href: "/courses",
        urgent: isSameDay(deadline, now),
      });
    }
  }

  // Google Calendar events for today
  for (const ev of gcalEvents) {
    const start = new Date(ev.start);
    if (!Number.isNaN(start.getTime()) && isSameDay(start, now)) {
      alerts.push({
        id: `gcal-${ev.id}`,
        type: "gcal",
        title: ev.title,
        category: "Calendario",
        timeLabel: formatTimeLabel(ev.start),
        href: ev.htmlLink ?? "/calendar",
        urgent: false,
      });
    }
  }

  return alerts.sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return a.timeLabel.localeCompare(b.timeLabel);
  });
}

// ── Icon config ───────────────────────────────────────────────────────────────

const ALERT_META = {
  task: {
    Icon: ListTodo,
    iconColor: "text-rose-500",
    iconBg: "bg-rose-100",
  },
  hackathon: {
    Icon: FolderKanban,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-100",
  },
  course: {
    Icon: GraduationCap,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-100",
  },
  gcal: {
    Icon: CalendarDays,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-100",
  },
} as const;

// ── Persistence helpers ───────────────────────────────────────────────────────

const SHOWN_DATE_KEY = "al-lio.daily-alerts.shown-date";
const DISMISSED_KEY = "al-lio.daily-alerts.dismissed-date";

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(SHOWN_DATE_KEY) === todayDateStr()) return false;
  if (localStorage.getItem(DISMISSED_KEY) === todayDateStr()) return false;
  return true;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DailyAlerts() {
  const { store } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "urgent">("all");
  const [gcalEvents, setGcalEvents] = useState<GcalEvent[]>([]);
  const [noShowChecked, setNoShowChecked] = useState(false);

  // Fetch today's Google Calendar events
  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    fetch(
      `/api/google/calendar/events?timeMin=${encodeURIComponent(start.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((d) => setGcalEvents(d.connected ? (d.events ?? []) : []))
      .catch(() => {});
  }, []);

  const alerts = useMemo(() => buildAlerts(store, gcalEvents), [store, gcalEvents]);
  const urgentAlerts = useMemo(() => alerts.filter((a) => a.urgent), [alerts]);
  const displayed = tab === "urgent" ? urgentAlerts : alerts;

  // Open once per session when there are alerts
  useEffect(() => {
    if (alerts.length > 0 && shouldShow()) {
      localStorage.setItem(SHOWN_DATE_KEY, todayDateStr());
      setOpen(true);
    }
  }, [alerts]);

  function close() {
    if (noShowChecked) localStorage.setItem(DISMISSED_KEY, todayDateStr());
    setOpen(false);
  }

  function goToAgenda() {
    localStorage.setItem(DISMISSED_KEY, todayDateStr());
    setOpen(false);
    router.push("/calendar");
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel: bottom sheet on mobile, centered modal on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Alertas de hoy"
        className={cn(
          "fixed z-[61] flex flex-col bg-background shadow-2xl",
          // Mobile: slide up from bottom
          "inset-x-0 bottom-0 rounded-t-2xl max-h-[85dvh]",
          // Desktop: centered modal
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-md sm:rounded-2xl sm:max-h-[88dvh]",
        )}
      >
        {/* Drag handle (mobile only) */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FBE7DD]">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">Tus alertas de hoy</h2>
              <p className="text-xs leading-tight text-muted-foreground">
                Lo importante para que no se te pase nada
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="ml-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pb-3">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <Bell className="h-3.5 w-3.5" />
            {alerts.length} alertas
          </button>
          {urgentAlerts.length > 0 && (
            <button
              type="button"
              onClick={() => setTab("urgent")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "urgent"
                  ? "bg-rose-500 text-white"
                  : "bg-rose-100 text-rose-600 hover:bg-rose-200",
              )}
            >
              🔥 {urgentAlerts.length} urgente{urgentAlerts.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {displayed.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin alertas urgentes hoy
            </p>
          ) : (
            <div className="space-y-1">
              {displayed.map((alert) => {
                const { Icon, iconColor, iconBg } = ALERT_META[alert.type];
                return (
                  <a
                    key={alert.id}
                    href={alert.href}
                    onClick={() => {
                      localStorage.setItem(DISMISSED_KEY, todayDateStr());
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/60 active:bg-muted"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        iconBg,
                      )}
                    >
                      <Icon className={cn("h-4 w-4", iconColor)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-[11px] font-medium leading-none text-muted-foreground">
                        {alert.category}
                      </p>
                      <p className="truncate text-sm font-medium leading-snug">
                        {alert.title}
                      </p>
                    </div>
                    {alert.timeLabel && (
                      <span
                        className={cn(
                          "shrink-0 text-xs font-semibold",
                          alert.urgent ? "text-rose-500" : "text-muted-foreground",
                        )}
                      >
                        {alert.timeLabel}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 space-y-3 border-t bg-background px-5 py-4">
          <button
            type="button"
            onClick={goToAgenda}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <CalendarDays className="h-4 w-4" />
            Ver agenda
          </button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={close}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Más tarde
            </button>
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={noShowChecked}
                onChange={(e) => setNoShowChecked(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-primary"
              />
              No mostrar hasta mañana
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
