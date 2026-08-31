"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlarmClock, Bell, Plus, X } from "lucide-react";

import { useCourseActions } from "@/features/courses/client";
import { useEventActions } from "@/features/events/client";
import { useTaskActions } from "@/features/tasks/client";
import { useApplicationStore } from "@/shared/store/application-store";
import { QuickAdd } from "@/components/quick-add";
import type { Store } from "@/components/store/types";
import {
  isCalendarEventDone,
  loadGoogleCalendarRange,
  sortCalendarEvents,
  type CalendarEvent,
  type GoogleCalendarEvent,
} from "@/components/calendar/app-calendar";
import { getDashboardCalendarEvents } from "@/lib/dashboard/calendar-events";

const iconButtonBaseClass =
  "relative inline-flex items-center justify-center rounded-xl border border-[#ece7dc] bg-white text-[#5f6368] shadow-[0_2px_8px_rgba(17,17,17,0.04)] transition hover:border-[#f4b398] hover:bg-[#fff7f3] hover:text-[#e15d2d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f06a37]";

const VISIBLE_ROUTES = [
  "/dashboard",
  "/roadmap",
  "/tasks",
  "/bloc",
  "/noticias",
  "/work",
  "/courses",
  "/hackathons",
  "/calendar",
  "/profile",
];

function isVisibleRoute(pathname: string) {
  return VISIBLE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

type StudentHeaderActionsProps = {
  size?: "compact" | "touch";
};

export function StudentHeaderActions({ size = "compact" }: StudentHeaderActionsProps = {}) {
  const pathname = usePathname();
  const { store } = useApplicationStore();
  const actions = { ...useTaskActions(), ...useCourseActions(), ...useEventActions() };
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const iconButtonClass = `${iconButtonBaseClass} ${size === "touch" ? "h-11 w-11" : "h-9 w-9"}`;

  if (!isVisibleRoute(pathname)) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        // Anchor the product tour points at. The tour only highlights and
        // explains this button - it never opens the dialog itself.
        data-tour={size === "touch" ? "quick-add-mobile" : "quick-add"}
        onClick={() => setQuickAddOpen(true)}
        aria-label="Añadir rápido"
        className={iconButtonClass}
      >
        <Plus className="h-4 w-4" />
      </button>
      <NotificationsPopover store={store} buttonClassName={iconButtonClass} />
      <QuickAdd open={quickAddOpen} setOpen={setQuickAddOpen} actions={actions} />
    </div>
  );
}

function formatEventDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return hasTime ? `${day}, ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : day;
}

function NotificationsPopover({ store, buttonClassName }: { store: Store; buttonClassName: string }) {
  const [open, setOpen] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const weekLimit = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + 7);
    return date;
  }, [today]);

  useEffect(() => {
    let alive = true;
    loadGoogleCalendarRange(today.toISOString(), weekLimit.toISOString())
      .then((events) => { if (alive) setGoogleEvents(events); })
      .catch(() => { if (alive) setGoogleEvents([]); });
    return () => { alive = false; };
  }, [today, weekLimit]);

  const alerts = useMemo(() => {
    const local = getDashboardCalendarEvents(store).filter((event) => {
      if (isCalendarEventDone(event)) return false;
      const date = event.date_at ? new Date(event.date_at) : null;
      return Boolean(date) && !Number.isNaN(date!.getTime()) && date! >= today && date! <= weekLimit;
    });
    const google: CalendarEvent[] = googleEvents
      .filter((event) => {
        const date = event.start ? new Date(event.start) : null;
        return Boolean(date) && !Number.isNaN(date!.getTime()) && date! >= today && date! <= weekLimit;
      })
      .map((event) => ({
        id: `gcal-${event.id}`,
        type: "event" as const,
        title: event.title,
        date_at: event.start,
        status: event.status,
        href: event.htmlLink || "/calendar",
      }));
    return [...local, ...google].sort(sortCalendarEvents).slice(0, 12);
  }, [store, googleEvents, today, weekLimit]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={alerts.length ? `${alerts.length} avisos de la semana` : "Avisos de la semana"}
        aria-expanded={open}
        aria-controls={panelId}
        className={buttonClassName}
      >
        <Bell className="h-4 w-4" />
        {alerts.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f06a37] px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {Math.min(alerts.length, 9)}
          </span>
        )}
      </button>
      {open && (
        <div
          id={panelId}
          aria-label="Avisos de la semana"
          className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] rounded-lg border bg-background shadow-xl sm:w-80"
        >
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
            <div className="flex items-center gap-2">
              <AlarmClock className="h-4 w-4 shrink-0 text-amber-500" />
              <h2 className="text-sm font-semibold">Próximos 7 días</h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => { setOpen(false); triggerRef.current?.focus(); }}
              aria-label="Cerrar avisos"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sin avisos esta semana</p>
            ) : (
              <ul className="divide-y">
                {alerts.map((event) => (
                  <li key={`${event.type}-${event.id}`}>
                    <Link
                      href={event.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
                    >
                      <span className="flex-1 truncate">{event.title}</span>
                      {event.date_at && <span className="shrink-0 text-xs text-muted-foreground">{formatEventDate(event.date_at)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
