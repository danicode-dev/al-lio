"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  type: "task" | "course" | "hackathon" | "event" | "google";
  title: string;
  date_at: string;
  end_at?: string;
  status?: string;
  href: string;
};

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  htmlLink?: string;
  status?: string;
};

type CompletedTask = {
  id: string;
  title: string;
  status: string;
  completed_at?: string;
};

const googleEventsCache = new Map<string, GoogleCalendarEvent[]>();

export async function loadGoogleCalendarRange(start: string, end: string, force = false) {
  const cacheKey = `${start}:${end}`;
  const cached = googleEventsCache.get(cacheKey);
  if (cached && !force) return cached;

  const response = await fetch(`/api/google/calendar/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Google Calendar request failed");
  const data = await response.json();
  const events = data.connected ? data.events ?? [] : [];
  googleEventsCache.set(cacheKey, events);
  return events as GoogleCalendarEvent[];
}

export function TaskCalendar({ events: localEvents }: { events: CalendarEvent[] }) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  const newEventRef = useRef<HTMLDivElement>(null);
  const googleCalendarEvents = useGoogleCalendarEvents(month, calendarRefresh);
  const events = useMemo(
    () => [...localEvents, ...googleCalendarEvents]
      .filter((event) => !isCalendarEventDone(event))
      .sort(sortCalendarEvents),
    [localEvents, googleCalendarEvents],
  );
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const selectedEvents = eventsByDay.get(selectedDay) ?? [];

  useEffect(() => {
    if (!newEventOpen) return;
    function handle(event: PointerEvent) {
      if (newEventRef.current && !newEventRef.current.contains(event.target as Node)) setNewEventOpen(false);
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [newEventOpen]);

  const defaultEventDate = useMemo(() => {
    const parsed = parseDate(selectedDay);
    const base = parsed ? new Date(parsed) : new Date();
    const now = new Date();
    base.setHours(now.getHours(), now.getMinutes(), 0, 0);
    return base;
  }, [selectedDay]);

  return (
    <div>
      <CalendarHeader
        month={month}
        compact
        controlsRef={newEventRef}
        onPrevious={() => setMonth(addMonths(month, -1))}
        onToday={() => { setMonth(startOfMonth(new Date())); setSelectedDay(todayKey()); }}
        onNext={() => setMonth(addMonths(month, 1))}
        onCreate={() => setNewEventOpen((open) => !open)}
      >
        {newEventOpen && (
          <NewEventDialog
            defaultDate={defaultEventDate}
            onClose={() => setNewEventOpen(false)}
            onCreated={() => setCalendarRefresh((value) => value + 1)}
          />
        )}
      </CalendarHeader>

      <div className="grid gap-3">
        <CalendarMonthGrid month={month} eventsByDay={eventsByDay} selectedDay={selectedDay} onSelectDay={setSelectedDay} variant="compact" />
        <div className="h-52 rounded-xl border border-[#ece7dc] bg-[#fcfbf8] p-3">
          {selectedEvents.length > 0 ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{formatDayTitle(selectedDay)}</h3>
                <Badge>{selectedEvents.length}</Badge>
              </div>
              <div className="max-h-[145px] space-y-2 overflow-y-auto overscroll-contain pr-1">
                {selectedEvents.map((event) => <CalendarAgendaRow key={`${event.type}-${event.id}`} event={event} />)}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <p className="text-sm font-semibold text-[#333029]">Sin pendientes este día</p>
              <p className="mt-1 text-xs text-[#777269]">Las tareas sin fecha no se añaden al calendario.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CalendarView({ events: localEvents, completedTasks }: { events: CalendarEvent[]; completedTasks: CompletedTask[] }) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const googleCalendarEvents = useGoogleCalendarEvents(month);
  const events = useMemo(() => [...localEvents, ...googleCalendarEvents].sort(sortCalendarEvents), [localEvents, googleCalendarEvents]);
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const completed = completedTasks.filter((task) => task.status === "completada" && task.completed_at && isSameMonth(task.completed_at, month));

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold tracking-normal">Calendario</h2>
      <Card className="p-4">
        <CalendarHeader
          month={month}
          onPrevious={() => setMonth(addMonths(month, -1))}
          onToday={() => setMonth(startOfMonth(new Date()))}
          onNext={() => setMonth(addMonths(month, 1))}
        />
        <CalendarMonthGrid month={month} eventsByDay={eventsByDay} variant="full" />
      </Card>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Resumen realizado</h2>
            <p className="text-sm text-muted-foreground">Tareas completadas durante este mes.</p>
          </div>
          <Badge>{completed.length} completadas</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {completed.length ? completed.slice(0, 9).map((task) => (
            <div key={task.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{task.title}</p>
              <p className="mt-1 text-muted-foreground">{formatLongDate(task.completed_at)}</p>
            </div>
          )) : <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Todavía no hay tareas completadas este mes.</div>}
        </div>
      </Card>
    </div>
  );
}

type CalendarHeaderProps = {
  month: Date;
  compact?: boolean;
  controlsRef?: React.RefObject<HTMLDivElement | null>;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
  onCreate?: () => void;
  children?: React.ReactNode;
};

function CalendarHeader({ month, compact = false, controlsRef, onPrevious, onToday, onNext, onCreate, children }: CalendarHeaderProps) {
  if (compact) {
    return (
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-[#111111]">Calendario</h2>
          <p className="mt-0.5 truncate text-xs text-[#777269]">{monthTitle(month)}</p>
        </div>
        <div ref={controlsRef} className="relative flex shrink-0 items-center gap-0.5">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-[#6b6f72] hover:bg-[#fff0e9] hover:text-[#e15d2d]" onClick={onPrevious} aria-label="Mes anterior"><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 rounded-lg px-2 text-xs text-[#6b6f72] hover:bg-[#fff0e9] hover:text-[#e15d2d]" onClick={onToday}>Hoy</Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-[#6b6f72] hover:bg-[#fff0e9] hover:text-[#e15d2d]" onClick={onNext} aria-label="Mes siguiente"><ChevronRight className="h-3.5 w-3.5" /></Button>
          {onCreate && <Button type="button" size="icon" variant="ghost" className="ml-0.5 h-7 w-7 rounded-lg bg-[#fff0e9] text-[#e15d2d] hover:bg-[#fbe2d6] hover:text-[#c6491d]" onClick={onCreate} aria-label="Crear evento"><Plus className="h-3.5 w-3.5" /></Button>}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-xl font-semibold">{monthTitle(month)}</h2>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" aria-label="Mes anterior" onClick={onPrevious}><ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Mes anterior</span></Button>
        <Button type="button" size="sm" variant="outline" onClick={onToday}>Hoy</Button>
        <Button type="button" size="sm" variant="outline" aria-label="Mes siguiente" onClick={onNext}><span className="hidden sm:inline">Mes siguiente</span><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

type CalendarMonthGridProps = {
  month: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  variant: "compact" | "full";
  selectedDay?: string;
  onSelectDay?: (day: string) => void;
};

function CalendarMonthGrid({ month, eventsByDay, variant, selectedDay, onSelectDay }: CalendarMonthGridProps) {
  const cells = buildMonthCells(month);

  if (variant === "compact") {
    return (
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[#8e887e]">
        {WEEKDAYS_COMPACT.map((day) => <span key={day} className="pb-0.5 font-semibold">{day}</span>)}
        {cells.map((day) => {
          const hasEvents = eventsByDay.has(day.key);
          const selected = selectedDay === day.key;
          return (
            <button key={day.key} type="button" className={cn("relative flex h-8 items-center justify-center rounded-lg text-sm font-medium transition-colors", day.inMonth ? "text-[#39352e] hover:bg-[#fff0e9]" : "text-[#cbc5ba]", selected && "bg-[#f06a37] text-white shadow-[0_4px_10px_rgba(240,106,55,0.22)] hover:bg-[#e15d2d]", hasEvents && !selected && "bg-[#eef6f0] text-[#1f7a4d] ring-1 ring-[#1f7a4d]/15")} onClick={() => onSelectDay?.(day.key)}>
              {day.date.getDate()}
              {hasEvents && <span className={cn("absolute bottom-1 h-1 w-1 rounded-full", selected ? "bg-white" : "bg-[#1f7a4d]")} />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 border-l border-t text-xs text-muted-foreground">
      {WEEKDAYS_FULL.map((day) => <div key={day} className="border-b border-r p-2 font-medium">{day}</div>)}
      {cells.map((cell) => {
        const dayEvents = eventsByDay.get(cell.key) ?? [];
        return (
          <div key={cell.key} className={cn("min-h-32 border-b border-r p-2", cell.inMonth ? "bg-background" : "bg-muted/30 text-muted-foreground/60")}>
            <div className={cn("mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm", cell.key === todayKey() && "bg-primary text-primary-foreground")}>{cell.date.getDate()}</div>
            <div className="space-y-1">
              {dayEvents.slice(0, 4).map((event) => <CalendarPill key={`${event.type}-${event.id}`} event={event} />)}
              {dayEvents.length > 4 && <p className="text-[11px] text-muted-foreground">+{dayEvents.length - 4} más</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NewEventDialog({ defaultDate, onClose, onCreated }: { defaultDate: Date; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState(defaultDate);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/google/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          start: eventDate.toISOString(),
          end: addMinutes(eventDate, 60).toISOString(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar");
      }
      googleEventsCache.clear();
      toast.success("Evento añadido al calendario");
      onCreated();
      onClose();
    } catch (caught) {
      setError((caught as Error).message);
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" aria-label="Cerrar nuevo evento" onClick={onClose} className="fixed inset-0 z-50 cursor-default bg-black/30 backdrop-blur-[1px]" />
      <div role="dialog" aria-modal="true" aria-labelledby="new-event-title" className="fixed left-1/2 top-1/2 z-[51] max-h-[calc(100dvh-2rem)] w-[min(25rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[18px] border border-[#e4dfd5] bg-white text-[#111111] shadow-[0_22px_50px_rgba(17,17,17,0.24)]">
        <div className="flex items-center justify-between border-b border-[#f0ece2] px-4 py-3">
          <span id="new-event-title" className="text-sm font-semibold">Nuevo evento</span>
          <button type="button" onClick={onClose} className="flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="space-y-2.5 p-4">
          <Input placeholder="Añadir título" value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} autoFocus />
          <button type="button" onClick={() => setDescriptionOpen((open) => !open)} className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted">
            <span className="text-muted-foreground">{notes.trim() ? "Descripción añadida" : "Descripción"}</span>
            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", descriptionOpen && "rotate-90")} />
          </button>
          {descriptionOpen && <Textarea placeholder="Escribe los detalles del evento" value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="text-sm" />}
          <EventDateTimeFields value={eventDate} onChange={setEventDate} />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#f0ece2] px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={saving || !title.trim()}>{saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </div>
    </>
  );
}

function EventDateTimeFields({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  function updateDate(dateValue: string) {
    const [year, month, day] = dateValue.split("-").map(Number);
    if (!year || !month || !day) return;
    const next = new Date(value);
    next.setFullYear(year, month - 1, day);
    onChange(next);
  }

  function updateTime(timeValue: string) {
    const [hour, minute] = timeValue.split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return;
    const next = new Date(value);
    next.setHours(hour, minute, 0, 0);
    onChange(next);
  }

  function setToday() {
    const now = new Date();
    const next = new Date(value);
    next.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    onChange(next);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Día</p>
        <div className="flex gap-2">
          <Input type="date" value={toDateInputValue(value)} onChange={(event) => updateDate(event.target.value)} />
          <Button type="button" variant="outline" size="sm" className="h-10 shrink-0" onClick={setToday}>Hoy</Button>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Hora</p>
        <Input type="time" value={toTimeInputValue(value)} onChange={(event) => updateTime(event.target.value)} />
      </div>
    </div>
  );
}

function CalendarAgendaRow({ event }: { event: CalendarEvent }) {
  return (
    <Link href={event.href} className="flex items-start gap-2 rounded-md border bg-card/70 p-2.5 text-sm hover:bg-muted">
      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", calendarDotClass(event.type, event.status))} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{event.title}</span>
        <span className="text-xs text-muted-foreground">{formatTime(event.date_at)}{event.end_at ? ` - ${formatTime(event.end_at)}` : ""} - {calendarTypeLabel(event.type)}</span>
      </span>
    </Link>
  );
}

function CalendarPill({ event }: { event: CalendarEvent }) {
  return (
    <Link href={event.href} className={cn("block truncate rounded px-2 py-1 text-[11px] leading-tight", calendarEventClass(event.type, event.status))} title={event.title}>
      {event.type === "task" && event.date_at ? `${formatTime(event.date_at)} ` : ""}{event.title}
    </Link>
  );
}

function useGoogleCalendarEvents(month: Date, refreshKey = 0) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);

  useEffect(() => {
    let alive = true;
    const start = startOfMonth(month).toISOString();
    const end = addMonths(startOfMonth(month), 1).toISOString();
    loadGoogleCalendarRange(start, end, refreshKey > 0)
      .then((next) => { if (alive) setEvents(next); })
      .catch(() => { if (alive) setEvents([]); });
    return () => { alive = false; };
  }, [month, refreshKey]);

  return useMemo(() => events.map((event) => ({
    id: event.id,
    type: "google" as const,
    title: event.title,
    date_at: event.start,
    end_at: event.end,
    status: event.status,
    href: event.htmlLink || "/calendar",
  })), [events]);
}

export function isCalendarEventDone(event: Pick<CalendarEvent, "type" | "status">) {
  const status = String(event.status || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (event.type === "task") return status === "completada" || status === "cancelada";
  if (event.type === "course") return status.includes("termin") || status.includes("final") || status.includes("descart");
  if (event.type === "hackathon") return status.includes("realiz") || status.includes("final") || status.includes("descart");
  return status === "cancelled" || status === "cancelado";
}

export function sortCalendarEvents(a: CalendarEvent, b: CalendarEvent) {
  return String(a.date_at || "").localeCompare(String(b.date_at || ""));
}

function groupEventsByDay(events: CalendarEvent[]) {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dateKey(event.date_at);
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }
  return grouped;
}

function calendarEventClass(type: CalendarEvent["type"], status?: string) {
  if (isCalendarEventDone({ type, status })) return "bg-slate-100 text-slate-700 line-through";
  if (type === "task") return "bg-[#fff0e9] text-[#c6491d]";
  if (type === "course" || type === "event") return "bg-[#eaf6ed] text-[#1f7a4d]";
  if (type === "google") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-900";
}

function calendarDotClass(type: CalendarEvent["type"], status?: string) {
  if (isCalendarEventDone({ type, status })) return "bg-slate-400";
  if (type === "task") return "bg-[#f06a37]";
  if (type === "course" || type === "event") return "bg-[#1f7a4d]";
  if (type === "google") return "bg-red-500";
  return "bg-amber-500";
}

function calendarTypeLabel(type: CalendarEvent["type"]) {
  if (type === "task") return "tarea";
  if (type === "course") return "curso";
  if (type === "hackathon") return "hackathon";
  if (type === "event") return "evento";
  return "Google";
}

const WEEKDAYS_COMPACT = ["L", "M", "X", "J", "V", "S", "D"];
const WEEKDAYS_FULL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function buildMonthCells(month: Date) {
  const first = startOfMonth(month);
  const leading = (first.getDay() + 6) % 7;
  const start = addDays(first, -leading);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return { date, key: dateKey(date.toISOString()), inMonth: date.getMonth() === month.getMonth() };
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
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

function todayKey() {
  return dateKey(new Date().toISOString());
}

function isSameMonth(value: string | undefined, month: Date) {
  const date = parseDate(value);
  return Boolean(date) && date!.getFullYear() === month.getFullYear() && date!.getMonth() === month.getMonth();
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
}

function formatDayTitle(value: string) {
  const date = parseDate(value);
  if (!date) return "Día seleccionado";
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "2-digit", month: "long" }).format(date);
}

function formatTime(value?: string) {
  const date = parseDate(value);
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatLongDate(value?: string) {
  const date = parseDate(value);
  if (!date) return "sin fecha";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
