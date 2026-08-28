"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

export type CalendarEvent = {
  id: string;
  type: "task" | "course" | "hackathon" | "event" | "google";
  title: string;
  date_at: string;
  end_at?: string;
  status?: string;
  href: string;
  description?: string;
};

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  htmlLink?: string;
  status?: string;
  description?: string;
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
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  const calendarRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!agendaOpen) return;
    function handle(event: PointerEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) setAgendaOpen(false);
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [agendaOpen]);

  const defaultEventDate = useMemo(() => {
    const parsed = parseDate(selectedDay);
    const base = parsed ? new Date(parsed) : new Date();
    const now = new Date();
    base.setHours(now.getHours(), now.getMinutes(), 0, 0);
    return base;
  }, [selectedDay]);

  function selectDay(day: string) {
    setSelectedDay(day);
    setAgendaOpen(true);
  }

  return (
    <div ref={calendarRef} className={cn("relative", agendaOpen && "z-20")}>
      <CalendarHeader
        month={month}
        compact
        controlsRef={newEventRef}
        onPrevious={() => { setMonth(addMonths(month, -1)); setAgendaOpen(false); }}
        onNext={() => { setMonth(addMonths(month, 1)); setAgendaOpen(false); }}
        onCreate={() => { setAgendaOpen(false); setNewEventOpen((open) => !open); }}
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
        <CalendarMonthGrid month={month} eventsByDay={eventsByDay} selectedDay={selectedDay} onSelectDay={selectDay} variant="compact" />
        <button
          type="button"
          onClick={() => setAgendaOpen((open) => !open)}
          className="flex h-8 items-center justify-between rounded-lg border border-[#ece7dc] bg-[#fcfbf8] px-2.5 text-xs font-semibold text-[#5f5a52] transition hover:border-[#e4cdbf] hover:bg-[#fff8f4]"
          aria-expanded={agendaOpen}
        >
          <span>{selectedEvents.length ? `${selectedEvents.length} pendiente${selectedEvents.length === 1 ? "" : "s"}` : "Agenda del día"}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-[#e15d2d] transition-transform", agendaOpen && "rotate-180")} />
        </button>
      </div>

      {agendaOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-[#e4dfd5] bg-white p-3 shadow-[0_16px_34px_rgba(37,30,20,0.16)]">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{formatDayTitle(selectedDay)}</h3>
            {selectedEvents.length > 0 && <Badge className="bg-[#fff0e9] text-[#c6491d] hover:bg-[#fff0e9]">{selectedEvents.length}</Badge>}
          </div>
          {selectedEvents.length > 0 ? (
            <div className="max-h-44 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {selectedEvents.map((event) => <CalendarAgendaRow key={`${event.type}-${event.id}`} event={event} />)}
            </div>
          ) : (
            <div className="rounded-lg bg-[#fcfbf8] px-3 py-4 text-center">
              <p className="text-sm font-semibold text-[#333029]">Sin pendientes este día</p>
              <p className="mt-1 text-xs text-[#777269]">Las tareas sin fecha no se añaden al calendario.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CalendarView({
  events: localEvents,
  completedTasks,
  headerActions,
  calendarStatus,
}: {
  events: CalendarEvent[];
  completedTasks: CompletedTask[];
  headerActions?: React.ReactNode;
  calendarStatus?: React.ReactNode;
}) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  const googleCalendarEvents = useGoogleCalendarEvents(month, calendarRefresh);
  const events = useMemo(() => [...localEvents, ...googleCalendarEvents].sort(sortCalendarEvents), [localEvents, googleCalendarEvents]);
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const selectedEvents = eventsByDay.get(selectedDay) ?? [];
  const completed = completedTasks.filter((task) => task.status === "completada" && task.completed_at && isSameMonth(task.completed_at, month));
  const defaultEventDate = useMemo(() => {
    const selected = parseDate(selectedDay);
    const date = selected ? new Date(selected) : new Date();
    const now = new Date();
    date.setHours(now.getHours(), now.getMinutes(), 0, 0);
    return date;
  }, [selectedDay]);

  function moveMonth(offset: number) {
    const nextMonth = addMonths(month, offset);
    setMonth(nextMonth);
    setSelectedDay(dateKey(nextMonth.toISOString()));
  }

  return (
    <div className="min-w-0 space-y-5 text-[#111111]">
      <PageHeader
        eyebrow="Tu agenda"
        title="Calendario"
        subtitle="Gestiona tus eventos, fechas y actividades."
        actions={
          <div className="hidden items-center gap-2 md:flex">{headerActions}</div>
        }
      />

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(270px,320px)]">
        <section className="min-w-0 overflow-hidden rounded-[20px] border border-[#e8e2d8] bg-white text-[#111111] shadow-[0_12px_30px_rgba(17,17,17,0.045)]">
          <div className="p-3 sm:p-4">
            <CalendarHeader
              month={month}
              onPrevious={() => moveMonth(-1)}
              onNext={() => moveMonth(1)}
              onCreate={() => setNewEventOpen(true)}
              statusSlot={calendarStatus}
            />
          </div>
          <div className="hidden overflow-x-auto border-t border-[#eee8de] md:block">
            <CalendarMonthGrid month={month} eventsByDay={eventsByDay} selectedDay={selectedDay} onSelectDay={setSelectedDay} variant="full" />
          </div>
          <div className="border-t border-[#eee8de] p-3 md:hidden">
            <CalendarMonthGrid month={month} eventsByDay={eventsByDay} selectedDay={selectedDay} onSelectDay={setSelectedDay} variant="compact" />
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-[20px] border border-[#e8e2d8] bg-white p-4 text-[#111111] shadow-[0_10px_26px_rgba(17,17,17,0.04)]">
            <div className="flex items-start justify-between gap-3 border-b border-[#f0ece4] pb-3">
              <div>
                <h2 className="text-base font-semibold">Agenda del día</h2>
                <p className="mt-1 text-xs font-medium text-[#e15d2d]">{formatDayTitle(selectedDay)}</p>
              </div>
              {selectedEvents.length > 0 && <span className="rounded-full bg-[#fff0e9] px-2 py-1 text-xs font-bold text-[#c6491d]">{selectedEvents.length}</span>}
            </div>
            {selectedEvents.length > 0 ? (
              <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto overscroll-contain pr-1">
                {selectedEvents.map((event) => <CalendarAgendaRow key={`${event.type}-${event.id}`} event={event} />)}
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-[#fcfaf6] px-3 py-7 text-center">
                <p className="text-sm font-semibold text-[#333029]">Sin eventos este día</p>
                <p className="mt-1 text-xs leading-5 text-[#777269]">Selecciona otra fecha o crea un nuevo evento.</p>
              </div>
            )}
          </section>

          <section className="rounded-[20px] border border-[#e8e2d8] bg-white p-4 text-[#111111] shadow-[0_10px_26px_rgba(17,17,17,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Resumen del mes</h2>
                <p className="mt-1 text-xs text-[#777269]">Tareas completadas.</p>
              </div>
              <span className="rounded-full bg-[#eef6f0] px-2.5 py-1 text-xs font-bold text-[#1f7a4d]">{completed.length}</span>
            </div>
            {completed.length > 0 ? (
              <div className="mt-3 space-y-2">
                {completed.slice(0, 3).map((task) => (
                  <div key={task.id} className="rounded-xl border border-[#ece7dc] bg-[#fcfbf8] px-3 py-2.5 text-sm">
                    <p className="truncate font-medium">{task.title}</p>
                    <p className="mt-1 text-xs text-[#8a847a]">{formatLongDate(task.completed_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-[#777269]">Todavía no hay tareas completadas este mes.</p>
            )}
          </section>
        </aside>
      </div>

      {newEventOpen && (
        <NewEventDialog
          defaultDate={defaultEventDate}
          onClose={() => setNewEventOpen(false)}
          onCreated={() => setCalendarRefresh((value) => value + 1)}
        />
      )}
    </div>
  );
}

type CalendarHeaderProps = {
  month: Date;
  compact?: boolean;
  controlsRef?: React.RefObject<HTMLDivElement | null>;
  onPrevious: () => void;
  onNext: () => void;
  onCreate?: () => void;
  // The Google Calendar connection indicator - rendered inline with
  // Nuevo evento (full variant only) so a student sees whether the event
  // they're about to create will sync, right where they create it.
  statusSlot?: React.ReactNode;
  children?: React.ReactNode;
};

function CalendarHeader({ month, compact = false, controlsRef, onPrevious, onNext, onCreate, statusSlot, children }: CalendarHeaderProps) {
  if (compact) {
    return (
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-[#111111]">Calendario</h2>
          <p className="mt-0.5 truncate text-xs text-[#777269]">{monthTitle(month)}</p>
        </div>
        <div ref={controlsRef} className="relative flex shrink-0 items-center gap-0.5">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-[#6b6f72] hover:bg-[#fff0e9] hover:text-[#e15d2d]" onClick={onPrevious} aria-label="Mes anterior"><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-[#6b6f72] hover:bg-[#fff0e9] hover:text-[#e15d2d]" onClick={onNext} aria-label="Mes siguiente"><ChevronRight className="h-3.5 w-3.5" /></Button>
          {onCreate && <Button type="button" size="icon" variant="ghost" className="ml-0.5 h-7 w-7 rounded-lg bg-[#fff0e9] text-[#e15d2d] hover:bg-[#fbe2d6] hover:text-[#c6491d]" onClick={onCreate} aria-label="Crear evento"><Plus className="h-3.5 w-3.5" /></Button>}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid min-w-0 grid-cols-[44px_44px_minmax(0,1fr)] items-center gap-2 sm:flex">
        <Button type="button" size="icon" variant="outline" className="h-11 w-11 rounded-xl border-[#e6dfd4] !bg-white !text-[#4e4941] hover:border-[#e5bba8] hover:!bg-[#fff4ee] hover:!text-[#e15d2d] sm:h-9 sm:w-9" aria-label="Mes anterior" onClick={onPrevious}><ChevronLeft className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="outline" className="h-11 w-11 rounded-xl border-[#e6dfd4] !bg-white !text-[#4e4941] hover:border-[#e5bba8] hover:!bg-[#fff4ee] hover:!text-[#e15d2d] sm:h-9 sm:w-9" aria-label="Mes siguiente" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
        <h2 className="min-w-0 truncate text-base font-semibold sm:ml-1 sm:text-lg">{monthTitle(month)}</h2>
      </div>
      <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {statusSlot}
        {onCreate && (
          <Button type="button" size="sm" className="h-11 w-full justify-center rounded-xl px-3 sm:h-9 sm:w-auto" onClick={onCreate}>
            <Plus className="h-4 w-4" /> Nuevo evento
          </Button>
        )}
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
      <div className="grid min-w-0 grid-cols-7 gap-1 text-center text-xs text-[#8e887e]">
        {WEEKDAYS_COMPACT.map((day) => <span key={day} className="min-w-0 pb-0.5 font-semibold">{day}</span>)}
        {cells.map((day) => {
          const hasEvents = eventsByDay.has(day.key);
          const selected = selectedDay === day.key;
          return (
            <button key={day.key} type="button" className={cn("relative flex h-10 min-w-0 items-center justify-center rounded-lg text-sm font-medium transition-colors", day.inMonth ? "text-[#39352e] hover:bg-[#fff0e9]" : "text-[#cbc5ba]", selected && "al-action-soft-selected shadow-[0_4px_10px_rgba(80,43,27,0.06)]", hasEvents && !selected && "bg-[#eef6f0] text-[#1f7a4d] ring-1 ring-[#1f7a4d]/15")} onClick={() => onSelectDay?.(day.key)}>
              {day.date.getDate()}
              {hasEvents && <span className={cn("absolute bottom-1 h-1 w-1 rounded-full", selected ? "bg-white" : "bg-[#1f7a4d]")} />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 text-xs text-[#7d776e]">
      {WEEKDAYS_FULL.map((day) => <div key={day} className="border-b border-r border-[#eee8de] bg-[#fcfaf6] px-3 py-2.5 text-center font-semibold last:border-r-0">{day}</div>)}
      {cells.map((cell) => {
        const dayEvents = eventsByDay.get(cell.key) ?? [];
        const selected = selectedDay === cell.key;
        return (
          <div key={cell.key} className={cn("min-h-[112px] border-b border-r border-[#eee8de] p-2.5 transition-colors last:border-r-0", cell.inMonth ? "bg-white" : "bg-[#fbfaf7] text-[#bbb4a9]", selected && "bg-[#fff9f5] shadow-[inset_0_0_0_1px_rgba(225,93,45,0.18)]")}>
            <button
              type="button"
              onClick={() => onSelectDay?.(cell.key)}
              className={cn("mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors hover:bg-[#fff0e9] hover:text-[#e15d2d]", cell.key === todayKey() && "al-action-soft-selected shadow-[0_4px_10px_rgba(80,43,27,0.06)]", selected && cell.key !== todayKey() && "bg-[#fff0e9] font-bold text-[#c6491d]")}
              aria-label={`Ver agenda del ${cell.date.getDate()}`}
            >
              {cell.date.getDate()}
            </button>
            <div className="space-y-1">
              {dayEvents.slice(0, 4).map((event) => <CalendarPill key={`${event.type}-${event.id}`} event={event} />)}
              {dayEvents.length > 4 && <p className="px-1 text-[11px] font-medium text-[#8a847a]">+{dayEvents.length - 4} más</p>}
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
      if (response.status === 401) {
        throw new Error("Conecta Google Calendar para crear eventos.");
      }
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
          {error && (
            <p className="text-xs text-[#b63f24]">
              {error}{" "}
              {error.startsWith("Conecta Google Calendar") && (
                <a href="/api/google/calendar/auth?next=/calendar" className="font-semibold underline underline-offset-2">Conectar ahora</a>
              )}
            </p>
          )}
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

// Every event - task, course, hackathon, Google - opens this dialog on
// click. Nothing navigates on the first tap: the student reads the event
// where they are, then the dialog's action takes them to that exact item
// (the to-do on the tasks page, the course/event detail page) instead of
// dropping them on a list.
function CalendarAgendaRow({ event }: { event: CalendarEvent }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const timeLabel = calendarTimeLabel(event);

  return (
    <>
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        className="flex w-full items-start gap-2 rounded-xl border border-[#ece7dc] bg-[#fcfbf8] p-2.5 text-left text-sm transition-colors hover:border-[#e5c7b8] hover:bg-[#fff8f4]"
      >
        <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", calendarDotClass(event.type, event.status))} />
        <span className="min-w-0">
          <span className="block truncate font-medium">{event.title}</span>
          <span className="text-xs text-muted-foreground">{timeLabel} - {calendarTypeLabel(event.type)}</span>
        </span>
      </button>
      {detailOpen && <CalendarEventDetailDialog event={event} onClose={() => setDetailOpen(false)} />}
    </>
  );
}

function CalendarPill({ event }: { event: CalendarEvent }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const label = (event.type === "task" && event.date_at ? `${formatTime(event.date_at)} ` : "") + event.title;

  return (
    <>
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        className={cn("block w-full truncate rounded px-2 py-1 text-left text-[11px] leading-tight", calendarEventClass(event.type, event.status))}
        title={event.title}
      >
        {label}
      </button>
      {detailOpen && <CalendarEventDetailDialog event={event} onClose={() => setDetailOpen(false)} />}
    </>
  );
}

function calendarEventEyebrow(type: CalendarEvent["type"]) {
  if (type === "task") return "Tarea";
  if (type === "course") return "Curso";
  if (type === "hackathon" || type === "event") return "Evento";
  return "Evento de Google Calendar";
}

function calendarEventAction(event: CalendarEvent): { label: string; href: string; external: boolean } | null {
  if (event.type === "google") {
    return event.href?.startsWith("http") ? { label: "Ver en Google Calendar", href: event.href, external: true } : null;
  }
  if (!event.href || event.href === "/calendar") return null;
  const label = event.type === "task" ? "Abrir tarea" : event.type === "course" ? "Ver curso" : "Ver evento";
  return { label, href: event.href, external: false };
}

function CalendarEventDetailDialog({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const detailId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();
        onCloseRef.current();
        return;
      }
      if (keyEvent.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        keyEvent.preventDefault();
        return;
      }
      if (!dialogRef.current.contains(document.activeElement)) {
        keyEvent.preventDefault();
        (keyEvent.shiftKey ? last : first).focus();
        return;
      }
      if (keyEvent.shiftKey && document.activeElement === first) {
        keyEvent.preventDefault();
        last.focus();
      } else if (!keyEvent.shiftKey && document.activeElement === last) {
        keyEvent.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const action = calendarEventAction(event);

  return (
    <>
      <button type="button" aria-label="Cerrar evento" onClick={onClose} className="fixed inset-0 z-50 cursor-default bg-black/30 backdrop-blur-[1px]" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={detailId} className="fixed left-1/2 top-1/2 z-[51] max-h-[calc(100dvh-2rem)] w-[min(25rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[18px] border border-[#e4dfd5] bg-white text-[#111111] shadow-[0_22px_50px_rgba(17,17,17,0.24)]">
        <div className="flex items-center justify-between border-b border-[#f0ece2] px-4 py-3">
          <span className={cn("text-xs font-bold uppercase tracking-[0.08em]", event.type === "google" ? "text-[#a43b32]" : "text-[#c94f21]")}>
            {calendarEventEyebrow(event.type)}
          </span>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[#f7f3ed] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e15d2d]" aria-label="Cerrar"><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="space-y-2.5 p-4">
          <h2 id={titleId} className="text-lg font-semibold">{event.title}</h2>
          <p id={detailId} className="text-sm text-[#6b6f72]">
            {formatDayTitle(dateKey(event.date_at))}
            {" · "}
            {calendarTimeLabel(event)}
          </p>
          {event.description && (
            <p className="whitespace-pre-wrap text-sm text-[#333029]">{event.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#f0ece2] px-4 py-3">
          {action ? (
            action.external ? (
              <a href={action.href} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-xl bg-[#e15d2d] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#c6491d]">
                {action.label}
              </a>
            ) : (
              <Link href={action.href} onClick={onClose} className="inline-flex h-9 items-center rounded-xl bg-[#e15d2d] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#c6491d]">
                {action.label}
              </Link>
            )
          ) : <span />}
          <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </>
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
    description: event.description,
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
  if (isCalendarEventDone({ type, status })) return "border border-slate-200 bg-slate-100 text-slate-700 line-through";
  if (type === "task") return "border border-[#f4d3c5] bg-[#fff0e9] text-[#c6491d]";
  if (type === "course" || type === "event") return "border border-[#d3ead9] bg-[#eaf6ed] text-[#1f7a4d]";
  if (type === "google") return "border border-[#f3d0cd] bg-[#fff0ee] text-[#a43b32]";
  return "border border-[#f0dfb9] bg-[#fff7df] text-[#8a5c14]";
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
  const title = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function formatDayTitle(value: string) {
  const date = parseDate(value);
  if (!date) return "Día seleccionado";
  const title = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "2-digit", month: "long", timeZone: "Europe/Madrid" }).format(date);
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function formatTime(value?: string) {
  const date = parseDate(value);
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isDateOnly(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function calendarTimeLabel(event: Pick<CalendarEvent, "type" | "date_at" | "end_at">) {
  if (event.type === "google" && isDateOnly(event.date_at)) return "Todo el día";
  const start = formatTime(event.date_at);
  const end = event.end_at ? formatTime(event.end_at) : "";
  return end ? `${start} - ${end}` : start;
}

function formatLongDate(value?: string) {
  const date = parseDate(value);
  if (!date) return "sin fecha";
  const parts = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Madrid",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.day}/${values.month}/${values.year} · ${values.hour}:${values.minute}`;
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
