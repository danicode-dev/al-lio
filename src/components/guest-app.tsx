"use client";

import Image from "next/image";
import Link from "next/link";
import React, { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlarmClock,
  Bookmark,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreVertical,
  ExternalLink,
  Flame,
  Heart,
  ListChecks,
  ListTodo,
  MapPin,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  Trophy,
  X,
  Youtube,
} from "lucide-react";
import { DndContext, useDraggable, useDroppable, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildJobSearchUrl, jobPlatforms, type JobPlatform } from "@/lib/deeplinks/job-search-urls";
import { toast } from "sonner";
import { BlocNotepad } from "@/components/bloc/bloc-notepad";
import {
  CalendarView,
  sortCalendarEvents as sortEvents,
  type CalendarEvent,
} from "@/components/calendar/app-calendar";
import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";
import type { JobApplication, ApplicationStatus } from "@/lib/job-radar/types";
import { APPLICATION_STATUSES, STATUS_LABELS, STATUS_COLORS } from "@/lib/job-radar/types";
import { useStore } from "@/components/guest-store";
import type {
  Company,
  Course,
  FpCatalogItem,
  Hackathon,
  RequiredCompetency,
  ReturnTypeActions,
  Store,
  Task,
  TaskPriority,
} from "@/components/store/types";

export type View = "dashboard" | "work" | "courses" | "hackathons" | "tasks" | "calendar" | "links" | "sources" | "settings" | "bloc";
type TaskBucket = "diario" | "urgente" | "semanal";
type AppSettings = {
  displayName: string;
  defaultTaskBucket: TaskBucket;
  compactTaskView: boolean;
};

const appSettingsKey = "techlife.app.settings.D1OS.v1";
const defaultAppSettings: AppSettings = {
  displayName: "",
  defaultTaskBucket: "diario",
  compactTaskView: true,
};

const defaultPortals: Array<{ name: JobPlatform; note: string }> = [
  { name: "LinkedIn", note: "Buen radar para empresas y puestos reales." },
  { name: "InfoJobs", note: "Util para empresas locales y consultoras." },
  { name: "Indeed", note: "Busqueda amplia por termino y ciudad." },
  { name: "Tecnoempleo", note: "Especializado en perfiles IT." },
  { name: "JobToday", note: "Entrada rapida y ofertas locales." },
  { name: "Talent.com", note: "Agregador de ofertas." },
  { name: "Welcome to the Jungle", note: "Empresas tech y cultura." },
];

const taskBuckets: Array<{
  id: TaskBucket;
  title: string;
  shortTitle: string;
  description: string;
  tone: string;
  Icon: typeof ListTodo;
}> = [
  {
    id: "diario",
    title: "Diario",
    shortTitle: "Hoy",
    description: "Lo que necesita avanzar antes de cerrar el dia.",
    tone: "from-sky-500 to-cyan-500",
    Icon: CheckSquare2,
  },
  {
    id: "urgente",
    title: "Pendiente",
    shortTitle: "Pendiente",
    description: "Bloqueos, bugs y acciones pendientes.",
    tone: "from-amber-500 to-orange-500",
    Icon: Clock,
  },
  {
    id: "semanal",
    title: "Semanal",
    shortTitle: "Semana",
    description: "Plan de foco para mantener el ritmo.",
    tone: "from-emerald-500 to-teal-500",
    Icon: CalendarDays,
  },
];

const taskBucketIds = taskBuckets.map((bucket) => bucket.id);
const taskPriorities: TaskPriority[] = ["baja", "media", "alta", "critica"];

export function GuestApp({ view }: { view: View }) {
  const { store, actions } = useStore();

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {view !== "dashboard" && view !== "calendar" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
              {({
                work: "Trabajo",
                tasks: "Tareas",
                courses: "Cursos",
                hackathons: "Eventos y retos",
                calendar: "Calendario",
                links: "Links",
                sources: "Fuentes",
                settings: "Configuración",
                bloc: "Bloc de notas",
              } as Record<string, string>)[view] ?? view}
            </h1>
          </div>
        </div>
      )}
      {view === "work" && <Work store={store} actions={actions} />}
      {view === "tasks" && <Tasks store={store} actions={actions} />}
      {view === "courses" && <Courses store={store} actions={actions} />}
      {view === "hackathons" && <Hackathons store={store} actions={actions} />}
      {view === "calendar" && (
        <CalendarView
          events={getCalendarEvents(store)}
          completedTasks={store.tasks}
          headerActions={<GoogleCalendarStatusControl />}
        />
      )}
      {view === "links" && <LinksView store={store} actions={actions} />}
      {view === "sources" && <Sources />}
      {view === "settings" && <Settings reset={actions.reset} addTask={actions.addTask} />}
      {view === "bloc" && <BlocView />}
    </div>
  );
}

function completeHackathonItem(item: Hackathon, actions: ReturnTypeActions) {
  if (item.sourceTable === "tech_opportunities" || item.sourceTable === "fp_content_items" || item.id.startsWith("tech-") || item.id.startsWith("fp-")) {
    const data = hackathonAddPayload(item);
    actions.addHackathon({
      ...data,
      status: "realizado",
      sourceTable: undefined,
      notes: appendCompletionNote(item.notes, "Marcado como realizado desde D1OS."),
    }).catch(() => {});
    return;
  }

  actions.updateHackathon(item.id, { status: "realizado" });
}

function appendCompletionNote(notes: string | undefined, text: string) {
  return [notes, text].filter(Boolean).join("\n\n");
}

function hackathonAddPayload(item: Hackathon) {
  const data: Partial<Hackathon> = { ...item };
  delete data.id;
  delete data.created_at;
  return data as Omit<Hackathon, "id" | "created_at">;
}

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

  const statusTone = loading ? "bg-muted-foreground" : connected ? "bg-emerald-500" : "bg-amber-500";
  const label = connected ? "Calendar" : "Conectar Calendar";
  const content = (
    <>
      <span className="grid h-3.5 w-3.5 shrink-0 grid-cols-2 overflow-hidden rounded-[3px] border border-background/80 shadow-sm" aria-hidden="true">
        <span className="bg-blue-500" />
        <span className="bg-green-500" />
        <span className="bg-yellow-400" />
        <span className="bg-red-500" />
      </span>
      <span className={cn("h-1.5 w-1.5 rounded-full", statusTone)} />
      <span className="hidden sm:inline truncate text-xs font-medium">{label}</span>
    </>
  );

  if (connected) {
    return (
      <button
        type="button"
        className="inline-flex h-8 w-fit items-center gap-2 rounded-md border bg-card/90 px-2.5 text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
        onClick={disconnect}
        disabled={busy}
        title="Google Calendar conectado. Click para desconectar."
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href="/api/google/calendar/auth?next=/dashboard"
      className={cn("inline-flex h-8 w-fit items-center gap-2 rounded-md border bg-card/90 px-2.5 text-foreground shadow-sm transition-colors hover:bg-muted", loading && "pointer-events-none opacity-60")}
      title="Conectar Google Calendar"
      aria-disabled={loading}
    >
      {content}
    </a>
  );
}

function TaskBoard({ store, actions, limit, variant = "full", compact: compactProp }: { store: Store; actions: ReturnTypeActions; limit?: number; variant?: "dashboard" | "full"; compact?: boolean }) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const compact = compactProp ?? (variant === "dashboard");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newBucket = over.id as TaskBucket;
    if (!taskBucketIds.includes(newBucket)) return;
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task || toTaskBucket(task.category) === newBucket) return;
    actions.updateTask(taskId, { category: newBucket });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className={cn(compact ? "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3" : "grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start")}>
        {taskBuckets.map((bucket) => {
          const tasks = tasksForBucket(store.tasks, bucket.id);
          const visibleTasks = limit ? tasks.slice(0, limit) : tasks;
          if (!compact) {
            return (
              <TaskSectionCard
                key={bucket.id}
                bucket={bucket}
                tasks={visibleTasks}
                completedTasks={recentCompletedTasksForBucket(store.tasks, bucket.id)}
                actions={actions}
                onOpenTask={setSelectedTask}
              />
            );
          }
          return (
            <TaskBoardColumn
              key={bucket.id}
              bucket={bucket}
              tasks={visibleTasks}
              hiddenCount={limit ? Math.max(tasks.length - limit, 0) : 0}
              actions={actions}
              compact={compact}
              onOpenTask={setSelectedTask}
            />
          );
        })}
      </div>
      <TaskDetailDialog task={selectedTask} actions={actions} onClose={() => setSelectedTask(null)} />
    </DndContext>
  );
}

const taskSectionStyles: Record<TaskBucket, {
  iconBg: string;
  iconColor: string;
  countBg: string;
  countColor: string;
  barColor: string;
  subtitle: (active: number) => string;
  footerLabel: (active: number) => string;
}> = {
  diario: {
    iconBg: "#e6eefc",
    iconColor: "#2f5fac",
    countBg: "#e6eefc",
    countColor: "#2f5fac",
    barColor: "linear-gradient(180deg, #5B8DEF, #2f5fac)",
    subtitle: (active) => `Hoy · ${active} ${active === 1 ? "pendiente" : "pendientes"}`,
    footerLabel: () => "Progreso diario",
  },
  urgente: {
    iconBg: "#fdf1dd",
    iconColor: "#b4791f",
    countBg: "#fdf1dd",
    countColor: "#b4791f",
    barColor: "linear-gradient(180deg, #F06A37, #E15D2D)",
    subtitle: () => "Tareas por resolver",
    footerLabel: (active) => `${active} ${active === 1 ? "pendiente" : "pendientes"}`,
  },
  semanal: {
    iconBg: "#e7f5ee",
    iconColor: "#1f7a4d",
    countBg: "#e7f5ee",
    countColor: "#1f7a4d",
    barColor: "linear-gradient(180deg, #4C9A6E, #1f7a4d)",
    subtitle: () => "Plan de la semana",
    footerLabel: () => "Progreso semanal",
  },
};

function recentCompletedTasksForBucket(tasks: Task[], bucket: TaskBucket) {
  const cutoff = Date.now() - 7 * 86400000;
  return tasks
    .filter((task) => task.status === "completada" && toTaskBucket(task.category) === bucket)
    .filter((task) => {
      const stamp = new Date(task.completed_at || task.created_at).getTime();
      return Number.isFinite(stamp) && stamp >= cutoff;
    })
    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
    .slice(0, 5);
}

function TaskSectionCard({
  bucket,
  tasks,
  completedTasks,
  actions,
  onOpenTask,
}: {
  bucket: (typeof taskBuckets)[number];
  tasks: Task[];
  completedTasks: Task[];
  actions: ReturnTypeActions;
  onOpenTask: (task: Task) => void;
}) {
  const style = taskSectionStyles[bucket.id];
  const Icon = bucket.Icon;
  const [addOpen, setAddOpen] = useState(false);
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: bucket.id });
  const total = tasks.length + completedTasks.length;
  const progressPct = total ? Math.round((completedTasks.length / total) * 100) : 0;

  return (
    <section ref={setDropRef} className={cn("al-tasks-card transition-shadow", isOver && "ring-2 ring-inset ring-primary/40")}>
      <div className="al-tasks-card-head">
        <span className="al-tasks-card-icon" style={{ background: style.iconColor }}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="al-tasks-card-title-row">
            <h3 className="al-tasks-card-title truncate">{bucket.title}</h3>
            <span className="al-tasks-card-count" style={{ background: style.countBg, color: style.countColor }}>{tasks.length}</span>
          </div>
          <p className="al-tasks-card-subtitle">{style.subtitle(tasks.length)}</p>
        </div>
        <button
          type="button"
          className="al-tasks-card-add"
          style={{ background: style.iconColor }}
          onClick={() => setAddOpen(true)}
          aria-label={`Añadir tarea a ${bucket.title}`}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {addOpen && (
        <div className="border-t border-[#f0ece2] px-3 py-3">
          <QuickTaskForm bucket={bucket.id} actions={actions} open={addOpen} onOpenChange={setAddOpen} />
        </div>
      )}

      <div>
        {tasks.map((task) => (
          <TaskItemRow key={task.id} task={task} actions={actions} onOpen={() => onOpenTask(task)} />
        ))}
        {tasks.length === 0 && !addOpen && (
          <div className="al-tasks-empty">
            <span className="al-tasks-empty-icon" style={{ background: style.iconBg }}>
              <Icon className="h-6 w-6" style={{ color: style.iconColor }} />
            </span>
            <p className="al-tasks-empty-title">No hay tareas en {bucket.title.toLowerCase()}</p>
            <p className="al-tasks-empty-desc">Añade una nueva tarea y empieza a avanzar.</p>
          </div>
        )}
      </div>

      <div className="al-tasks-card-footer">
        <span className="al-tasks-card-footer-label">{style.footerLabel(tasks.length)}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {completedTasks.length ? `${completedTasks.length} de ${total} completadas` : "0 completadas"}
          </span>
          <div className="al-tasks-progress-track">
            <div className="al-tasks-progress-fill" style={{ width: `${progressPct}%`, background: style.barColor }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function TaskItemRow({
  task,
  actions,
  onOpen,
}: {
  task: Task;
  actions: ReturnTypeActions;
  onOpen: () => void;
}) {
  const priority = getTaskPriority(task);
  const completed = task.status === "completada";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: task.id, data: { bucket: task.category } });

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [menuOpen]);

  const dragStyle = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  function toggleCompleted(e: React.MouseEvent) {
    e.stopPropagation();
    if (completed) actions.updateTask(task.id, { status: "pendiente", completed_at: "" });
    else actions.updateTask(task.id, { status: "completada", completed_at: nowIso() });
  }

  return (
    <article
      ref={setDragRef}
      style={{ ...dragStyle, touchAction: "manipulation" }}
      className={cn("al-tasks-row relative select-none", isDragging && "z-50 opacity-60 shadow-lg")}
      {...listeners}
    >
      <button
        type="button"
        className={cn("al-tasks-checkbox", completed && "al-tasks-checkbox-done")}
        onClick={toggleCompleted}
        aria-label={completed ? "Marcar como pendiente" : "Completar tarea"}
      >
        {completed && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </button>

      <button type="button" className="min-w-0 flex-1 cursor-pointer text-left" onClick={onOpen}>
        <p className={cn("al-tasks-row-title break-words", completed && "al-tasks-row-title-done")}>{task.title}</p>
        {!completed && (task.due_at || task.reminder_at || task.status === "en_progreso" || task.status === "pospuesta") && (
          <p className="al-tasks-row-meta flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            {task.due_at && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatShortDateTime(task.due_at)}
              </span>
            )}
            {task.status === "en_progreso" && <span className="font-medium text-amber-600">· En curso</span>}
            {task.status === "pospuesta" && <span>· Pospuesta</span>}
            {task.reminder_at && (
              <span className="inline-flex items-center gap-1">
                · <AlarmClock className="h-3 w-3" />
                {formatShortDateTime(task.reminder_at)}
              </span>
            )}
          </p>
        )}
        {completed && <p className="al-tasks-row-meta">Completada</p>}
      </button>

      {completed ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-4 w-4 text-emerald-600" />
        </span>
      ) : (
        <TaskPriorityBadge priority={priority} />
      )}

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
          aria-label="Opciones de tarea"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-10 z-50 min-w-[150px] rounded-md border bg-background py-1 shadow-md">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Mover a</div>
            {taskBuckets.map((b) => (
              <button
                key={b.id}
                type="button"
                className={cn("flex w-full cursor-pointer items-center px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted", toTaskBucket(task.category) === b.id && "font-semibold")}
                onClick={(e) => { e.stopPropagation(); actions.updateTask(task.id, { category: b.id }); setMenuOpen(false); }}
              >
                {b.title}
              </button>
            ))}
            <div className="my-1 border-t" />
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prioridad</div>
            {taskPriorities.map((p) => (
              <button
                key={p}
                type="button"
                className={cn("flex w-full cursor-pointer items-center px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted", priority === p && "font-semibold")}
                onClick={(e) => { e.stopPropagation(); actions.updateTask(task.id, { priority: p }); setMenuOpen(false); }}
              >
                {priorityLabel(p)}
              </button>
            ))}
            <div className="my-1 border-t" />
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs text-destructive transition-colors hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); actions.deleteTask(task.id); setMenuOpen(false); }}
            >
              <Trash2 className="h-3 w-3" />
              Eliminar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge className={cn("shrink-0", priorityClass(priority))}>{priorityLabel(priority)}</Badge>;
}

function TaskBoardColumn({
  bucket,
  tasks,
  hiddenCount,
  actions,
  compact,
  onOpenTask,
}: {
  bucket: (typeof taskBuckets)[number];
  tasks: Task[];
  hiddenCount: number;
  actions: ReturnTypeActions;
  compact?: boolean;
  onOpenTask: (task: Task) => void;
}) {
  const Icon = bucket.Icon;
  const [addOpen, setAddOpen] = useState(false);
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: bucket.id });

  return (
    <section ref={setDropRef} className={cn("flex min-w-0 flex-col overflow-hidden rounded-lg border bg-muted/30 shadow-sm transition-colors", compact ? "min-w-0" : "min-h-[430px]", isOver && "ring-2 ring-inset ring-primary/40 bg-muted/60")}>
      <div className={cn("bg-gradient-to-br text-white", bucket.tone, compact ? "px-3 py-2.5" : "p-4")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
            <h3 className={cn("truncate font-semibold", compact ? "text-base" : "text-xl")}>{bucket.title}</h3>
            <Badge className={cn("shrink-0 border-white/25 bg-white/15 text-white", compact ? "px-1.5 py-0 text-[10px]" : "")}>{tasks.length + hiddenCount}</Badge>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/35 active:bg-white/40"
            onClick={() => setAddOpen(true)}
            aria-label={`Añadir tarea a ${bucket.title}`}
            title="Añadir tarea"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {!compact && <p className="mt-2 max-w-xs text-sm text-white/85">{bucket.description}</p>}
      </div>
      <div className={cn("flex flex-1 flex-col gap-2 overflow-y-auto", compact ? "max-h-[420px] p-2" : "p-3")}>
        {addOpen && <QuickTaskForm bucket={bucket.id} actions={actions} compact={compact} open={addOpen} onOpenChange={setAddOpen} />}
        {tasks.length ? tasks.map((task) => (
          <TaskBoardCard key={task.id} task={task} actions={actions} compact={compact} onOpen={() => onOpenTask(task)} />
        )) : <EmptyText>No hay tareas en {bucket.title.toLowerCase()}.</EmptyText>}
        {hiddenCount > 0 && (
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/tasks">Ver {hiddenCount} mas</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function QuickTaskForm({
  bucket,
  actions,
  compact,
  open: externalOpen,
  onOpenChange,
}: {
  bucket: TaskBucket;
  actions: ReturnTypeActions;
  compact?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? externalOpen : internalOpen;
  const [dueAt, setDueAt] = useState(bucket === "semanal" ? addDaysKeepingTime(toDatetimeLocalValue(new Date()), 3) : toDatetimeLocalValue(new Date()));

  function setOpen(v: boolean) {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  }

  function submit(form: FormData) {
    const title = val(form, "title");
    if (!title) return;
    const priority = normalizeTaskPriority(val(form, "priority") || (bucket === "urgente" ? "alta" : "media"));
    actions.addTask({
      title,
      description: val(form, "description"),
      due_at: compact ? "" : val(form, "due_at"),
      reminder_at: compact ? "" : val(form, "reminder_at"),
      status: "pendiente",
      priority,
      category: bucket,
    }).catch(() => {});
    setOpen(false);
    setDueAt(bucket === "semanal" ? addDaysKeepingTime(toDatetimeLocalValue(new Date()), 3) : toDatetimeLocalValue(new Date()));
  }

  if (!open) {
    if (isControlled) return null;
    return (
      <Button type="button" variant="ghost" size="sm" className="mt-auto w-full justify-start border border-dashed bg-background/55 text-muted-foreground hover:bg-background" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Añadir tarea
      </Button>
    );
  }

  if (compact) {
    return (
      <FieldForm action={submit}>
        <div className="rounded-md border bg-background p-2 shadow-sm">
          <div className="space-y-2">
            <Input name="title" placeholder="Nueva tarea" required autoFocus />
            <Select name="priority" defaultValue={bucket === "urgente" ? "alta" : "media"} className="h-8 text-xs">
              {taskPriorities.map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}
            </Select>
            <div className="flex gap-2">
              <Button type="submit" size="sm">Crear</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      </FieldForm>
    );
  }

  return (
    <FieldForm action={submit}>
      <div className="al-tasks-form space-y-2">
        <Input name="title" placeholder="Titulo de la tarea" required autoFocus />
        <Textarea name="description" placeholder="Descripcion breve" rows={3} />
        <Select name="priority" defaultValue={bucket === "urgente" ? "alta" : "media"} className="h-8 text-xs">
          {taskPriorities.map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}
        </Select>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input name="due_at" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          <Input name="reminder_at" type="datetime-local" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="al-tasks-form-btn-primary">Crear</button>
          <button type="button" className="al-tasks-form-btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
        </div>
      </div>
    </FieldForm>
  );
}

function TaskBoardCard({ task, actions, compact, onOpen }: { task: Task; actions: ReturnTypeActions; compact?: boolean; onOpen: () => void }) {
  const priority = getTaskPriority(task);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const { listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: task.id, data: { bucket: task.category } });

  useEffect(() => {
    if (!showMoveMenu) return;
    function handle(e: PointerEvent) {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) setShowMoveMenu(false);
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [showMoveMenu]);

  const dragStyle = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <article
      ref={setDragRef}
      style={{ ...dragStyle, touchAction: "manipulation" }}
      className={cn("group relative overflow-hidden rounded-md border bg-card shadow-sm transition-colors hover:border-foreground/20 cursor-grab active:cursor-grabbing select-none", isDragging && "opacity-50 shadow-lg z-50")}
      {...listeners}
    >
      <button type="button" className={cn("block w-full cursor-pointer text-left", compact ? "p-2.5 pr-20" : "p-3 pr-24")} onClick={onOpen}>
        <span className={cn("absolute left-0 top-0 h-full w-1", priorityBarClass(priority))} />
        <div className="flex items-start justify-between gap-3 pl-1">
          <div className="min-w-0 flex-1">
            <h4 className={cn("font-medium leading-snug break-words", compact ? "text-sm line-clamp-2" : "text-base", task.status === "completada" && "line-through text-muted-foreground")}>{task.title}</h4>
            {task.description && !compact && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>}
          </div>
          <Badge className={cn("shrink-0", compact && "px-1.5 text-[10px]", priorityClass(priority))}>{priorityLabel(priority)}</Badge>
        </div>
        {!compact && (
          <div className="mt-3 flex flex-wrap gap-1.5 pl-1">
            {task.due_at && <Badge className="gap-1"><Clock className="h-3 w-3" />{formatShortDateTime(task.due_at)}</Badge>}
            {task.reminder_at && <Badge className="gap-1"><AlarmClock className="h-3 w-3" />{formatShortDateTime(task.reminder_at)}</Badge>}
          </div>
        )}
      </button>

      <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5">
        <div ref={moveMenuRef} className="relative">
          <button
            type="button"
            className={cn("flex cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", compact ? "h-6 w-6" : "h-7 w-7")}
            onClick={(e) => { e.stopPropagation(); setShowMoveMenu((o) => !o); }}
            aria-label="Mover tarea"
            title="Opciones"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          {showMoveMenu && (
            <div className="absolute right-0 top-7 z-50 min-w-[130px] rounded-md border bg-background shadow-md">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Mover a</div>
              {taskBuckets.map((bucket) => (
                <button
                  key={bucket.id}
                  type="button"
                  className={cn("flex w-full cursor-pointer items-center px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted", toTaskBucket(task.category) === bucket.id && "font-semibold")}
                  onClick={(e) => { e.stopPropagation(); actions.updateTask(task.id, { category: bucket.id }); setShowMoveMenu(false); }}
                >
                  {bucket.title}
                </button>
              ))}
              {!compact && (
                <>
                  <div className="my-1 border-t" />
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prioridad</div>
                  {taskPriorities.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={cn("flex w-full cursor-pointer items-center px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted", priority === p && "font-semibold")}
                      onClick={(e) => { e.stopPropagation(); actions.updateTask(task.id, { priority: p }); setShowMoveMenu(false); }}
                    >
                      {priorityLabel(p)}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className={cn("flex cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-emerald-500", compact ? "h-6 w-6" : "h-7 w-7")}
          onClick={(e) => { e.stopPropagation(); actions.updateTask(task.id, { status: "completada", completed_at: nowIso() }); }}
          aria-label="Marcar como hecho"
          title="Marcar como hecho"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={cn("flex cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive", compact ? "h-6 w-6" : "h-7 w-7")}
          onClick={(e) => { e.stopPropagation(); actions.deleteTask(task.id); }}
          aria-label="Eliminar tarea"
          title="Eliminar tarea"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function TaskDetailDialog({ task, actions, onClose }: { task: Task | null; actions: ReturnTypeActions; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bucket, setBucket] = useState<TaskBucket>("diario");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [dueAt, setDueAt] = useState("");
  const [reminderAt, setReminderAt] = useState("");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || "");
    setBucket(toTaskBucket(task.category));
    setPriority(getTaskPriority(task));
    setDueAt(task.due_at || "");
    setReminderAt(task.reminder_at || "");
  }, [task]);

  useEffect(() => {
    if (!task) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [task]);

  if (!task) return null;
  const currentTask = task;

  function save() {
    if (!title.trim()) return;
    actions.updateTask(currentTask.id, { title: title.trim(), description, category: bucket, priority, due_at: dueAt, reminder_at: reminderAt });
    onClose();
  }

  return (
    <div className="al-tasks-detail-overlay" role="dialog" aria-modal="true">
      <style>{tasksBrandCss}</style>
      <div className="al-tasks-detail-shell">
        <div className="al-tasks-detail-head">
          <h2 className="al-tasks-detail-title truncate">Detalle de tarea</h2>
          <button type="button" className="al-tasks-detail-close" onClick={onClose} aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>
        <div className="al-tasks-detail-body">
          <div className="al-tasks-detail-main">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titulo" />
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descripcion" rows={7} />
          </div>
          <aside className="al-tasks-detail-aside">
            <Select value={bucket} onChange={(event) => setBucket(event.target.value as TaskBucket)}>
              {taskBuckets.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </Select>
            <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              {taskPriorities.map((item) => <option key={item} value={item}>{priorityLabel(item)}</option>)}
            </Select>
            <Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            <Input type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} />
            <button type="button" className="al-tasks-detail-btn-primary" onClick={save}>Guardar</button>
            <button type="button" className="al-tasks-detail-btn-outline" onClick={() => { actions.updateTask(currentTask.id, { status: "completada", completed_at: nowIso() }); onClose(); }}>Marcar hecho</button>
            <button type="button" className="al-tasks-detail-btn-danger" onClick={() => { actions.deleteTask(currentTask.id); onClose(); }}>Eliminar</button>
          </aside>
        </div>
      </div>
    </div>
  );
}

const workBrandCss = `
  .al-work-tabs { display: inline-flex; align-items: center; gap: 2px; background: #f5f2ea; border-radius: 10px; padding: 3px; }
  .al-work-tab { border: none; background: transparent; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 700; color: #6b6f72; cursor: pointer; transition: background .15s, color .15s; }
  .al-work-tab-active { background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; box-shadow: 0 6px 16px rgba(225, 93, 45, 0.25); }

  .al-work-section-title { font-size: 13px; font-weight: 700; color: #333029; margin-bottom: 2px; }

  .al-work-portal-grid { display: grid; gap: 10px; align-items: start; }
  .al-work-portal-card { border: 1px solid #ece7dc; border-radius: 14px; background: white; padding: 10px; box-shadow: 0 8px 20px rgba(17, 17, 17, 0.04); transition: border-color .15s, box-shadow .15s; }
  .al-work-portal-card-expanded { border-color: rgba(225, 93, 45, 0.35); box-shadow: 0 10px 24px rgba(225, 93, 45, 0.1); }
  .al-work-portal-head { display: flex; width: 100%; align-items: center; gap: 10px; text-align: left; border: none; background: transparent; cursor: pointer; padding: 0; }
  .al-work-portal-mark { display: flex; height: 32px; width: 32px; flex-shrink: 0; align-items: center; justify-content: center; overflow: hidden; border-radius: 10px; border: 1px solid #ece7dc; background: white; }
  .al-work-portal-title { font-size: 13.5px; font-weight: 700; color: #111111; }
  .al-work-portal-sub { font-size: 11px; color: #9a958a; }
  .al-work-portal-expand { margin-top: 10px; display: grid; gap: 8px; }
  .al-work-portal-field { display: grid; gap: 3px; }
  .al-work-portal-field-label { font-size: 10px; font-weight: 700; color: #9a958a; text-transform: uppercase; letter-spacing: .03em; }
  .al-work-portal-search-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; height: 34px; padding: 0 14px; border-radius: 10px; border: none; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; text-decoration: none; }

  .al-work-portal-link-grid { display: grid; gap: 8px; }
  .al-work-portal-link-card { display: flex; align-items: center; gap: 8px; border: 1px solid #ece7dc; border-radius: 12px; background: white; padding: 8px 10px; text-decoration: none; transition: border-color .15s, box-shadow .15s; }
  .al-work-portal-link-card:hover { border-color: rgba(225, 93, 45, 0.35); box-shadow: 0 8px 18px rgba(17, 17, 17, 0.05); }
  .al-work-portal-link-title { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: #333029; }
  .al-work-portal-link-icon { color: #9a958a; flex-shrink: 0; }

  .al-work-companies-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .al-work-company-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .al-work-company-card { position: relative; border: 1px solid #ece7dc; border-radius: 16px; background: white; padding: 16px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); display: flex; flex-direction: column; gap: 8px; }
  .al-work-company-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .al-work-company-name { font-size: 14.5px; font-weight: 700; color: #111111; line-height: 1.3; }
  .al-work-company-category { font-size: 11.5px; color: #6b6f72; line-height: 1.4; margin-top: 2px; }
  .al-work-company-note { font-size: 11px; color: #9a958a; }
  .al-work-company-hint { font-size: 11px; color: #9a958a; line-height: 1.4; }
  .al-work-company-fav { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 999px; border: 1px solid #ece7dc; background: white; color: #c9c3b6; cursor: pointer; flex-shrink: 0; transition: color .15s, border-color .15s, background .15s; }
  .al-work-company-fav-active { color: #E15D2D; border-color: rgba(225, 93, 45, 0.35); background: #fbe7dd; }
  .al-work-company-actions { display: flex; gap: 8px; margin-top: auto; padding-top: 6px; }
  .al-work-company-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 34px; border-radius: 10px; font-size: 12px; font-weight: 700; text-decoration: none; cursor: pointer; }
  .al-work-company-btn-solid { border: none; color: white; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); }

  .al-work-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 16px; text-align: center; border: 1px dashed #e4dfd5; border-radius: 16px; background: white; }
  .al-work-empty-title { font-size: 14px; font-weight: 700; color: #333029; }
  .al-work-empty-desc { font-size: 12px; color: #9a958a; max-width: 360px; }
`;

const QuickJobSearchCard = memo(function QuickJobSearchCard({ platform, expanded, onToggle }: { platform: JobPlatform; expanded: boolean; onToggle: (p: JobPlatform) => void }) {
  const [query, setQuery] = useState("programador java");
  const [scope, setScope] = useState<"Granada" | "Teletrabajo">("Granada");
  const url = useMemo(() => buildJobSearchUrl(platform, query, scope), [platform, query, scope]);

  return (
    <div className={cn("al-work-portal-card", expanded && "al-work-portal-card-expanded")}>
      <button type="button" className="al-work-portal-head" onClick={() => onToggle(platform)}>
        <PortalMark platform={platform} />
        <div className="min-w-0">
          <p className="al-work-portal-title truncate">{platform}</p>
          <p className="al-work-portal-sub truncate">Busqueda rapida</p>
        </div>
      </button>
      {expanded && (
        <div className="al-work-portal-expand">
          <div className="al-work-portal-field">
            <span className="al-work-portal-field-label">Qué buscas</span>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 text-xs" placeholder="programador java" aria-label={`Busqueda en ${platform}`} />
          </div>
          <div className="al-work-portal-field">
            <span className="al-work-portal-field-label">Dónde</span>
            <Select value={scope} onChange={(event) => setScope(event.target.value as "Granada" | "Teletrabajo")} className="h-8 text-xs" aria-label={`Ambito de busqueda en ${platform}`}>
              <option value="Granada">Granada</option>
              <option value="Teletrabajo">Teletrabajo</option>
            </Select>
          </div>
          <a href={url} target="_blank" rel="noreferrer" className="al-work-portal-search-btn">
            Buscar <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
});

const PORTAL_DOMAINS: Record<JobPlatform, string> = {
  LinkedIn: "linkedin.com",
  InfoJobs: "infojobs.net",
  Indeed: "indeed.com",
  Tecnoempleo: "tecnoempleo.com",
  Glassdoor: "glassdoor.com",
  Infoempleo: "infoempleo.com",
  Computrabajo: "computrabajo.es",
  Adzuna: "adzuna.es",
  Monster: "monster.com",
  Jobtome: "jobtome.com",
  Jooble: "jooble.org",
  Randstad: "randstad.es",
  Manpower: "manpower.es",
  Adecco: "adecco.es",
  Wellfound: "wellfound.com",
  Remotive: "remotive.com",
  "We Work Remotely": "weworkremotely.com",
  JobToday: "jobtoday.com",
  "Talent.com": "talent.com",
  "Welcome to the Jungle": "welcometothejungle.com",
};

const PORTAL_COLORS: Partial<Record<JobPlatform, string>> = {
  LinkedIn: "bg-[#0A66C2] text-white",
  InfoJobs: "bg-[#167DB7] text-white",
  Tecnoempleo: "bg-[#F97316] text-white",
  Indeed: "bg-[#2557A7] text-white",
  Glassdoor: "bg-[#0CAA41] text-white",
  Infoempleo: "bg-[#CC1515] text-white",
  Computrabajo: "bg-[#FF5A00] text-white",
  Adzuna: "bg-[#E74C3C] text-white",
  Monster: "bg-[#6D29D9] text-white",
  Jobtome: "bg-[#2F80ED] text-white",
  Jooble: "bg-[#1AAB9B] text-white",
  Randstad: "bg-[#2B6CB0] text-white",
  Manpower: "bg-[#E31837] text-white",
  Adecco: "bg-[#E4002B] text-white",
  Wellfound: "bg-[#1A1A1A] text-white",
  Remotive: "bg-[#10B981] text-white",
  "We Work Remotely": "bg-[#1B9F4B] text-white",
  JobToday: "bg-[#3B82F6] text-white",
  "Talent.com": "bg-[#8B5CF6] text-white",
  "Welcome to the Jungle": "bg-[#FFCD00] text-black",
};

function PortalMark({ platform }: { platform: JobPlatform }) {
  const [failed, setFailed] = useState(false);
  const domain = PORTAL_DOMAINS[platform];
  const src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  if (!failed) {
    return (
      <span className="al-work-portal-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={platform}
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={cn("al-work-portal-mark text-xs font-semibold", PORTAL_COLORS[platform] ?? "bg-muted text-foreground")}>
      {platform.slice(0, 2)}
    </span>
  );
}

// Only these platforms filter reliably through URL query params. The rest
// link straight to their homepage so the user can search there directly.
const WORKING_JOB_PLATFORMS: JobPlatform[] = ["LinkedIn", "InfoJobs", "Indeed", "Tecnoempleo", "Jooble"];
const OTHER_JOB_PLATFORMS: JobPlatform[] = jobPlatforms.filter((platform) => !WORKING_JOB_PLATFORMS.includes(platform));

const PortalLinkCard = memo(function PortalLinkCard({ platform }: { platform: JobPlatform }) {
  return (
    <a
      href={`https://www.${PORTAL_DOMAINS[platform]}`}
      target="_blank"
      rel="noreferrer"
      className="al-work-portal-link-card"
    >
      <PortalMark platform={platform} />
      <span className="al-work-portal-link-title truncate">{platform}</span>
      <ExternalLink className="al-work-portal-link-icon h-3.5 w-3.5" />
    </a>
  );
});

// Applications remain outside the MVP intentionally. The job_applications
// table and collection pipeline already work, but the UI stays hidden until
// product scope brings it back. Re-add the row to reactivate it.
const WORK_TABS: ["portals" | "companies" | "candidaturas", string][] = [
  ["portals", "Portales"],
  ["companies", "Empresas"],
];

function Work({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const [tab, setTab] = useState<"portals" | "companies" | "candidaturas">("portals");
  const [expandedPortal, setExpandedPortal] = useState<JobPlatform | null>(null);
  const [companySearch, setCompanySearch] = useState("");

  // Candidaturas state
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appLoaded, setAppLoaded] = useState(false);
  const [appSyncing, setAppSyncing] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState("");
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ company_name: "", company_url: "", job_title: "", job_url: "" });

  const handleToggleWork = useCallback((p: JobPlatform) => setExpandedPortal((v) => v === p ? null : p), []);

  const filteredCompanies = useMemo(() => store.companies.filter((company) => {
    const haystack = `${company.nombre} ${company.categoria ?? ""}`.toLowerCase();
    return !companySearch || haystack.includes(companySearch.toLowerCase());
  }), [store.companies, companySearch]);

  const fetchApplications = useCallback(async () => {
    const res = await fetch("/api/job-radar");
    if (!res.ok) return;
    const d = await res.json();
    setApplications(d.applications ?? []);
    setAppLoaded(true);
  }, []);

  const syncRadar = useCallback(async () => {
    setAppSyncing(true);
    try {
      await fetch("/api/job-radar/sync", { method: "POST" });
      await fetchApplications();
      toast.success("Candidaturas actualizadas");
    } catch {
      toast.error("Error al sincronizar candidaturas");
    } finally {
      setAppSyncing(false);
    }
  }, [fetchApplications]);

  const updateAppStatus = useCallback(async (id: string, status: ApplicationStatus) => {
    await fetch(`/api/job-radar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status, is_new: false } : a));
  }, []);

  const submitNote = useCallback(async (id: string) => {
    const text = noteInput[id]?.trim();
    if (!text) return;
    await fetch(`/api/job-radar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: text }),
    });
    const created_at = new Date().toISOString();
    setApplications((prev) => prev.map((a) => a.id === id ? { ...a, notes: [...(a.notes ?? []), { text, created_at }] } : a));
    setNoteInput((prev) => ({ ...prev, [id]: "" }));
  }, [noteInput]);

  const removeApplication = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/job-radar/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setApplications((prev) => prev.filter((a) => a.id !== id));
      toast.success("Candidatura eliminada");
    } catch {
      toast.error("Error al eliminar la candidatura");
    }
  }, []);

  const submitManual = useCallback(async () => {
    const { company_name, company_url, job_title, job_url } = manualForm;
    if (!company_name.trim() || !company_url.trim() || !job_title.trim()) return;
    try {
      const res = await fetch("/api/job-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name, company_url, job_title, job_url }),
      });
      if (!res.ok) throw new Error("Error al añadir");
      const d = await res.json();
      setApplications((prev) => [d.application, ...prev]);
      setManualForm({ company_name: "", company_url: "", job_title: "", job_url: "" });
      setShowManualForm(false);
      toast.success("Candidatura añadida");
    } catch {
      toast.error("Error al añadir la candidatura");
    }
  }, [manualForm]);

  useEffect(() => {
    if (tab === "candidaturas" && !appLoaded) {
      fetchApplications();
    }
  }, [tab, appLoaded, fetchApplications]);

  const filteredApplications = useMemo(
    () => applications.filter((a) => !appStatusFilter || a.status === appStatusFilter),
    [applications, appStatusFilter],
  );

  return (
    <>
      <style>{workBrandCss}</style>
      <div className="al-work-tabs">
        {WORK_TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn("al-work-tab", tab === id && "al-work-tab-active")}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "portals" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div>
              <p className="al-work-section-title">Búsqueda rápida</p>
              <p className="text-sm text-muted-foreground">
                Estos portales funcionan bien con nuestro buscador. Haz clic, escribe tu puesto y elige Granada o teletrabajo para abrir la búsqueda ya filtrada.
              </p>
            </div>
            <div className="al-work-portal-grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {WORKING_JOB_PLATFORMS.map((platform) => (
                <QuickJobSearchCard
                  key={platform}
                  platform={platform}
                  expanded={expandedPortal === platform}
                  onToggle={handleToggleWork}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="al-work-section-title">Otros portales</p>
              <p className="text-sm text-muted-foreground">
                Estos no filtran bien desde aquí, así que te llevan directos a su web para que busques allí.
              </p>
            </div>
            <div className="al-work-portal-link-grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {OTHER_JOB_PLATFORMS.map((platform) => (
                <PortalLinkCard key={platform} platform={platform} />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "companies" && (
        <div className="space-y-4">
          <div className="al-work-companies-toolbar">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Buscar empresa o categoria" />
            </div>
            {store.companies.length > 0 && (
              <span className="text-xs text-muted-foreground">{filteredCompanies.length} empresas</span>
            )}
          </div>

          {!store.companies.length ? (
            <div className="al-work-empty">
              <Building2 className="h-8 w-8 text-muted-foreground/40" />
              <p className="al-work-empty-title">Próximamente para tu ciclo</p>
              <p className="al-work-empty-desc">Todavía no tenemos empresas identificadas para tu familia profesional. Iremos añadiéndolas.</p>
            </div>
          ) : !filteredCompanies.length ? (
            <EmptyText>No hay empresas con esa búsqueda.</EmptyText>
          ) : (
            <div className="al-work-company-grid">
              {filteredCompanies.map((company) => (
                <CompanyCard key={company.id} company={company} onToggleFavorite={() => actions.toggleCompanyFavorite(company.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "candidaturas" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAppStatusFilter("")}
                className={cn("rounded-full border px-3 py-1 text-xs transition-colors", !appStatusFilter ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              >
                Todas
              </button>
              {APPLICATION_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAppStatusFilter((v) => v === s ? "" : s)}
                  className={cn("rounded-full border px-3 py-1 text-xs transition-colors", appStatusFilter === s ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={syncRadar}
                disabled={appSyncing}
                className="h-8 gap-1.5 text-xs"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", appSyncing && "animate-spin")} />
                {appSyncing ? "Escaneando..." : "Sincronizar radar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowManualForm((v) => !v)}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Añadir manual
              </Button>
            </div>
          </div>

          {showManualForm && (
            <Card className="p-4">
              <div className="space-y-3">
                <p className="text-sm font-medium">Añadir candidatura manual</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Empresa *"
                    value={manualForm.company_name}
                    onChange={(e) => setManualForm((f) => ({ ...f, company_name: e.target.value }))}
                  />
                  <Input
                    type="url"
                    inputMode="url"
                    placeholder="URL pagina empleo *"
                    value={manualForm.company_url}
                    onChange={(e) => setManualForm((f) => ({ ...f, company_url: e.target.value }))}
                  />
                  <Input
                    placeholder="Puesto *"
                    value={manualForm.job_title}
                    onChange={(e) => setManualForm((f) => ({ ...f, job_title: e.target.value }))}
                  />
                  <Input
                    type="url"
                    inputMode="url"
                    placeholder="URL oferta (opcional)"
                    value={manualForm.job_url}
                    onChange={(e) => setManualForm((f) => ({ ...f, job_url: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={submitManual}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowManualForm(false)}>Cancelar</Button>
                </div>
              </div>
            </Card>
          )}

          {!appLoaded ? (
            <p className="text-sm text-muted-foreground">Cargando candidaturas...</p>
          ) : filteredApplications.length === 0 ? (
            <EmptyText>
              {appStatusFilter ? "Sin candidaturas con ese estado." : "Sin candidaturas. Sincroniza el radar o añade una manual."}
            </EmptyText>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{filteredApplications.length} candidatura{filteredApplications.length !== 1 ? "s" : ""}</p>
              {filteredApplications.map((app) => (
                <CandidaturaCard
                  key={app.id}
                  app={app}
                  noteValue={noteInput[app.id] ?? ""}
                  onNoteChange={(v) => setNoteInput((prev) => ({ ...prev, [app.id]: v }))}
                  onNoteSubmit={() => submitNote(app.id)}
                  onStatusChange={updateAppStatus}
                  onDelete={removeApplication}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

const CandidaturaCard = memo(function CandidaturaCard({
  app,
  noteValue,
  onNoteChange,
  onNoteSubmit,
  onStatusChange,
  onDelete,
}: {
  app: JobApplication;
  noteValue: string;
  onNoteChange: (v: string) => void;
  onNoteSubmit: () => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-2", app.is_new && "border-blue-400/50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{app.company_name}</p>
          <p className="truncate text-xs text-muted-foreground">{app.job_title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {app.is_new && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[app.status])}>
            {STATUS_LABELS[app.status]}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-muted-foreground">
          {new Date(app.detected_at).toLocaleDateString("es-ES")}
          {app.source === "manual" && " · Manual"}
        </span>
        {app.job_url && (
          <a
            href={app.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Ver oferta
          </a>
        )}
        <a
          href={app.company_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Pagina empleo
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <Select
          value={app.status}
          onChange={(e) => onStatusChange(app.id, e.target.value as ApplicationStatus)}
          className="h-7 text-xs"
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setShowNotes((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {app.notes?.length ? `${app.notes.length} nota${app.notes.length !== 1 ? "s" : ""}` : "Añadir nota"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(app.id)}
          className="ml-auto text-xs text-muted-foreground hover:text-destructive"
        >
          Eliminar
        </button>
      </div>

      {showNotes && (
        <div className="space-y-1.5 pt-1">
          {app.notes?.map((n, i) => (
            <p key={i} className="text-xs text-muted-foreground">· {n.text}</p>
          ))}
          <div className="flex gap-2">
            <Input
              className="h-7 text-xs"
              placeholder="Escribe una nota..."
              value={noteValue}
              onChange={(e) => onNoteChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onNoteSubmit(); }}
            />
            <Button size="sm" className="h-7 text-xs" onClick={onNoteSubmit}>
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

function Tasks({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  return (
    <div className="space-y-5">
      <style>{tasksBrandCss}</style>
      <p className="-mt-4 text-sm text-muted-foreground">Organiza tu trabajo y mantén el foco.</p>
      <TasksStatRow tasks={store.tasks} />
      <TaskBoard store={store} actions={actions} variant="full" />
      <div className="al-tasks-bottom">
        <TasksActivityPanel tasks={store.tasks} />
        <TasksCompletedPanel tasks={store.tasks} actions={actions} />
        <TasksPerformancePanel tasks={store.tasks} />
      </div>
    </div>
  );
}

function TasksStatRow({ tasks }: { tasks: Task[] }) {
  const doneToday = completedTasksOn(tasks, new Date()).length;
  const pending = activeTasks(tasks).length;
  const doneWeek = completedThisWeek(tasks);
  const streak = taskStreakDays(tasks);

  return (
    <div className="al-tasks-stats">
      <div className="al-tasks-stat-card">
        <span className="al-tasks-stat-icon" style={{ background: "#e7f5ee", color: "#1f7a4d" }}><CheckCircle2 className="h-4.5 w-4.5" /></span>
        <div><p className="al-tasks-stat-value">{doneToday}</p><p className="al-tasks-stat-label">Completadas hoy</p></div>
      </div>
      <div className="al-tasks-stat-card">
        <span className="al-tasks-stat-icon" style={{ background: "#fdf1dd", color: "#b4791f" }}><Clock className="h-4.5 w-4.5" /></span>
        <div><p className="al-tasks-stat-value">{pending}</p><p className="al-tasks-stat-label">Pendientes</p></div>
      </div>
      <div className="al-tasks-stat-card">
        <span className="al-tasks-stat-icon" style={{ background: "#e6eefc", color: "#2f5fac" }}><CalendarDays className="h-4.5 w-4.5" /></span>
        <div><p className="al-tasks-stat-value">{doneWeek}</p><p className="al-tasks-stat-label">Completadas esta semana</p></div>
      </div>
      <div className="al-tasks-stat-card">
        <span className="al-tasks-stat-icon" style={{ background: "#fbe7dd", color: "#E15D2D" }}><Flame className="h-4.5 w-4.5" /></span>
        <div><p className="al-tasks-stat-value">{streak}</p><p className="al-tasks-stat-label">Racha actual (días)</p></div>
      </div>
    </div>
  );
}

function TasksActivityPanel({ tasks }: { tasks: Task[] }) {
  const items = recentTaskActivity(tasks, 6);
  return (
    <div className="al-tasks-panel">
      <div className="al-tasks-panel-head">
        <span className="al-tasks-panel-title"><RefreshCw className="h-4 w-4 text-[#9a958a]" />Actividad reciente</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Todavía no has completado ninguna tarea.</p>
      ) : (
        <div>
          {items.map((task) => (
            <div key={task.id} className="al-tasks-activity-row">
              <span className="al-tasks-activity-dot" />
              <div className="min-w-0">
                <p className="al-tasks-activity-text truncate">Completaste &ldquo;{task.title}&rdquo;</p>
                <p className="al-tasks-activity-time">{formatLongDate(task.completed_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TasksCompletedPanel({ tasks, actions }: { tasks: Task[]; actions: ReturnTypeActions }) {
  const [tab, setTab] = useState<"todas" | "diarias" | "semanales">("todas");
  const completedAll = useMemo(
    () => tasks.filter((task) => task.status === "completada").sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at))),
    [tasks],
  );
  const filtered = useMemo(() => {
    if (tab === "diarias") return completedAll.filter((task) => toTaskBucket(task.category) === "diario");
    if (tab === "semanales") return completedAll.filter((task) => toTaskBucket(task.category) === "semanal");
    return completedAll;
  }, [completedAll, tab]);

  return (
    <div className="al-tasks-panel">
      <div className="al-tasks-panel-head">
        <span className="al-tasks-panel-title"><ListChecks className="h-4 w-4 text-[#9a958a]" />Completadas</span>
        <div className="al-tasks-tabs">
          {([["todas", "Todas"], ["diarias", "Diarias"], ["semanales", "Semanales"]] as const).map(([id, label]) => (
            <button key={id} type="button" className={cn("al-tasks-tab", tab === id && "al-tasks-tab-active")} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay tareas completadas todavía.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto pr-0.5">
          {filtered.slice(0, 20).map((task) => (
            <div key={task.id} className="al-tasks-completed-row">
              <div className="min-w-0">
                <p className="al-tasks-completed-title truncate">{task.title}</p>
                <p className="al-tasks-completed-meta">
                  {toTaskBucket(task.category) === "diario" ? "Diaria" : toTaskBucket(task.category) === "semanal" ? "Semanal" : "Pendiente"} · {formatLongDate(task.completed_at)}
                </p>
              </div>
              <button type="button" className="al-tasks-reopen-btn" onClick={() => actions.updateTask(task.id, { status: "pendiente", completed_at: "" })}>
                Reabrir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TasksPerformancePanel({ tasks }: { tasks: Task[] }) {
  const streak = taskStreakDays(tasks);
  const days = last7DaysActivity(tasks);
  const maxCount = Math.max(1, ...days.map((day) => day.count));
  const rate = todayCompletionRate(tasks);

  return (
    <div className="al-tasks-panel">
      <div className="al-tasks-panel-head">
        <span className="al-tasks-panel-title"><Target className="h-4 w-4 text-[#9a958a]" />Rendimiento</span>
      </div>
      <div className="al-tasks-streak">
        <span className="al-tasks-streak-icon"><Flame className="h-4.5 w-4.5 text-white" /></span>
        <div>
          <p className="al-tasks-streak-value">{streak} {streak === 1 ? "día" : "días"}</p>
          <p className="al-tasks-streak-label">Racha actual</p>
        </div>
      </div>
      <div className="al-tasks-chart">
        {days.map((day) => (
          <div key={day.key} className="al-tasks-chart-col">
            <div className="al-tasks-chart-bar-track">
              <div
                className={cn("al-tasks-chart-bar", day.count > 0 && "al-tasks-chart-bar-active")}
                style={{ height: `${Math.max(6, Math.round((day.count / maxCount) * 100))}%` }}
              />
            </div>
            <span className="al-tasks-chart-label">{day.label}</span>
          </div>
        ))}
      </div>
      <div className="al-tasks-rate">
        <span className="al-tasks-rate-ring" style={{ background: `conic-gradient(#1f7a4d ${rate.pct}%, #f0ece2 0)` }}>
          <span className="al-tasks-rate-ring-inner">{rate.pct}%</span>
        </span>
        <div>
          <p className="al-tasks-rate-title">Tasa de completadas</p>
          <p className="al-tasks-rate-desc">{rate.done} de {rate.total || 0} hoy</p>
        </div>
      </div>
    </div>
  );
}

const tasksBrandCss = `
  .al-tasks-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media (min-width: 780px) { .al-tasks-stats { grid-template-columns: repeat(4, 1fr); } }
  .al-tasks-stat-card { display: flex; align-items: center; gap: 10px; background: white; border: 1px solid #ece7dc; border-radius: 16px; padding: 14px 16px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); }
  .al-tasks-stat-icon { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0; }
  .al-tasks-stat-value { font-size: 20px; font-weight: 800; color: #111111; line-height: 1.1; }
  .al-tasks-stat-label { font-size: 11.5px; color: #6b6f72; margin-top: 1px; }

  .al-tasks-card { background: white; border: 1px solid #ece7dc; border-radius: 18px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); }
  .al-tasks-card-head { border-radius: 18px 18px 0 0; }
  .al-tasks-card-head { display: flex; align-items: center; gap: 12px; padding: 16px; }
  .al-tasks-card-icon { display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 13px; color: white; flex-shrink: 0; }
  .al-tasks-card-title-row { display: flex; align-items: center; gap: 8px; }
  .al-tasks-card-title { font-size: 16px; font-weight: 700; color: #111111; }
  .al-tasks-card-count { border-radius: 999px; padding: 1px 8px; font-size: 11.5px; font-weight: 700; }
  .al-tasks-card-subtitle { font-size: 11.5px; color: #6b6f72; margin-top: 1px; }
  .al-tasks-card-add { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 999px; border: none; cursor: pointer; flex-shrink: 0; color: white; margin-left: auto; }

  .al-tasks-row { display: flex; align-items: center; gap: 10px; padding: 11px 16px; border-top: 1px solid #f0ece2; }
  .al-tasks-checkbox { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 8px; border: 2px solid #e4dfd5; flex-shrink: 0; cursor: pointer; background: white; }
  .al-tasks-checkbox-done { border-color: transparent; background: linear-gradient(180deg, #4C9A6E, #1f7a4d); }
  .al-tasks-row-title { font-size: 13.5px; font-weight: 600; color: #333029; line-height: 1.3; }
  .al-tasks-row-title-done { color: #9a958a; text-decoration: line-through; }
  .al-tasks-row-meta { font-size: 11px; color: #9a958a; margin-top: 2px; }

  .al-tasks-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 26px 16px; text-align: center; }
  .al-tasks-empty-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
  .al-tasks-empty-title { font-size: 13px; font-weight: 700; color: #333029; }
  .al-tasks-empty-desc { font-size: 11.5px; color: #9a958a; }

  .al-tasks-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 16px; border-top: 1px solid #f0ece2; }
  .al-tasks-card-footer-label { font-size: 11px; font-weight: 700; color: #6b6f72; }
  .al-tasks-progress-track { width: 76px; height: 6px; border-radius: 999px; background: #f0ece2; overflow: hidden; }
  .al-tasks-progress-fill { height: 100%; border-radius: 999px; }

  .al-tasks-bottom { display: grid; grid-template-columns: 1fr; gap: 14px; }
  @media (min-width: 1180px) { .al-tasks-bottom { grid-template-columns: 1.15fr 1fr 0.85fr; } }
  .al-tasks-panel { background: white; border: 1px solid #ece7dc; border-radius: 18px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); padding: 16px; }
  .al-tasks-panel-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .al-tasks-panel-title { font-size: 14.5px; font-weight: 700; color: #111111; display: flex; align-items: center; gap: 7px; }

  .al-tasks-activity-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-top: 1px solid #f0ece2; }
  .al-tasks-activity-row:first-child { border-top: none; padding-top: 0; }
  .al-tasks-activity-dot { width: 7px; height: 7px; border-radius: 999px; background: #4C9A6E; margin-top: 5px; flex-shrink: 0; }
  .al-tasks-activity-text { font-size: 12.5px; color: #333029; line-height: 1.4; }
  .al-tasks-activity-time { font-size: 10.5px; color: #9a958a; margin-top: 1px; }

  .al-tasks-tabs { display: inline-flex; align-items: center; gap: 2px; background: #f5f2ea; border-radius: 10px; padding: 2px; }
  .al-tasks-tab { border: none; background: transparent; border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #6b6f72; cursor: pointer; }
  .al-tasks-tab-active { background: white; color: #c94f21; box-shadow: 0 1px 3px rgba(17,17,17,0.08); }

  .al-tasks-completed-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 0; border-top: 1px solid #f0ece2; }
  .al-tasks-completed-row:first-child { border-top: none; padding-top: 0; }
  .al-tasks-completed-title { font-size: 12.5px; font-weight: 600; color: #333029; }
  .al-tasks-completed-meta { font-size: 10.5px; color: #9a958a; margin-top: 1px; }
  .al-tasks-reopen-btn { flex-shrink: 0; font-size: 11px; font-weight: 700; color: #c94f21; background: #fbe7dd; border: none; border-radius: 8px; padding: 5px 10px; cursor: pointer; }

  .al-tasks-streak { display: flex; align-items: center; gap: 10px; padding: 10px; background: #fdf1dd; border-radius: 14px; }
  .al-tasks-streak-icon { width: 34px; height: 34px; border-radius: 10px; background: #f7b955; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .al-tasks-streak-value { font-size: 17px; font-weight: 800; color: #111111; line-height: 1.1; }
  .al-tasks-streak-label { font-size: 10.5px; color: #9a958a; }

  .al-tasks-chart { display: flex; align-items: flex-end; justify-content: space-between; gap: 4px; height: 64px; margin-top: 12px; }
  .al-tasks-chart-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
  .al-tasks-chart-bar-track { width: 100%; height: 48px; display: flex; align-items: flex-end; }
  .al-tasks-chart-bar { width: 100%; border-radius: 4px; background: #f0ece2; }
  .al-tasks-chart-bar-active { background: linear-gradient(180deg, #F06A37, #E15D2D); }
  .al-tasks-chart-label { font-size: 9.5px; font-weight: 700; color: #9a958a; }

  .al-tasks-rate { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
  .al-tasks-rate-ring { width: 54px; height: 54px; border-radius: 999px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .al-tasks-rate-ring-inner { width: 40px; height: 40px; border-radius: 999px; background: white; display: flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 800; color: #1f7a4d; }
  .al-tasks-rate-title { font-size: 11.5px; font-weight: 700; color: #333029; }
  .al-tasks-rate-desc { font-size: 10.5px; color: #9a958a; margin-top: 1px; }

  .al-tasks-form { border: 1px solid #ece7dc; border-radius: 12px; padding: 10px; background: #faf8f4; }
  .al-tasks-form input, .al-tasks-form textarea, .al-tasks-form select { border-color: #ece7dc; font-size: 12.5px; }
  .al-tasks-form input:focus-visible, .al-tasks-form textarea:focus-visible, .al-tasks-form select:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(225, 93, 45, 0.25); border-color: #E15D2D; }
  .al-tasks-form-btn-primary { height: 32px; padding: 0 14px; border-radius: 9px; border: none; background: linear-gradient(180deg, #F06A37, #E15D2D); color: white; font-size: 12px; font-weight: 700; cursor: pointer; }
  .al-tasks-form-btn-ghost { height: 32px; padding: 0 12px; border-radius: 9px; border: none; background: transparent; color: #6b6f72; font-size: 12px; font-weight: 600; cursor: pointer; }
  .al-tasks-form-btn-ghost:hover { background: #f0ece2; }

  .al-tasks-detail-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; background: rgba(17, 17, 17, 0.55); backdrop-filter: blur(2px); padding: 0; }
  @media (min-width: 640px) { .al-tasks-detail-overlay { align-items: center; padding: 24px; } }
  .al-tasks-detail-shell { width: 100%; max-height: 92svh; overflow: hidden; background: white; border-radius: 22px 22px 0 0; box-shadow: 0 24px 60px rgba(17,17,17,0.18); display: flex; flex-direction: column; }
  @media (min-width: 640px) { .al-tasks-detail-shell { border-radius: 22px; max-width: 46rem; } }
  .al-tasks-detail-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid #f0ece2; flex-shrink: 0; }
  .al-tasks-detail-title { font-size: 16px; font-weight: 700; color: #111111; }
  .al-tasks-detail-close { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9px; border: 1px solid #ece7dc; background: white; color: #6b6f72; cursor: pointer; flex-shrink: 0; }
  .al-tasks-detail-body { display: grid; overflow-y: auto; }
  @media (min-width: 768px) { .al-tasks-detail-body { grid-template-columns: 1fr 260px; } }
  .al-tasks-detail-main { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
  .al-tasks-detail-main input, .al-tasks-detail-main textarea { border: 1px solid #ece7dc; border-radius: 10px; }
  .al-tasks-detail-main input:focus-visible, .al-tasks-detail-main textarea:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(225, 93, 45, 0.25); border-color: #E15D2D; }
  .al-tasks-detail-aside { padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; background: #faf8f4; border-top: 1px solid #f0ece2; }
  @media (min-width: 768px) { .al-tasks-detail-aside { border-top: none; border-left: 1px solid #f0ece2; } }
  .al-tasks-detail-aside select, .al-tasks-detail-aside input { border: 1px solid #ece7dc; border-radius: 10px; background: white; }
  .al-tasks-detail-aside select:focus-visible, .al-tasks-detail-aside input:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(225, 93, 45, 0.25); border-color: #E15D2D; }
  .al-tasks-detail-btn-primary { height: 40px; border-radius: 11px; border: none; background: linear-gradient(180deg, #F06A37, #E15D2D); color: white; font-size: 13px; font-weight: 700; cursor: pointer; }
  .al-tasks-detail-btn-outline { height: 40px; border-radius: 11px; border: 1px solid #ece7dc; background: white; color: #333029; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .al-tasks-detail-btn-danger { height: 36px; border-radius: 11px; border: none; background: transparent; color: #c0392b; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .al-tasks-detail-btn-danger:hover { background: rgba(192, 57, 43, 0.08); }
`;



function courseStatusClass(status: string) {
  if (status === "empezado") return "al-course-chip-terracotta";
  if (status === "terminado") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  if (status === "pausado") return "al-course-chip-amber";
  if (status === "descartado") return "border-red-500/30 bg-red-500/10 text-red-700";
  return "";
}

function hackathonStatusClass(status: string) {
  if (status === "inscripcion_abierta") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  if (status === "realizado") return "border-slate-400/30 bg-slate-400/10 text-slate-600";
  if (status === "descartado") return "border-red-500/30 bg-red-500/10 text-red-700";
  if (status === "revisar_futura_edicion") return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  return "";
}

function hackathonStatusLabel(status: string) {
  const m: Record<string, string> = {
    inscripcion_abierta: "Inscripción abierta",
    pendiente: "Pendiente",
    realizado: "Realizado",
    revisar_futura_edicion: "Revisar",
    descartado: "Descartado",
  };
  return m[status] ?? status;
}

function ChipTag({ children, className, icon }: { children: React.ReactNode; className?: string; icon?: "pin" }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium", className)}>
      {icon === "pin" && <MapPin className="h-2.5 w-2.5 shrink-0" />}
      {children}
    </span>
  );
}

function FilterCalendar({
  datesWithItems,
  dayFilter,
  onDaySelect,
}: {
  datesWithItems: Set<string>;
  dayFilter: string;
  onDaySelect: (day: string) => void;
}) {
  const [calMonth, setCalMonth] = useState(startOfMonth(new Date()));
  const cells = buildMonthCells(calMonth);
  const monthLabel = calMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const today = todayKey();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setCalMonth((c) => addMonths(c, -1))} className="rounded p-1 hover:bg-muted">
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="text-xs font-medium capitalize">{monthLabel}</span>
        <button type="button" onClick={() => setCalMonth((c) => addMonths(c, 1))} className="rounded p-1 hover:bg-muted">
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div key={d} className="py-0.5 text-[10px] font-medium text-muted-foreground">{d}</div>
        ))}
        {cells.map((cell) => {
          const key = dateKey(cell.date.toISOString());
          const hasItem = datesWithItems.has(key);
          const isSelected = dayFilter === key;
          const isToday = key === today;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onDaySelect(isSelected ? "" : key)}
              className={cn(
                "relative flex flex-col items-center py-0.5 text-[11px] leading-5 transition-colors",
                !cell.inMonth && "text-muted-foreground/40",
                isSelected && "al-filter-day-selected rounded",
                isToday && !isSelected && "al-filter-day-today font-bold",
                !isSelected && cell.inMonth && "cursor-pointer rounded hover:bg-muted",
              )}
            >
              {cell.date.getDate()}
              {hasItem && !isSelected && (
                <span className="al-filter-dot absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="al-filter-dot inline-block h-1.5 w-1.5 rounded-full" />
        con cursos
      </div>
    </div>
  );
}

function MonthChips({
  monthGroups,
  monthFilter,
  totalCount,
  onSelect,
}: {
  monthGroups: Map<string, number>;
  monthFilter: string;
  totalCount: number;
  onSelect: (month: string) => void;
}) {
  if (monthGroups.size === 0) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">MES</span>
      <button
        type="button"
        onClick={() => onSelect("")}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors hover:bg-muted",
          !monthFilter && "border-transparent bg-[linear-gradient(180deg,#F06A37_0%,#E15D2D_100%)] text-white"
        )}
      >
        TODOS <span className={cn("font-normal", !monthFilter && "text-white/70")}>{totalCount}</span>
      </button>
      {Array.from(monthGroups.entries()).map(([month, count]) => {
        const [y, m] = month.split("-");
        const label = new Date(Number(y), Number(m) - 1)
          .toLocaleDateString("es-ES", { month: "short", year: "2-digit" })
          .toUpperCase();
        const isSelected = monthFilter === month;
        return (
          <button
            key={month}
            type="button"
            onClick={() => onSelect(isSelected ? "" : month)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors hover:bg-muted",
              isSelected && "border-transparent bg-[linear-gradient(180deg,#F06A37_0%,#E15D2D_100%)] text-white"
            )}
          >
            {label} <span className={cn("font-normal", isSelected && "text-white/70")}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: "grid" | "lista"; onChange: (v: "grid" | "lista") => void }) {
  return (
    <div className="flex shrink-0 items-center rounded-md border bg-card p-0.5 gap-0.5">
      {(["grid", "lista"] as const).map((v) => (
        <Button
          key={v}
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-6 px-2 text-[11px]",
            value === v
              ? "bg-[linear-gradient(180deg,#F06A37_0%,#E15D2D_100%)] text-white hover:bg-[linear-gradient(180deg,#F06A37_0%,#E15D2D_100%)]"
              : "text-[#333029]"
          )}
          onClick={() => onChange(v)}
        >
          {v === "grid" ? "Grid" : "Lista"}
        </Button>
      ))}
    </div>
  );
}

function FilterPanel({
  title = "Filtros",
  activeCount,
  onClear,
  children,
}: {
  title?: string;
  activeCount: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full shrink-0 lg:w-64">
      <style>{`
        .al-filter-panel { background: white; border: 1px solid #ece7dc; border-radius: 18px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); padding: 16px; display: flex; flex-direction: column; gap: 16px; }
        .al-filter-head { display: flex; align-items: center; justify-content: space-between; }
        .al-filter-title { font-size: 13px; font-weight: 700; color: #111111; }
        .al-filter-clear { font-size: 11.5px; font-weight: 600; color: #9a958a; }
        .al-filter-clear:hover { color: #c94f21; }
        .al-filter-section { padding-top: 14px; border-top: 1px solid #f0ece2; }
        .al-filter-section:first-child { padding-top: 0; border-top: none; }
        .al-filter-section-label { margin-bottom: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9a958a; }
        .al-filter-chip { max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-radius: 999px; border: 1px solid #ece7dc; background: white; color: #333029; padding: 3px 10px; font-size: 11.5px; font-weight: 600; transition: border-color 0.15s, color 0.15s; }
        .al-filter-chip:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
        .al-filter-chip-active, .al-filter-chip-active:hover { border-color: transparent; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; }
        .al-filter-day-selected, .al-filter-day-selected:hover { background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; }
        .al-filter-day-today { color: #c94f21; }
        .al-filter-dot { background: #E15D2D; }
      `}</style>
      <div className="al-filter-panel">
        <div className="al-filter-head">
          <span className="al-filter-title">{title}</span>
          {activeCount > 0 && (
            <button type="button" onClick={onClear} className="al-filter-clear">
              Limpiar
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="al-filter-section">
      <p className="al-filter-section-label">{label}</p>
      {children}
    </div>
  );
}

function FilterChips({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  const hasLong = options.some(([, l]) => l.length > 20) || options.length > 7;
  if (hasLong) {
    return (
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          title={l}
          onClick={() => onChange(value === v && v !== "" ? "" : v)}
          className={cn("al-filter-chip", value === v && "al-filter-chip-active")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Courses({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const allCourses = useMemo(
    () => getDisplayCourses(store.courses, store.techOpportunities, store.fpContent),
    [store.courses, store.techOpportunities, store.fpContent]
  );

  const [viewTab, setViewTab] = useState<"activos" | "archivados" | "todos">("activos");
  const [showFilters, setShowFilters] = useState(false);
  const [monthFilter, setMonthFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [modalidadFilter, setModalidadFilter] = useState("");
  const [prioridadFilter, setPrioridadFilter] = useState("");
  const [soloGratuitos, setSoloGratuitos] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "lista">("grid");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const sorted = useMemo(() => [...allCourses].sort((a, b) => {
    const da = (a.fecha_inicio || a.start_at || "").slice(0, 10);
    const db = (b.fecha_inicio || b.start_at || "").slice(0, 10);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  }), [allCourses]);

  const archivados = useMemo(() => sorted.filter(isCourseArchived), [sorted]);
  const activos = useMemo(() => sorted.filter((c) => !isCourseArchived(c) && !isCoursePast(c)), [sorted]);
  const tabBase = useMemo(
    () => viewTab === "activos" ? activos : viewTab === "archivados" ? archivados : sorted,
    [viewTab, activos, archivados, sorted]
  );

  const monthGroups = useMemo(() => {
    const groups = new Map<string, number>();
    for (const c of tabBase) {
      const d = (c.fecha_inicio || c.start_at || "").slice(0, 7);
      if (!d) continue;
      groups.set(d, (groups.get(d) ?? 0) + 1);
    }
    return groups;
  }, [tabBase]);

  const datesWithItems = useMemo(() => {
    const set = new Set<string>();
    for (const c of tabBase) { const d = dateKey(c.fecha_inicio || c.start_at); if (d) set.add(d); }
    return set;
  }, [tabBase]);

  const modalidades = useMemo(
    () => Array.from(new Set(tabBase.map((c) => c.modalidad).filter(Boolean))).sort() as string[],
    [tabBase]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tabBase.filter((c) => {
      if (q) {
        const hay = `${c.title} ${c.entidad || ""} ${c.platform || ""} ${Array.isArray(c.tags) ? c.tags.join(" ") : c.tags || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (monthFilter && !(c.fecha_inicio || c.start_at || "").startsWith(monthFilter)) return false;
      if (dayFilter && dateKey(c.fecha_inicio || c.start_at) !== dayFilter) return false;
      if (estadoFilter && c.status !== estadoFilter) return false;
      if (modalidadFilter && c.modalidad !== modalidadFilter) return false;
      if (prioridadFilter && normalizePriorityText(c.prioridad) !== prioridadFilter) return false;
      if (soloGratuitos) {
        const coste = (c.coste || "").toLowerCase().trim();
        if (coste && coste !== "gratis" && coste !== "0" && coste !== "gratuito" && coste !== "free") return false;
      }
      return true;
    });
  }, [tabBase, search, monthFilter, dayFilter, estadoFilter, modalidadFilter, prioridadFilter, soloGratuitos]);

  const { today, kpiEmpezados, kpiPendientes, kpiProx } = useMemo(() => {
    const t = todayKey();
    const i30 = dateKey(addDays(new Date(), 30).toISOString());
    return {
      today: t,
      kpiEmpezados: tabBase.filter((c) => c.status === "empezado").length,
      kpiPendientes: tabBase.filter((c) => c.status === "pendiente").length,
      kpiProx: tabBase.filter((c) => { const d = (c.fecha_inicio || c.start_at || "").slice(0, 10); return d >= t && d <= i30; }).length,
    };
  }, [tabBase]);

  const activeFilterCount = [monthFilter, dayFilter, estadoFilter, modalidadFilter, prioridadFilter, soloGratuitos].filter(Boolean).length;

  function clearAll() {
    setMonthFilter(""); setDayFilter(""); setEstadoFilter(""); setModalidadFilter(""); setPrioridadFilter(""); setSoloGratuitos(false); setSearchInput(""); setSearch("");
  }

  return (
    <>
      <style>{`
        .al-course-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .al-course-search { position: relative; flex: 1; min-width: 220px; }
        .al-course-search input { padding-left: 36px; height: 40px; border-radius: 12px; border: 1px solid #ece7dc; background: white; font-size: 13px; }
        .al-course-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: #9a958a; }
        .al-course-tabs { display: flex; align-items: center; gap: 2px; border-radius: 12px; border: 1px solid #ece7dc; background: white; padding: 3px; }
        .al-course-tab { height: 32px; padding: 0 12px; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: #6b6f72; background: transparent; border: none; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .al-course-tab.al-course-tab-active { background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; box-shadow: 0 6px 14px rgba(225, 93, 45, 0.25); }
        .al-course-filter-btn { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 12px; border: 1px solid #ece7dc; background: white; font-size: 12.5px; font-weight: 600; color: #333029; cursor: pointer; }
        .al-course-filter-btn.al-course-filter-btn-active { background: #fbe7dd; border-color: rgba(225, 93, 45, 0.3); color: #c94f21; }
        .al-course-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 640px) { .al-course-stats { grid-template-columns: repeat(4, 1fr); } }
        .al-course-stat-card { display: flex; align-items: center; gap: 12px; background: white; border: 1px solid #ece7dc; border-radius: 18px; padding: 14px 16px; box-shadow: 0 8px 20px rgba(17, 17, 17, 0.04); }
        .al-course-stat-icon { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; }
        .al-course-stat-value { font-size: 22px; font-weight: 800; line-height: 1; color: #111111; }
        .al-course-stat-label { font-size: 11px; font-weight: 600; color: #6b6f72; margin-top: 3px; }
        .al-course-chip-terracotta { border-color: rgba(225, 93, 45, 0.3) !important; background: #fbe7dd !important; color: #c94f21 !important; }
        .al-course-chip-amber { border-color: rgba(180, 121, 31, 0.3) !important; background: #fdf1dd !important; color: #8a5c14 !important; }
        .al-course-chip-green { border-color: rgba(31, 122, 77, 0.3) !important; background: #e7f5ee !important; color: #1f7a4d !important; }
        .al-course-count-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .al-course-count-text { font-size: 12px; color: #6b6f72; }
        .al-course-grid { display: grid; gap: 12px; }
        .al-course-grid-2 { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
        .al-course-card { position: relative; display: flex; flex-direction: column; gap: 8px; min-width: 0; background: white; border: 1px solid #ece7dc; border-radius: 18px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); padding: 13px; }
        .al-course-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .al-course-card-title { font-size: 13.5px; font-weight: 700; color: #111111; line-height: 1.28; }
        .al-course-card-org { font-size: 11px; color: #6b6f72; margin-top: 1px; }
        .al-course-card-meta { font-size: 11px; color: #6b6f72; }
        .al-course-card-desc { font-size: 11.5px; color: #4b4740; line-height: 1.4; }
        .al-course-card-actions { margin-top: auto; display: flex; flex-wrap: wrap; gap: 6px; padding-top: 2px; }
        .al-course-btn { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 10px; border-radius: 9px; font-size: 11.5px; font-weight: 600; border: 1px solid #ece7dc; background: white; color: #333029; cursor: pointer; white-space: nowrap; text-decoration: none; }
        .al-course-btn:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
        .al-course-empty { background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .al-course-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
        .al-course-empty-illustration { width: 100%; max-width: 280px; height: auto; }
        .al-course-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
        .al-course-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
        .al-course-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; font-size: 12.5px; font-weight: 700; border: none; cursor: pointer; }
      `}</style>
      <div className="space-y-4">
        <div className="al-course-toolbar">
          <div className="al-course-search">
            <Search />
            <Input placeholder="Buscar título, entidad, tag..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="al-course-tabs">
            {([["activos", `Activos ${activos.length}`], ["archivados", `Archivados ${archivados.length}`], ["todos", `Todos ${sorted.length}`]] as const).map(([id, label]) => (
              <button key={id} type="button" className={cn("al-course-tab", viewTab === id && "al-course-tab-active")} onClick={() => { setViewTab(id); clearAll(); }}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" className={cn("al-course-filter-btn", showFilters && "al-course-filter-btn-active")} onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros{activeFilterCount > 0 ? ` ${activeFilterCount}` : ""}
          </button>
        </div>

        <MonthChips monthGroups={monthGroups} monthFilter={monthFilter} totalCount={tabBase.length} onSelect={(m) => { setMonthFilter(m); setDayFilter(""); }} />

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="al-course-stats">
              <div className="al-course-stat-card">
                <span className="al-course-stat-icon" style={{ background: "#fbe7dd", color: "#E15D2D" }}><BookOpen className="h-4.5 w-4.5" /></span>
                <div><p className="al-course-stat-value">{tabBase.length}</p><p className="al-course-stat-label">Total</p></div>
              </div>
              <div className="al-course-stat-card">
                <span className="al-course-stat-icon" style={{ background: "#e7f5ee", color: "#1f7a4d" }}><CheckCircle2 className="h-4.5 w-4.5" /></span>
                <div><p className="al-course-stat-value">{kpiEmpezados}</p><p className="al-course-stat-label">Empezados</p></div>
              </div>
              <div className="al-course-stat-card">
                <span className="al-course-stat-icon" style={{ background: "#fdf1dd", color: "#b4791f" }}><Clock className="h-4.5 w-4.5" /></span>
                <div><p className="al-course-stat-value">{kpiPendientes}</p><p className="al-course-stat-label">Pendientes</p></div>
              </div>
              <div className="al-course-stat-card">
                <span className="al-course-stat-icon" style={{ background: "#f3ece1", color: "#6b6f72" }}><AlarmClock className="h-4.5 w-4.5" /></span>
                <div><p className="al-course-stat-value">{kpiProx}</p><p className="al-course-stat-label">Próx. inicio</p></div>
              </div>
            </div>

            <div className="al-course-count-row">
              <p className="al-course-count-text">
                Mostrando {filtered.length} {filtered.length === 1 ? "curso" : "cursos"} · desde {formatDateLabel(today)} · ordenado por fecha de inicio
              </p>
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>

            {filtered.length ? (
              <div className={cn("al-course-grid", viewMode === "grid" ? "al-course-grid-2" : "")}>
                {filtered.map((item) => {
                  const startDate = item.fecha_inicio || item.start_at;
                  const endDate = item.fecha_fin || item.deadline_at;
                  const place = [item.localidad, item.provincia].filter(Boolean).join(" / ");
                  const url = item.fuente_url || item.url;
                  return (
                    <div key={item.id} className="al-course-card">
                      <div className="al-course-card-top">
                        <div className="min-w-0">
                          <p className="al-course-card-title line-clamp-2" title={item.title}>{item.title}</p>
                          {(item.entidad || item.platform) && <p className="al-course-card-org line-clamp-1" title={item.entidad || item.platform}>{item.entidad || item.platform}</p>}
                        </div>
                        <Badge className={cn("shrink-0", courseStatusClass(item.status))}>{item.status}</Badge>
                      </div>
                      {(startDate || endDate) && (
                        <p className="al-course-card-meta">
                          {startDate ? formatDateLabel(startDate) : "—"}{endDate ? ` → ${formatDateLabel(endDate)}` : ""}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {place && <ChipTag icon="pin" className="max-w-full break-words">{place}</ChipTag>}
                        {item.modalidad && <ChipTag className="max-w-full break-words">{item.modalidad}</ChipTag>}
                        {item.prioridad && <ChipTag className={cn("max-w-full break-words", coursePriorityClass(item.prioridad))}>{priorityText(item.prioridad)}</ChipTag>}
                      </div>
                      {item.requisitos_resumen && <p className="al-course-card-desc line-clamp-2" title={item.requisitos_resumen}>{item.requisitos_resumen}</p>}
                      <div className="al-course-card-actions">
                        {url && <a href={url} target="_blank" rel="noreferrer" className="al-course-btn"><ExternalLink className="h-3.5 w-3.5" />Abrir</a>}
                        {!isCourseArchived(item) && (
                          <button type="button" className="al-course-btn" onClick={() => actions.completeCourse(item).catch(() => {})}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Terminado
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : viewTab === "archivados" && !search && activeFilterCount === 0 ? (
              <div className="al-course-empty">
                <Image src="/assets/cursos/cursos-empty-archivados.png" alt="" width={480} height={294} className="al-course-empty-illustration" />
                <p className="al-course-empty-title">No tienes cursos archivados</p>
                <p className="al-course-empty-desc">Cuando archives un curso aparecerá aquí.</p>
              </div>
            ) : (
              <div className="al-course-empty">
                <span className="al-course-empty-icon"><BookOpen className="h-6 w-6" /></span>
                <p className="al-course-empty-title">Sin resultados</p>
                <p className="al-course-empty-desc">{search || activeFilterCount > 0 ? "Ningún curso coincide con tu búsqueda o filtros." : "No hay cursos en esta vista todavía."}</p>
                {(search || activeFilterCount > 0) && <button type="button" className="al-course-empty-btn" onClick={clearAll}>Quitar filtros</button>}
              </div>
            )}
          </div>

          {showFilters && (
            <FilterPanel activeCount={activeFilterCount} onClear={clearAll}>
              <FilterSection label="Calendario">
                <FilterCalendar datesWithItems={datesWithItems} dayFilter={dayFilter} onDaySelect={(d) => { setDayFilter(d); if (d) setMonthFilter(""); }} />
              </FilterSection>
              <FilterSection label="Estado">
                <FilterChips
                  options={[["", "Todos"], ["pendiente", "Pendiente"], ["empezado", "Activo"], ["pausado", "Pausado"]]}
                  value={estadoFilter}
                  onChange={setEstadoFilter}
                />
              </FilterSection>
              {modalidades.length > 0 && (
                <FilterSection label="Modalidad">
                  <FilterChips
                    options={[["", "Todas"], ...modalidades.map((m): [string, string] => [m, m])]}
                    value={modalidadFilter}
                    onChange={setModalidadFilter}
                  />
                </FilterSection>
              )}
              <FilterSection label="Prioridad">
                <FilterChips
                  options={[["", "Todas"], ["alta", "Alta"], ["media", "Media"], ["baja", "Baja"]]}
                  value={prioridadFilter}
                  onChange={setPrioridadFilter}
                />
              </FilterSection>
              <FilterSection label="Solo">
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input type="checkbox" checked={soloGratuitos} onChange={(e) => setSoloGratuitos(e.target.checked)} className="rounded" />
                  Gratuitos
                </label>
              </FilterSection>
            </FilterPanel>
          )}
        </div>
      </div>
    </>
  );
}

function coursePriorityClass(value?: string): string {
  const priority = normalizePriorityText(value);
  if (priority.includes("alta")) return "al-course-chip-terracotta";
  if (priority.includes("baja")) return "al-course-chip-green";
  return "al-course-chip-amber";
}

function Hackathons({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const allHackathons = useMemo(
    () => getDisplayHackathons(store.hackathons, store.techOpportunities, store.fpContent),
    [store.hackathons, store.techOpportunities, store.fpContent]
  );

  const [viewTab, setViewTab] = useState<"activos" | "archivados" | "todos">("activos");
  const [showFilters, setShowFilters] = useState(false);
  const [monthFilter, setMonthFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [provinciaFilter, setProvinciaFilter] = useState("");
  const [modalidadFilter, setModalidadFilter] = useState("");
  const [prioridadFilter, setPrioridadFilter] = useState("");
  const [soloInscripcionAbierta, setSoloInscripcionAbierta] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "lista">("grid");
  const [requirementsItemId, setRequirementsItemId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const sorted = useMemo(() => [...allHackathons].sort((a, b) => {
    const da = (a.start_at || "").slice(0, 10);
    const db = (b.start_at || "").slice(0, 10);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  }), [allHackathons]);

  const archivados = useMemo(() => sorted.filter(isHackathonArchived), [sorted]);
  const activos = useMemo(() => sorted.filter((h) => !isHackathonArchived(h) && !isHackathonPast(h)), [sorted]);
  const tabBase = useMemo(
    () => viewTab === "activos" ? activos : viewTab === "archivados" ? archivados : sorted,
    [viewTab, activos, archivados, sorted]
  );

  const monthGroups = useMemo(() => {
    const groups = new Map<string, number>();
    for (const h of tabBase) {
      const d = (h.start_at || "").slice(0, 7);
      if (!d) continue;
      groups.set(d, (groups.get(d) ?? 0) + 1);
    }
    return groups;
  }, [tabBase]);

  const datesWithItems = useMemo(() => {
    const set = new Set<string>();
    for (const h of tabBase) { const d = dateKey(h.start_at); if (d) set.add(d); }
    return set;
  }, [tabBase]);

  const provincias = useMemo(
    () => Array.from(new Set(tabBase.map((h) => h.province).filter(Boolean))).sort() as string[],
    [tabBase]
  );
  const modalidades = useMemo(
    () => Array.from(new Set(tabBase.map((h) => h.modalidad).filter(Boolean))).sort() as string[],
    [tabBase]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tabBase.filter((h) => {
      if (q) {
        const hay = `${h.name} ${h.organizer || ""} ${Array.isArray(h.tags) ? h.tags.join(" ") : h.tags || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (monthFilter && !(h.start_at || "").startsWith(monthFilter)) return false;
      if (dayFilter && dateKey(h.start_at) !== dayFilter) return false;
      if (estadoFilter && h.status !== estadoFilter) return false;
      if (provinciaFilter && h.province !== provinciaFilter) return false;
      if (modalidadFilter && h.modalidad !== modalidadFilter) return false;
      if (prioridadFilter && normalizePriorityText(h.priority) !== prioridadFilter) return false;
      if (soloInscripcionAbierta && h.status !== "inscripcion_abierta") return false;
      return true;
    });
  }, [tabBase, search, monthFilter, dayFilter, estadoFilter, provinciaFilter, modalidadFilter, prioridadFilter, soloInscripcionAbierta]);

  const { today, kpiAbiertos, kpiPendientes, kpiProx } = useMemo(() => {
    const t = todayKey();
    const i30 = dateKey(addDays(new Date(), 30).toISOString());
    return {
      today: t,
      kpiAbiertos: tabBase.filter((h) => h.status === "inscripcion_abierta").length,
      kpiPendientes: tabBase.filter((h) => h.status === "pendiente").length,
      kpiProx: tabBase.filter((h) => { const d = (h.start_at || "").slice(0, 10); return d >= t && d <= i30; }).length,
    };
  }, [tabBase]);

  const activeFilterCount = [monthFilter, dayFilter, estadoFilter, provinciaFilter, modalidadFilter, prioridadFilter, soloInscripcionAbierta].filter(Boolean).length;

  function clearAll() {
    setMonthFilter(""); setDayFilter(""); setEstadoFilter(""); setProvinciaFilter(""); setModalidadFilter(""); setPrioridadFilter(""); setSoloInscripcionAbierta(false); setSearchInput(""); setSearch("");
  }

  const featuredHackathon = useMemo(() => {
    const open = activos.filter((h) => h.status === "inscripcion_abierta");
    const pool = open.length > 0 ? open : activos;
    if (pool.length === 0) return null;
    return [...pool].sort((a, b) => (a.start_at || "9999-99-99").localeCompare(b.start_at || "9999-99-99"))[0];
  }, [activos]);
  const featuredProgress = featuredHackathon ? hackathonAptitudeProgress(featuredHackathon) : null;
  const featuredHasRuta = featuredHackathon ? !!(featuredHackathon.id_slug && hackathonHasRutaVideo(featuredHackathon)) : false;

  // Resolve against the current allHackathons collection instead of retaining
  // the object captured when the modal opened. Requirement updates then appear
  // immediately without closing and reopening the modal.
  const requirementsItem = useMemo(
    () => (requirementsItemId ? allHackathons.find((h) => h.id === requirementsItemId) ?? null : null),
    [requirementsItemId, allHackathons]
  );

  return (
    <>
      <style>{`
        .al-hack-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .al-hack-search { position: relative; flex: 1; min-width: 220px; }
        .al-hack-search input { padding-left: 36px; height: 40px; border-radius: 12px; border: 1px solid #ece7dc; background: white; font-size: 13px; }
        .al-hack-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: #9a958a; }
        .al-hack-tabs { display: flex; align-items: center; gap: 2px; border-radius: 12px; border: 1px solid #ece7dc; background: white; padding: 3px; }
        .al-hack-tab { height: 32px; padding: 0 12px; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: #6b6f72; background: transparent; border: none; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .al-hack-tab.al-hack-tab-active { background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; box-shadow: 0 6px 14px rgba(225, 93, 45, 0.25); }
        .al-hack-filter-btn { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 12px; border: 1px solid #ece7dc; background: white; font-size: 12.5px; font-weight: 600; color: #333029; cursor: pointer; }
        .al-hack-filter-btn.al-hack-filter-btn-active { background: #fbe7dd; border-color: rgba(225, 93, 45, 0.3); color: #c94f21; }
        .al-hack-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 640px) { .al-hack-stats { grid-template-columns: repeat(4, 1fr); } }
        .al-hack-stat-card { display: flex; align-items: center; gap: 12px; background: white; border: 1px solid #ece7dc; border-radius: 18px; padding: 14px 16px; box-shadow: 0 8px 20px rgba(17, 17, 17, 0.04); }
        .al-hack-stat-icon { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; }
        .al-hack-stat-value { font-size: 22px; font-weight: 800; line-height: 1; color: #111111; }
        .al-hack-stat-label { font-size: 11px; font-weight: 600; color: #6b6f72; margin-top: 3px; }
        .al-hack-chip-terracotta { border-color: rgba(225, 93, 45, 0.3) !important; background: #fbe7dd !important; color: #c94f21 !important; }
        .al-hack-chip-amber { border-color: rgba(180, 121, 31, 0.3) !important; background: #fdf1dd !important; color: #8a5c14 !important; }
        .al-hack-chip-green { border-color: rgba(31, 122, 77, 0.3) !important; background: #e7f5ee !important; color: #1f7a4d !important; }
        .al-hack-hero { position: relative; overflow: hidden; border-radius: 22px; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); color: #111111; padding: clamp(18px, 3vw, 26px); display: flex; flex-direction: column; gap: 18px; }
        @media (min-width: 900px) { .al-hack-hero { flex-direction: row; align-items: stretch; } }
        .al-hack-hero-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
        .al-hack-hero-kicker { display: inline-flex; align-items: center; gap: 6px; width: fit-content; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #c94f21; }
        .al-hack-hero-title { font-size: clamp(20px, 2.6vw, 26px); font-weight: 700; line-height: 1.15; letter-spacing: -0.01em; color: #111111; }
        .al-hack-hero-org { font-size: 12.5px; color: #6b6f72; }
        .al-hack-hero-meta { font-size: 12.5px; color: #4b4740; }
        .al-hack-hero-desc { font-size: 13px; color: #4b4740; line-height: 1.5; max-width: 56ch; }
        .al-hack-hero-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
        .al-hack-hero-btn-primary { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 16px; border-radius: 12px; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; font-size: 13px; font-weight: 700; box-shadow: 0 10px 24px rgba(225, 93, 45, 0.28); border: none; cursor: pointer; }
        .al-hack-hero-btn-ghost { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 14px; border-radius: 12px; background: white; color: #333029; font-size: 13px; font-weight: 600; border: 1px solid #ece7dc; cursor: pointer; }
        .al-hack-hero-side { width: 100%; background: #faf8f4; border: 1px solid #ece7dc; border-radius: 16px; padding: 16px; }
        @media (min-width: 900px) { .al-hack-hero-side { width: 220px; flex-shrink: 0; } }
        .al-hack-hero-side-label { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; font-size: 11px; font-weight: 700; color: #6b6f72; text-transform: uppercase; letter-spacing: 0.05em; }
        .al-hack-hero-side-value { font-size: 14px; font-weight: 700; color: #c94f21; }
        .al-hack-hero-progress-bar { margin-top: 10px; height: 8px; border-radius: 999px; background: #f3ece1; overflow: hidden; }
        .al-hack-hero-progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #F06A37, #E15D2D); transition: width 0.3s ease; }
        .al-hack-hero-side-hint { margin-top: 10px; font-size: 11.5px; color: #6b6f72; line-height: 1.4; }
        .al-hack-count-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .al-hack-count-text { font-size: 12px; color: #6b6f72; }
        .al-hack-grid { display: grid; gap: 12px; }
        .al-hack-grid-2 { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
        .al-hack-card { position: relative; display: flex; flex-direction: column; gap: 8px; background: white; border: 1px solid #ece7dc; border-radius: 18px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); padding: 13px; }
        .al-hack-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .al-hack-card-title { font-size: 13.5px; font-weight: 700; color: #111111; line-height: 1.28; }
        .al-hack-card-org { font-size: 11px; color: #6b6f72; margin-top: 1px; }
        .al-hack-bookmark { display: flex; align-items: center; justify-content: center; width: 27px; height: 27px; border-radius: 9px; border: 1px solid #ece7dc; background: white; color: #9a958a; cursor: pointer; flex-shrink: 0; transition: color 0.15s, border-color 0.15s, background 0.15s; }
        .al-hack-bookmark.al-hack-bookmark-active { color: #E15D2D; border-color: rgba(225, 93, 45, 0.35); background: #fbe7dd; }
        .al-hack-card-meta { font-size: 11px; color: #6b6f72; }
        .al-hack-card-desc { font-size: 11.5px; color: #4b4740; line-height: 1.4; }
        .al-hack-card-actions { margin-top: auto; display: flex; flex-wrap: wrap; gap: 6px; padding-top: 2px; }
        .al-hack-btn { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 10px; border-radius: 9px; font-size: 11.5px; font-weight: 600; border: 1px solid #ece7dc; background: white; color: #333029; cursor: pointer; white-space: nowrap; }
        .al-hack-btn:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
        .al-hack-btn-primary { border-color: rgba(225, 93, 45, 0.3); background: #fbe7dd; color: #c94f21; }
        .al-hack-empty-wrap { display: grid; gap: 14px; grid-template-columns: 1fr; }
        @media (min-width: 640px) { .al-hack-empty-wrap.al-hack-empty-two { grid-template-columns: 1fr 1fr; } }
        .al-hack-empty { background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .al-hack-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
        .al-hack-empty-illustration { width: 100%; max-width: 280px; height: auto; }
        .al-hack-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
        .al-hack-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
        .al-hack-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; font-size: 12.5px; font-weight: 700; border: none; cursor: pointer; }
      `}</style>
      <div className="space-y-4">
        <div className="al-hack-toolbar">
          <div className="al-hack-search">
            <Search />
            <Input placeholder="Buscar nombre, organizador, tema, aptitud..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="al-hack-tabs">
            {([["activos", `Activos ${activos.length}`], ["archivados", `Archivados ${archivados.length}`], ["todos", `Todos ${sorted.length}`]] as const).map(([id, label]) => (
              <button key={id} type="button" className={cn("al-hack-tab", viewTab === id && "al-hack-tab-active")} onClick={() => { setViewTab(id); clearAll(); }}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" className={cn("al-hack-filter-btn", showFilters && "al-hack-filter-btn-active")} onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros{activeFilterCount > 0 ? ` ${activeFilterCount}` : ""}
          </button>
        </div>

        <MonthChips monthGroups={monthGroups} monthFilter={monthFilter} totalCount={tabBase.length} onSelect={(m) => { setMonthFilter(m); setDayFilter(""); }} />

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="al-hack-stats">
              <div className="al-hack-stat-card">
                <span className="al-hack-stat-icon" style={{ background: "#fbe7dd", color: "#E15D2D" }}><Trophy className="h-4.5 w-4.5" /></span>
                <div><p className="al-hack-stat-value">{tabBase.length}</p><p className="al-hack-stat-label">Total</p></div>
              </div>
              <div className="al-hack-stat-card">
                <span className="al-hack-stat-icon" style={{ background: "#e7f5ee", color: "#1f7a4d" }}><CheckCircle2 className="h-4.5 w-4.5" /></span>
                <div><p className="al-hack-stat-value">{kpiAbiertos}</p><p className="al-hack-stat-label">Inscripción abierta</p></div>
              </div>
              <div className="al-hack-stat-card">
                <span className="al-hack-stat-icon" style={{ background: "#fdf1dd", color: "#b4791f" }}><Clock className="h-4.5 w-4.5" /></span>
                <div><p className="al-hack-stat-value">{kpiPendientes}</p><p className="al-hack-stat-label">Pendientes</p></div>
              </div>
              <div className="al-hack-stat-card">
                <span className="al-hack-stat-icon" style={{ background: "#f3ece1", color: "#6b6f72" }}><AlarmClock className="h-4.5 w-4.5" /></span>
                <div><p className="al-hack-stat-value">{kpiProx}</p><p className="al-hack-stat-label">Próx. inicio</p></div>
              </div>
            </div>

            {featuredHackathon && (
              <div className="al-hack-hero">
                <div className="al-hack-hero-main">
                  <span className="al-hack-hero-kicker">Próximo evento o reto</span>
                  <p className="al-hack-hero-title">{featuredHackathon.name}</p>
                  {featuredHackathon.organizer && <p className="al-hack-hero-org">{featuredHackathon.organizer}</p>}
                  {(featuredHackathon.start_at || featuredHackathon.end_at) && (
                    <p className="al-hack-hero-meta">
                      {featuredHackathon.start_at ? formatDateLabel(featuredHackathon.start_at) : "—"}
                      {featuredHackathon.end_at ? ` → ${formatDateLabel(featuredHackathon.end_at)}` : ""}
                    </p>
                  )}
                  {featuredHackathon.notes && <p className="al-hack-hero-desc">{featuredHackathon.notes}</p>}
                  <div className="al-hack-hero-actions">
                    {featuredHasRuta ? (
                      <Link href={`/ruta/${featuredHackathon.id_slug}`} className="al-hack-hero-btn-primary">
                        <PlayCircle className="h-4 w-4" />Abrir preparación
                      </Link>
                    ) : featuredHackathon.url ? (
                      <a href={featuredHackathon.url} target="_blank" rel="noreferrer" className="al-hack-hero-btn-primary">
                        <ExternalLink className="h-4 w-4" />Abrir convocatoria
                      </a>
                    ) : null}
                    {featuredHackathon.requiredCompetencies && featuredHackathon.requiredCompetencies.length > 0 && (
                      <button type="button" className="al-hack-hero-btn-ghost" onClick={() => setRequirementsItemId(featuredHackathon.id)}>
                        <ListChecks className="h-4 w-4" />Aptitudes mínimas
                      </button>
                    )}
                  </div>
                </div>
                {featuredProgress && featuredProgress.total > 0 && (
                  <div className="al-hack-hero-side">
                    <div className="al-hack-hero-side-label">
                      <span>Tu progreso</span>
                      <span className="al-hack-hero-side-value">{featuredProgress.done}/{featuredProgress.total} completadas</span>
                    </div>
                    <div className="al-hack-hero-progress-bar">
                      <div className="al-hack-hero-progress-fill" style={{ width: `${Math.round((featuredProgress.done / featuredProgress.total) * 100)}%` }} />
                    </div>
                    <p className="al-hack-hero-side-hint">Aptitudes imprescindibles que ya has completado en tu ruta de aprendizaje.</p>
                  </div>
                )}
              </div>
            )}

            <div className="al-hack-count-row">
              <p className="al-hack-count-text">
                Mostrando {filtered.length} {filtered.length === 1 ? "evento o reto" : "eventos y retos"} · desde {formatDateLabel(today)} · ordenado por fecha de inicio
              </p>
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>

            {filtered.length ? (
              <div className={cn("al-hack-grid", viewMode === "grid" ? "al-hack-grid-2" : "")}>
                {filtered.map((item) => {
                  const place = [item.localidad || item.city, item.province].filter(Boolean).join(" / ");
                  const inscripcionFin = item.inscripcion_hasta || item.registration_deadline_at;
                  const readOnlyTechItem = item.sourceTable === "tech_opportunities" || item.sourceTable === "fp_content_items";
                  const hasRuta = item.id_slug && hackathonHasRutaVideo(item);
                  const canFavorite = item.sourceTable === "fp_content_items" && !!item.id_slug;
                  return (
                    <div key={item.id} className="al-hack-card">
                      <div className="al-hack-card-top">
                        <div className="min-w-0">
                          <p className="al-hack-card-title">{item.name}</p>
                          {item.organizer && <p className="al-hack-card-org">{item.organizer}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge className={cn("shrink-0", hackathonStatusClass(item.status))}>{hackathonStatusLabel(item.status)}</Badge>
                          {canFavorite && (
                            <button
                              type="button"
                              className={cn("al-hack-bookmark", item.is_favorite && "al-hack-bookmark-active")}
                              aria-label={item.is_favorite ? "Quitar de guardados" : "Guardar"}
                              onClick={() => actions.toggleFpFavorite(item.id_slug!, !item.is_favorite)}
                            >
                              <Bookmark className="h-3.5 w-3.5" fill={item.is_favorite ? "currentColor" : "none"} />
                            </button>
                          )}
                        </div>
                      </div>
                      {(item.start_at || item.end_at) && (
                        <p className="al-hack-card-meta">
                          {item.start_at ? formatDateLabel(item.start_at) : "—"}{item.end_at ? ` → ${formatDateLabel(item.end_at)}` : ""}
                          {inscripcionFin && <span className="ml-2 opacity-70">· Inscripción hasta {formatDateLabel(inscripcionFin)}</span>}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {place && <ChipTag icon="pin">{place}</ChipTag>}
                        {item.modalidad && <ChipTag>{item.modalidad}</ChipTag>}
                        {item.priority && <ChipTag className={hackPriorityClass(item.priority)}>{priorityText(item.priority)}</ChipTag>}
                      </div>
                      {item.notes && <p className="al-hack-card-desc line-clamp-2">{item.notes}</p>}
                      <div className="al-hack-card-actions">
                        {hasRuta ? (
                          <Link href={`/ruta/${item.id_slug}`} className="al-hack-btn al-hack-btn-primary">
                            <PlayCircle className="h-3.5 w-3.5" />Abrir ruta
                          </Link>
                        ) : (
                          item.url && (
                            <a href={item.url} target="_blank" rel="noreferrer" className="al-hack-btn">
                              <ExternalLink className="h-3.5 w-3.5" />Abrir web
                            </a>
                          )
                        )}
                        {item.requiredCompetencies && item.requiredCompetencies.length > 0 && (
                          <button type="button" className="al-hack-btn" onClick={() => setRequirementsItemId(item.id)}>
                            <ListChecks className="h-3.5 w-3.5" />Ver detalles
                          </button>
                        )}
                        <button type="button" className="al-hack-btn" onClick={() => actions.addTask({ title: `Revisar ${item.name}`, due_at: addDaysKeepingTime("", 1), status: "pendiente", priority: "media", description: "Evento o reto" }).catch(() => {})}>
                          <Plus className="h-3.5 w-3.5" />Crear tarea
                        </button>
                        {!isHackathonArchived(item) && (
                          <button type="button" className="al-hack-btn" onClick={() => completeHackathonItem(item, actions)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />Realizado
                          </button>
                        )}
                        {!readOnlyTechItem && item.status === "revisar_futura_edicion" && (
                          <button type="button" className="al-hack-btn" onClick={() => actions.updateHackathon(item.id, { status: "pendiente" })}>Revisado</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <HackathonsEmptyState variant={search || activeFilterCount > 0 ? "sin_resultados" : viewTab === "activos" ? "sin_activos" : "sin_datos"} onClearFilters={clearAll} />
            )}
          </div>

          {showFilters && (
            <FilterPanel activeCount={activeFilterCount} onClear={clearAll}>
              <FilterSection label="Calendario">
                <FilterCalendar datesWithItems={datesWithItems} dayFilter={dayFilter} onDaySelect={(d) => { setDayFilter(d); if (d) setMonthFilter(""); }} />
              </FilterSection>
              <FilterSection label="Estado">
                <FilterChips
                  options={[["", "Todos"], ["pendiente", "Pendiente"], ["inscripcion_abierta", "Activo"]]}
                  value={estadoFilter}
                  onChange={setEstadoFilter}
                />
              </FilterSection>
              {modalidades.length > 0 && (
                <FilterSection label="Modalidad">
                  <FilterChips
                    options={[["", "Todas"], ...modalidades.map((m): [string, string] => [m, m])]}
                    value={modalidadFilter}
                    onChange={setModalidadFilter}
                  />
                </FilterSection>
              )}
              {provincias.length > 0 && (
                <FilterSection label="Provincia">
                  <FilterChips
                    options={[["", "Todas"], ...provincias.map((p): [string, string] => [p, p])]}
                    value={provinciaFilter}
                    onChange={setProvinciaFilter}
                  />
                </FilterSection>
              )}
              <FilterSection label="Prioridad">
                <FilterChips
                  options={[["", "Todas"], ["alta", "Alta"], ["media", "Media"], ["baja", "Baja"]]}
                  value={prioridadFilter}
                  onChange={setPrioridadFilter}
                />
              </FilterSection>
              <FilterSection label="Solo">
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input type="checkbox" checked={soloInscripcionAbierta} onChange={(e) => setSoloInscripcionAbierta(e.target.checked)} className="rounded" />
                  Inscripción abierta
                </label>
              </FilterSection>
            </FilterPanel>
          )}
        </div>

        <HackathonRequirementsModal item={requirementsItem} actions={actions} onClose={() => setRequirementsItemId(null)} />
      </div>
    </>
  );
}

function HackathonsEmptyState({ variant, onClearFilters }: { variant: "sin_resultados" | "sin_activos" | "sin_datos"; onClearFilters: () => void }) {
  if (variant === "sin_resultados") {
    return (
      <div className="al-hack-empty-wrap">
        <div className="al-hack-empty">
          <span className="al-hack-empty-icon"><Search className="h-6 w-6" /></span>
          <p className="al-hack-empty-title">Sin resultados</p>
          <p className="al-hack-empty-desc">Ningún evento o reto coincide con tu búsqueda o filtros.</p>
          <button type="button" className="al-hack-empty-btn" onClick={onClearFilters}>Quitar filtros</button>
        </div>
      </div>
    );
  }
  return (
    <div className="al-hack-empty-wrap al-hack-empty-two">
      <div className="al-hack-empty">
        <Image src="/assets/hackathons/hackathons-empty-sin-datos.png" alt="" width={900} height={295} sizes="280px" className="al-hack-empty-illustration" />
        <p className="al-hack-empty-title">Sin eventos o retos disponibles</p>
        <p className="al-hack-empty-desc">Vuelve pronto para descubrir nuevas convocatorias relacionadas con tu ciclo.</p>
      </div>
      <div className="al-hack-empty">
        <Image src="/assets/hackathons/hackathons-empty-sin-activos.png" alt="" width={900} height={295} sizes="280px" className="al-hack-empty-illustration" />
        <p className="al-hack-empty-title">¡Aún no te has inscrito!</p>
        <p className="al-hack-empty-desc">Busca un evento o reto y demuestra tus habilidades.</p>
      </div>
    </div>
  );
}

function HackathonRequirementsModal({ item, actions, onClose }: { item: Hackathon | null; actions: ReturnTypeActions; onClose: () => void }) {
  const competencies = item?.requiredCompetencies ?? [];
  const obligatorias = competencies.filter((competency) => competency.obligatoria_para_item);
  const recomendadas = competencies.filter((competency) => !competency.obligatoria_para_item);
  const steps = [...obligatorias, ...recomendadas];
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Portals require a DOM to attach to, so the actual portal render is
  // deferred one tick past the server-rendered pass.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setStepIndex(0);
  }, [item?.id]);

  useEffect(() => {
    if (!item?.id) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Make everything behind the portal unreachable to assistive tech and
    // keyboard/pointer input while the modal is open. rootRef is excluded
    // since it IS the modal, appended as its own sibling under body. Each
    // sibling's own prior inert value is captured and restored on cleanup
    // instead of assuming it was false, in case something else already
    // relied on it being inert for an unrelated reason.
    const backgroundSiblings = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== rootRef.current,
    );
    const previousInertStates = backgroundSiblings.map((el) => el.inert);
    backgroundSiblings.forEach((el) => { el.inert = true; });

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      backgroundSiblings.forEach((el, index) => { el.inert = previousInertStates[index]; });
      previouslyFocused?.focus();
    };
    // item?.id only - not the item object itself, which the store rebuilds
    // (new reference, same event) whenever any of its fields change, e.g.
    // marking an aptitude or navigating between steps. Keying on the full
    // object would tear down and redo this whole lifecycle - scroll lock,
    // inert, and focus jumping back to the close button - on every such
    // update, even though the modal never actually closed and reopened.
  }, [item?.id]);

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusableElements?.length) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  if (!mounted || !item) return null;

  const canFavorite = item.sourceTable === "fp_content_items" && !!item.id_slug;
  const safeIndex = steps.length > 0 ? Math.min(stepIndex, steps.length - 1) : 0;
  const currentStep = steps[safeIndex] ?? null;
  // Always an exact internal destination when we know one - the current step
  // when there is one, otherwise the path's overview. Never a generic
  // catalogue link, and never gated behind that step having a video.
  const rutaHref = item.id_slug ? `/ruta/${item.id_slug}${currentStep ? `?paso=${currentStep.id}` : ""}` : null;

  return createPortal(
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex items-end bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <style>{`
        .al-modal-shell { background: white; border-radius: 22px 22px 0 0; box-shadow: 0 24px 60px rgba(17,17,17,0.18); display: flex; flex-direction: column; }
        @media (min-width: 640px) { .al-modal-shell { border-radius: 22px; } }
        .al-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid #f0ece2; flex-shrink: 0; }
        .al-modal-head-icon { display: flex; align-items: center; justify-content: center; width: 52px; height: 52px; flex-shrink: 0; }
        .al-modal-title { font-size: 18px; font-weight: 700; color: #111111; line-height: 24px; letter-spacing: -0.02em; }
        .al-modal-subtitle { font-size: 11.5px; color: #6b6f72; margin-top: 2px; }
        .al-modal-close { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 9px; border: 1px solid #ece7dc; background: white; color: #6b6f72; cursor: pointer; flex-shrink: 0; }
        .al-modal-step-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 18px; }
        .al-modal-step-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
        .al-modal-step-badge { display: inline-flex; align-items: center; height: 22px; padding: 0 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; }
        .al-modal-step-badge-oblig { background: #e7f5ee; color: #1f7a4d; }
        .al-modal-step-badge-reco { background: #fdf1dd; color: #b4791f; }
        .al-modal-step-count { font-size: 11px; font-weight: 600; color: #9a958a; }
        .al-modal-step-card { border: 1px solid #ece7dc; border-radius: 16px; padding: 16px; }
        .al-modal-step-card-head { display: flex; align-items: flex-start; gap: 10px; }
        .al-modal-req-check { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 999px; flex-shrink: 0; margin-top: 1px; }
        .al-modal-req-check-done { background: linear-gradient(180deg, #4C9A6E, #1f7a4d); color: white; }
        .al-modal-req-check-pending { border: 2px solid #e4dfd5; color: transparent; }
        .al-modal-req-title { font-size: 14.5px; font-weight: 700; color: #111111; line-height: 1.35; }
        .al-modal-req-desc { font-size: 12.5px; color: #4b4740; margin-top: 8px; line-height: 1.55; }
        .al-modal-req-actions { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
        .al-modal-req-btn { display: inline-flex; align-items: center; gap: 5px; height: 29px; padding: 0 10px; border-radius: 8px; border: 1px solid #ece7dc; background: white; font-size: 11px; font-weight: 600; color: #333029; text-decoration: none; cursor: pointer; }
        .al-modal-req-btn-video { border-color: rgba(225, 93, 45, 0.3); background: #fbe7dd; color: #c94f21; }
        .al-modal-mark-done { margin-top: 12px; display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 9px; border: none; cursor: pointer; font-size: 11.5px; font-weight: 700; background: linear-gradient(180deg, #4C9A6E, #1f7a4d); color: white; }
        .al-modal-mark-done-active { background: #e7f5ee; color: #1f7a4d; cursor: default; }
        .al-modal-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 18px; border-top: 1px solid #f0ece2; flex-shrink: 0; }
        .al-modal-nav-btn { display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 11px; border-radius: 9px; border: 1px solid #ece7dc; background: white; font-size: 11.5px; font-weight: 600; color: #333029; cursor: pointer; }
        .al-modal-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .al-modal-dots { display: flex; align-items: center; gap: 5px; }
        .al-modal-dot { width: 6px; height: 6px; border-radius: 999px; background: #e4dfd5; }
        .al-modal-dot-done { background: #a9d6bc; }
        .al-modal-dot-active { width: 16px; background: linear-gradient(90deg, #F06A37, #E15D2D); }
        .al-modal-footer { border-top: 1px solid #f0ece2; padding: 14px 18px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
        .al-modal-footer-row { display: flex; gap: 8px; }
        .al-modal-btn-primary { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 42px; border-radius: 13px; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; font-size: 13px; font-weight: 700; box-shadow: 0 10px 24px rgba(225,93,45,0.25); border: none; cursor: pointer; text-decoration: none; flex-direction: column; line-height: 1.25; }
        .al-modal-btn-primary small { font-weight: 500; font-size: 10.5px; opacity: 0.85; }
        .al-modal-btn-secondary { display: inline-flex; align-items: center; gap: 7px; height: 42px; padding: 0 16px; border-radius: 13px; border: 1px solid #ece7dc; background: white; color: #333029; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .al-modal-footer-hint { text-align: center; font-size: 10.5px; color: #9a958a; }
      `}</style>
      <div
        ref={dialogRef}
        className="al-modal-shell max-h-[92svh] w-full overflow-hidden sm:max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="al-modal-head">
          <span className="al-modal-head-icon">
            <Image src="/assets/hackathons/hackathons-modal-checklist-icon.png" alt="" width={160} height={160} className="h-full w-full object-contain" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="al-modal-title line-clamp-2">Requisitos para {item.name}</h2>
            <p id={descriptionId} className="al-modal-subtitle">Todo lo que conviene dominar antes de presentarte.</p>
          </div>
          <button ref={closeButtonRef} type="button" className="al-modal-close" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        {currentStep ? (
          <>
            <div className="al-modal-step-scroll">
              <div className="al-modal-step-top">
                <span className={cn("al-modal-step-badge", currentStep.obligatoria_para_item ? "al-modal-step-badge-oblig" : "al-modal-step-badge-reco")}>
                  {currentStep.obligatoria_para_item ? "Imprescindible" : "Recomendada"}
                </span>
                <span className="al-modal-step-count">Paso {safeIndex + 1} de {steps.length}</span>
              </div>
              <CompetencyRequirement
                competency={currentStep}
                hackathonSlug={item.id_slug}
                actions={actions}
                onMarkDone={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              />
            </div>
            <div className="al-modal-nav">
              <button type="button" className="al-modal-nav-btn" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={safeIndex === 0}>
                <ChevronLeft className="h-3.5 w-3.5" />Anterior
              </button>
              <div className="al-modal-dots">
                {steps.map((step, i) => (
                  <span key={step.id} className={cn("al-modal-dot", i === safeIndex && "al-modal-dot-active", i !== safeIndex && isCompetencyDone(step) && "al-modal-dot-done")} />
                ))}
              </div>
              <button type="button" className="al-modal-nav-btn" onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))} disabled={safeIndex === steps.length - 1}>
                Siguiente<ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="al-modal-step-scroll">
            <EmptyText>No hay aptitudes registradas todavía para este evento o reto.</EmptyText>
          </div>
        )}
        <div className="al-modal-footer">
          <div className="al-modal-footer-row">
            {rutaHref && (
              <Link href={rutaHref} className="al-modal-btn-primary">
                <span>Ver en tu ruta</span>
                <small>Contenido y contexto de este paso</small>
              </Link>
            )}
            {canFavorite && (
              <button type="button" className="al-modal-btn-secondary" onClick={() => actions.toggleFpFavorite(item.id_slug!, !item.is_favorite)}>
                <Bookmark className="h-4 w-4" fill={item.is_favorite ? "currentColor" : "none"} />
                {item.is_favorite ? "Guardado" : "Guardar para después"}
              </button>
            )}
          </div>
          <p className="al-modal-footer-hint">Parte del aprendizaje se queda en AL-LÍO. Tú eliges dónde estudiar.</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

function hackathonHasRutaVideo(item: Hackathon): boolean {
  return (item.requiredCompetencies ?? []).some((competency) =>
    competency.learningItems.some((learningItem) => learningItem.video_url)
  );
}

function isCompetencyDone(competency: RequiredCompetency): boolean {
  return !!competency.completed;
}

function hackathonAptitudeProgress(item: Hackathon): { done: number; total: number } {
  const obligatorias = (item.requiredCompetencies ?? []).filter((c) => c.obligatoria_para_item);
  return { done: obligatorias.filter(isCompetencyDone).length, total: obligatorias.length };
}

function hackPriorityClass(value?: string): string {
  const priority = normalizePriorityText(value);
  if (priority.includes("alta")) return "al-hack-chip-terracotta";
  if (priority.includes("baja")) return "al-hack-chip-green";
  return "al-hack-chip-amber";
}

function CompetencyRequirement({
  competency,
  hackathonSlug,
  actions,
  onMarkDone,
}: {
  competency: RequiredCompetency;
  hackathonSlug?: string;
  actions: ReturnTypeActions;
  onMarkDone?: () => void;
}) {
  const done = isCompetencyDone(competency);
  const videoItem = competency.learningItems.find((li) => li.video_url);
  // At most two external references per competency - reliable and genuinely
  // complementary, not an exhaustive dump of every matched resource.
  const docItems = competency.learningItems.filter((li) => !li.video_url).slice(0, 2);

  function markDone() {
    actions.markCompetencyCompleted(competency.id);
    onMarkDone?.();
  }

  return (
    <div className="al-modal-step-card">
      <div className="al-modal-step-card-head">
        <span className={cn("al-modal-req-check", done ? "al-modal-req-check-done" : "al-modal-req-check-pending")}>
          <Check className="h-3.5 w-3.5" />
        </span>
        <p className="al-modal-req-title">{competency.titulo}</p>
      </div>
      {competency.descripcion && <p className="al-modal-req-desc">{competency.descripcion}</p>}
      {(videoItem || docItems.length > 0) && (
        <div className="al-modal-req-actions">
          {videoItem && hackathonSlug && (
            <Link href={`/ruta/${hackathonSlug}?paso=${competency.id}`} className="al-modal-req-btn al-modal-req-btn-video">
              <Youtube className="h-3 w-3" />
              YouTube en la app
            </Link>
          )}
          {docItems.map((learningItem) => (
            <a key={learningItem.id} href={learningItem.source_url} target="_blank" rel="noreferrer" className="al-modal-req-btn">
              <ExternalLink className="h-3 w-3" />
              {learningItem.title}
            </a>
          ))}
        </div>
      )}
      {done ? (
        <span className="al-modal-mark-done al-modal-mark-done-active">
          <CheckCircle2 className="h-3.5 w-3.5" />Marcado como hecho
        </span>
      ) : (
        <button type="button" className="al-modal-mark-done" onClick={markDone}>
          <Check className="h-3.5 w-3.5" />Marcar como hecho
        </button>
      )}
    </div>
  );
}

function LinksView({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  return (
    <CrudGrid
      form={
        <FieldForm action={(form) => actions.addLink({ name: val(form, "name"), url: val(form, "url"), category: val(form, "category") })}>
          <Input name="name" placeholder="Nombre" required />
          <Input name="url" placeholder="URL" required />
          <Input name="category" placeholder="Categoria" />
          <Button>Guardar</Button>
        </FieldForm>
      }
    >
      {store.links.length ? store.links.map((item) => (
        <Row key={item.id} title={item.name} meta={item.category || "general"} badge="link" actions={<Button asChild size="sm" variant="outline"><a href={item.url} target="_blank" rel="noreferrer">Abrir</a></Button>} />
      )) : <EmptyText>No hay enlaces guardados.</EmptyText>}
    </CrudGrid>
  );
}

function Sources() {
  return (
    <Section title="Fuentes">
      <div className="grid gap-3 md:grid-cols-3">
        {defaultPortals.map((item) => <Card key={item.name} className="p-4"><p className="font-medium">{item.name}</p><Badge className="mt-2">preparada</Badge></Card>)}
      </div>
    </Section>
  );
}

function BlocView() {
  // Legacy localStorage key kept here for startup checks and migration awareness: techlife.bloc.D1OS.v1
  return <BlocNotepad />;
}

function Settings({ reset, addTask }: { reset: () => void; addTask: ReturnTypeActions["addTask"] }) {
  const { settings, updateSettings } = useAppSettings();
  const [seeded, setSeeded] = useState(false);

  function seedDemoData() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const today2h = new Date(now);
    today2h.setHours(now.getHours() + 2);

    addTask({ title: "Revisar correos urgentes", status: "pendiente", priority: "critica", category: "urgente", due_at: toDatetimeLocalValue(yesterday) });
    addTask({ title: "Preparar presentación del proyecto", status: "pendiente", priority: "alta", category: "diario", due_at: toDatetimeLocalValue(today2h) });
    addTask({ title: "Llamar al cliente sobre el presupuesto", status: "pendiente", priority: "alta", category: "diario", due_at: toDatetimeLocalValue(now) });
    addTask({ title: "Subir entrega a la plataforma", status: "pendiente", priority: "alta", category: "semanal", due_at: toDatetimeLocalValue(today2h) });
    addTask({ title: "Revisar PR del compañero", status: "pendiente", priority: "media", category: "pendiente" });
    setSeeded(true);
  }

  return (
    <Section title="Configuración">
      <Card className="p-5 space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nombre mostrado</label>
          <Input
            value={settings.displayName}
            onChange={(e) => updateSettings({ displayName: e.target.value })}
            placeholder="Tu nombre o alias"
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">Nombre que aparece en tu perfil y ajustes.</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Columna por defecto en tareas</label>
          <Select
            value={settings.defaultTaskBucket}
            onChange={(e) => updateSettings({ defaultTaskBucket: e.target.value as TaskBucket })}
            className="max-w-xs"
          >
            {taskBuckets.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">Columna pre-seleccionada al añadir una tarea desde el dashboard.</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Vista compacta de tareas</label>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              role="switch"
              aria-checked={settings.compactTaskView}
              onClick={() => updateSettings({ compactTaskView: !settings.compactTaskView })}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                settings.compactTaskView ? "bg-primary" : "bg-input"
              )}
            >
              <span className={cn(
                "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                settings.compactTaskView ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
            <span className="text-sm text-muted-foreground">{settings.compactTaskView ? "Activada" : "Desactivada"}</span>
          </div>
          <p className="text-xs text-muted-foreground">Muestra las tareas en formato compacto en el dashboard.</p>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium">Datos de prueba</p>
        <p className="mt-1 text-xs text-muted-foreground">Crea tareas urgentes de ejemplo para probar el resumen diario y las alertas.</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={seedDemoData}
          disabled={seeded}
        >
          {seeded ? "Datos añadidos" : "Añadir datos de prueba"}
        </Button>
      </Card>

      <Card className="p-5 border-destructive/40">
        <p className="text-sm font-medium text-destructive">Zona de peligro</p>
        <p className="mt-1 text-xs text-muted-foreground">Elimina todos los datos del store local (tareas, cursos, etc.). Esta acción no se puede deshacer.</p>
        <Button className="mt-4" variant="outline" onClick={reset}>Resetear datos locales</Button>
      </Card>
    </Section>
  );
}


function FieldForm({ children, action }: { children: React.ReactNode; action: (data: FormData) => void }) {
  return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); action(new FormData(event.currentTarget)); event.currentTarget.reset(); }}>{children}</form>;
}

function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  useEffect(() => {
    const raw = localStorage.getItem(appSettingsKey);
    if (raw) {
      const parsed = safeJson(raw);
      if (parsed) setSettings({ ...defaultAppSettings, ...(parsed as Partial<AppSettings>) });
    }
  }, []);
  function updateSettings(patch: Partial<AppSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(appSettingsKey, JSON.stringify(next));
      return next;
    });
  }
  return { settings, updateSettings };
}

function CrudGrid({ form, children }: { form: React.ReactNode; children: React.ReactNode }) {
  return <div className="grid gap-6 lg:grid-cols-[340px_1fr]"><Card className="p-4">{form}</Card><div className="min-w-0 space-y-3">{children}</div></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-5"><h2 className="text-2xl font-semibold tracking-normal">{title}</h2>{children}</div>;
}

function Row({ title, meta, badge, note, details, actions }: { title: string; meta: string; badge: string; note?: string; details?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{title}</p><Badge>{badge}</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
          {note ? <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{note}</p> : null}
          {details ? <div className="mt-3">{details}</div> : null}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </Card>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{children}</div>;
}

function CompanyCard({ company, onToggleFavorite }: { company: Company; onToggleFavorite: () => void }) {
  return (
    <div className="al-work-company-card">
      <div className="al-work-company-top">
        <div className="min-w-0">
          <p className="al-work-company-name">{company.nombre}</p>
          {company.categoria && <p className="al-work-company-category">{company.categoria}</p>}
        </div>
        <button
          type="button"
          className={cn("al-work-company-fav", company.is_favorite && "al-work-company-fav-active")}
          onClick={onToggleFavorite}
          aria-label={company.is_favorite ? "Quitar de favoritos" : "Guardar como favorita"}
          aria-pressed={company.is_favorite}
        >
          <Heart className="h-4 w-4" fill={company.is_favorite ? "currentColor" : "none"} />
        </button>
      </div>
      {company.granada_note && <p className="al-work-company-note">{company.granada_note}</p>}
      {company.web ? (
        <>
          <p className="al-work-company-hint">En su web puedes ver ofertas de empleo y contactar directamente.</p>
          <div className="al-work-company-actions">
            <a href={company.web} target="_blank" rel="noreferrer" className="al-work-company-btn al-work-company-btn-solid">
              Visitar web <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </>
      ) : (
        <p className="al-work-company-hint">Todavía no tenemos web disponible para esta empresa.</p>
      )}
    </div>
  );
}


const techCourseCategories = new Set(["curso"]);
const techHackathonCategories = new Set(["hackathon_reto"]);
const techEventCategories = new Set(["evento_tech", "reto_programacion", "concurso_programacion"]);

function getDisplayCourses(courses: Course[], items: TechOpportunity[], fpItems: FpCatalogItem[] = []) {
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

function getDisplayHackathons(hackathons: Hackathon[], items: TechOpportunity[], fpItems: FpCatalogItem[] = []) {
  const seen = new Set(hackathons.map(hackathonIdentityKey));
  const fromTech = items
    .filter(isTechHackathonOrEvent)
    .map(techOpportunityToHackathon)
    .filter((hackathon) => addUniqueIdentity(seen, hackathonIdentityKey(hackathon)));

  const fromFp = fpItems
    .filter(isFpHackathonLike)
    .map(fpItemToHackathon)
    .filter((hackathon) => addUniqueIdentity(seen, hackathonIdentityKey(hackathon)));

  return [...fromTech, ...fromFp, ...hackathons].sort(sortHackathonsForDisplay);
}

function techOpportunityToCourse(item: TechOpportunity): Course {
  return {
    id: `tech-${item.id_slug}`,
    id_slug: item.id_slug,
    title: item.nombre,
    platform: item.entidad ?? undefined,
    url: item.fuente_url ?? undefined,
    price: item.coste ?? undefined,
    category: item.area_o_tipo ?? item.categoria ?? undefined,
    start_at: item.fecha_inicio ?? "",
    deadline_at: item.fecha_fin ?? "",
    status: normalizeCourseStatus(item.estado),
    entidad: item.entidad ?? undefined,
    area: item.area_o_tipo ?? undefined,
    modalidad: item.modalidad ?? undefined,
    localidad: item.localidad ?? undefined,
    provincia: item.provincia ?? undefined,
    certificacion_tipo: item.certificacion_o_premio ?? undefined,
    practicas_empresa: textLooksPositive(item.practicas_empresa),
    horas_totales: item.horas_totales ?? undefined,
    horas_practicas: item.horas_practicas ?? undefined,
    fecha_inicio: item.fecha_inicio ?? undefined,
    fecha_fin: item.fecha_fin ?? undefined,
    estado: item.estado ?? undefined,
    coste: item.coste ?? undefined,
    requisitos_resumen: item.requisitos_resumen ?? undefined,
    encaje_daw_1_5: item.encaje_daw_1_5 ?? undefined,
    prioridad: item.prioridad ?? undefined,
    tags: item.tags ?? undefined,
    fuente_url: item.fuente_url ?? undefined,
    ultima_revision: item.ultima_revision ?? undefined,
    notes: [item.requisitos_resumen, item.notas].filter(Boolean).join("\n\n") || undefined,
    sourceTable: "tech_opportunities",
    created_at: item.created_at,
  };
}

function techOpportunityToHackathon(item: TechOpportunity): Hackathon {
  return {
    id: `tech-${item.id_slug}`,
    id_slug: item.id_slug,
    categoria: item.categoria ?? undefined,
    name: item.nombre,
    organizer: item.entidad ?? undefined,
    province: item.provincia ?? undefined,
    city: item.localidad ?? undefined,
    type: item.area_o_tipo ?? item.categoria ?? undefined,
    modalidad: item.modalidad ?? undefined,
    localidad: item.localidad ?? undefined,
    status: normalizeHackathonStatus(item.estado),
    priority: normalizeTechPriority(item.prioridad),
    start_at: item.fecha_inicio ?? "",
    end_at: item.fecha_fin ?? "",
    registration_deadline_at: "",
    certificacion_o_premio: item.certificacion_o_premio ?? undefined,
    practicas_empresa: textLooksPositive(item.practicas_empresa),
    encaje_daw_1_5: item.encaje_daw_1_5 ?? undefined,
    tags: item.tags ?? undefined,
    ultima_revision: item.ultima_revision ?? undefined,
    url: item.fuente_url ?? undefined,
    notes: [item.requisitos_resumen, item.notas].filter(Boolean).join("\n\n") || undefined,
    sourceTable: "tech_opportunities",
    created_at: item.created_at,
  };
}

const fpCourseTypes = new Set(["curso_basico", "curso_complementario", "herramienta", "recurso", "evidencia_recomendada"]);
const fpHackathonTypes = new Set(["hackathon", "evento", "reto", "convocatoria_practicas"]);

function isFpCourseLike(item: FpCatalogItem) {
  return fpCourseTypes.has(item.type);
}

function isFpHackathonLike(item: FpCatalogItem) {
  return fpHackathonTypes.has(item.type);
}

function fpItemNotes(item: FpCatalogItem) {
  return [item.suggested_action, item.notes].filter(Boolean).join("\n\n") || undefined;
}

function fpItemToCourse(item: FpCatalogItem): Course {
  return {
    id: `fp-${item.id_slug}`,
    id_slug: item.id_slug,
    title: item.title,
    platform: item.entity ?? undefined,
    url: item.source_url ?? undefined,
    price: item.cost ?? undefined,
    category: item.type,
    start_at: item.start_date ?? "",
    deadline_at: item.end_date ?? "",
    status: fpUserStatusToCourseStatus(item.user_status) ?? normalizeCourseStatus(item.status),
    entidad: item.entity ?? undefined,
    area: item.type,
    modalidad: item.delivery_mode ?? undefined,
    localidad: item.location ?? undefined,
    provincia: item.province ?? undefined,
    certificacion_tipo: item.certification ?? undefined,
    practicas_empresa: item.practices === "si",
    fecha_inicio: item.start_date ?? undefined,
    fecha_fin: item.end_date ?? undefined,
    estado: item.status ?? undefined,
    coste: item.cost ?? undefined,
    requisitos_resumen: item.description ?? undefined,
    prioridad: item.priority,
    tags: item.tags ?? undefined,
    fuente_url: item.source_url ?? undefined,
    notes: fpItemNotes(item),
    sourceTable: "fp_content_items",
    created_at: item.created_at,
  };
}

function fpItemToHackathon(item: FpCatalogItem): Hackathon {
  return {
    id: `fp-${item.id_slug}`,
    id_slug: item.id_slug,
    categoria: item.type,
    name: item.title,
    organizer: item.entity ?? undefined,
    province: item.province ?? undefined,
    city: item.location ?? undefined,
    type: item.type,
    modalidad: item.delivery_mode ?? undefined,
    localidad: item.location ?? undefined,
    status: normalizeHackathonStatus(item.status),
    priority: (item.priority.toLowerCase() as Hackathon["priority"]),
    start_at: item.start_date ?? "",
    end_at: item.end_date ?? "",
    registration_deadline_at: "",
    certificacion_o_premio: item.certification ?? undefined,
    practicas_empresa: item.practices === "si",
    tags: item.tags ?? undefined,
    url: item.source_url ?? undefined,
    notes: fpItemNotes(item),
    sourceTable: "fp_content_items",
    requiredCompetencies: item.requiredCompetencies,
    is_favorite: item.is_favorite ?? false,
    created_at: item.created_at,
  };
}

function fpItemToCalendarEvents(item: FpCatalogItem): CalendarEvent[] {
  const type: CalendarEvent["type"] = isFpCourseLike(item) ? "course" : "hackathon";
  const href = isFpCourseLike(item) ? "/courses" : "/hackathons";
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
  const events = [
    ...store.tasks.filter((task) => task.due_at).map((task) => ({ id: task.id, type: "task" as const, title: task.status === "completada" ? `OK ${task.title}` : task.title, date_at: task.due_at || "", status: task.status, href: "/tasks" })),
    ...store.courses.flatMap((course) => [
      ...(course.fecha_inicio || course.start_at ? [{ id: `${course.id}-start`, type: "course" as const, title: course.title, date_at: course.fecha_inicio || course.start_at || "", status: course.status, href: "/courses" }] : []),
      ...(course.fecha_fin || course.deadline_at ? [{ id: `${course.id}-deadline`, type: "course" as const, title: `Limite ${course.title}`, date_at: course.fecha_fin || course.deadline_at || "", status: course.status, href: "/courses" }] : []),
    ]),
    ...store.hackathons.flatMap((hackathon) => [
      ...(hackathon.start_at ? [{ id: `${hackathon.id}-start`, type: "hackathon" as const, title: hackathon.name, date_at: hackathon.start_at, status: hackathon.status, href: "/hackathons" }] : []),
      ...(hackathon.registration_deadline_at ? [{ id: `${hackathon.id}-deadline`, type: "hackathon" as const, title: `Inscripcion ${hackathon.name}`, date_at: hackathon.registration_deadline_at, status: hackathon.status, href: "/hackathons" }] : []),
    ]),
    ...store.techOpportunities.flatMap(techOpportunityToCalendarEvents),
    ...store.fpContent.flatMap(fpItemToCalendarEvents),
  ];

  return dedupeCalendarEvents(events).sort(sortEvents);
}

function techOpportunityToCalendarEvents(item: TechOpportunity): CalendarEvent[] {
  const type = techCalendarType(item);
  const href = type === "course" ? "/courses" : "/hackathons";
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

function isTechCourse(item: TechOpportunity) {
  const category = techCategory(item);
  return techCourseCategories.has(category);
}

function isTechHackathon(item: TechOpportunity) {
  const category = techCategory(item);
  return techHackathonCategories.has(category) || category.includes("hackathon");
}

function isTechHackathonOrEvent(item: TechOpportunity) {
  const category = techCategory(item);
  return isTechHackathon(item) || techEventCategories.has(category) || category.includes("evento") || category.includes("reto") || category.includes("concurso");
}

function techCategory(item: TechOpportunity) {
  return String(item.categoria || "").trim().toLowerCase();
}

function textLooksPositive(value?: string | null) {
  const normalized = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.startsWith("si") || normalized.includes("beca formativa");
}

function normalizeCourseStatus(value?: string | null): Course["status"] {
  const normalized = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("final") || normalized.includes("termin")) return "terminado";
  if (normalized.includes("paus")) return "pausado";
  if (normalized.includes("descart")) return "descartado";
  if (normalized.includes("curso") || normalized.includes("abiert")) return "empezado";
  return "pendiente";
}

// The per-user fp_user_content_state status (saved/started/completed/dismissed)
// takes priority over the catalogue's own display status once the student has
// actually interacted with the item - "saved" alone isn't a lifecycle verdict,
// so it falls through to the catalogue status like an untouched item would.
function fpUserStatusToCourseStatus(userStatus?: string | null): Course["status"] | undefined {
  if (userStatus === "completed") return "terminado";
  if (userStatus === "dismissed") return "descartado";
  if (userStatus === "started") return "empezado";
  return undefined;
}

function normalizeHackathonStatus(value?: string | null): Hackathon["status"] {
  const normalized = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("final") || normalized.includes("realiz")) return "realizado";
  if (normalized.includes("descart")) return "descartado";
  if (normalized.includes("abiert") || normalized.includes("inscrip")) return "inscripcion_abierta";
  if (normalized.includes("futura")) return "revisar_futura_edicion";
  return "pendiente";
}

function normalizeTechPriority(value?: string | null): Hackathon["priority"] {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("alta")) return "alta";
  if (normalized.includes("baja")) return "baja";
  return "media";
}

function courseIdentityKey(course: Course) {
  return normalizedIdentity(course.fuente_url, course.url, course.id_slug, course.title);
}

function hackathonIdentityKey(hackathon: Hackathon) {
  return normalizedIdentity(hackathon.url, hackathon.id_slug, hackathon.name);
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

function sortHackathonsForDisplay(a: Hackathon, b: Hackathon) {
  const priorityDiff = prioritySortValue(a.priority) - prioritySortValue(b.priority);
  if (priorityDiff) return priorityDiff;
  const dawDiff = (b.encaje_daw_1_5 ?? 0) - (a.encaje_daw_1_5 ?? 0);
  if (dawDiff) return dawDiff;
  return String(a.start_at || a.registration_deadline_at || "9999").localeCompare(String(b.start_at || b.registration_deadline_at || "9999"));
}

function prioritySortValue(value?: string) {
  const normalized = normalizePriorityText(value);
  if (normalized.includes("alta")) return 0;
  if (normalized.includes("media")) return 1;
  if (normalized.includes("baja")) return 2;
  return 9;
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

function safeJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}


function nowIso() {
  return new Date().toISOString();
}

function val(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}


function normalizePriorityText(value?: string) {
  return String(value || "media").trim().toLowerCase();
}

function priorityText(value?: string) {
  const priority = normalizePriorityText(value);
  if (priority.includes("alta")) return "Alta";
  if (priority.includes("baja")) return "Baja";
  return "Media";
}



function toTaskBucket(value?: string): TaskBucket {
  if (value === "log_ia") return "semanal";
  return taskBucketIds.includes(value as TaskBucket) ? value as TaskBucket : "diario";
}

function normalizeTaskPriority(value?: string): TaskPriority {
  return taskPriorities.includes(value as TaskPriority) ? value as TaskPriority : "media";
}

function activeTasks(tasks: Task[]) {
  return tasks.filter((task) => task.status !== "completada" && task.status !== "cancelada");
}

function isCourseArchived(course: Pick<Course, "status">) {
  return course.status === "terminado" || course.status === "descartado";
}

function isHackathonArchived(hackathon: Pick<Hackathon, "status">) {
  return hackathon.status === "realizado" || hackathon.status === "descartado";
}

function isCoursePast(course: Pick<Course, "fecha_fin" | "deadline_at" | "fecha_inicio" | "start_at">) {
  return isPastActionDate(course.fecha_fin || course.deadline_at || course.fecha_inicio || course.start_at);
}

function isHackathonPast(hackathon: Pick<Hackathon, "inscripcion_hasta" | "registration_deadline_at" | "end_at" | "start_at">) {
  return isPastActionDate(hackathon.inscripcion_hasta || hackathon.registration_deadline_at || hackathon.end_at || hackathon.start_at);
}

function isPastActionDate(value?: string | null) {
  const date = parseDate(value ?? undefined);
  return Boolean(date) && startOfDay(date!) < startOfDay(new Date());
}

function sortTasksByPriority(a: Task, b: Task) {
  const priorityOrder: Record<TaskPriority, number> = { critica: 0, alta: 1, media: 2, baja: 3 };
  const priorityDiff = priorityOrder[getTaskPriority(a)] - priorityOrder[getTaskPriority(b)];
  return priorityDiff || sortTasks(a, b);
}

function tasksForBucket(tasks: Task[], bucket: TaskBucket) {
  return activeTasks(tasks).filter((task) => toTaskBucket(task.category) === bucket).sort(sortTasksByPriority);
}

function startOfDayTs(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function completedTasksOn(tasks: Task[], date: Date): Task[] {
  const dayStart = startOfDayTs(date);
  const dayEnd = dayStart + 86400000;
  return tasks.filter((task) => {
    if (task.status !== "completada" || !task.completed_at) return false;
    const ts = new Date(task.completed_at).getTime();
    return Number.isFinite(ts) && ts >= dayStart && ts < dayEnd;
  });
}

function taskStreakDays(tasks: Task[]): number {
  const cursor = new Date();
  // When nothing has been completed today, count from yesterday so opening the
  // application in the morning does not break an active streak immediately.
  if (completedTasksOn(tasks, cursor).length === 0) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (completedTasksOn(tasks, cursor).length > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function last7DaysActivity(tasks: Task[]): { key: string; label: string; count: number; isToday: boolean }[] {
  const labels = ["D", "L", "M", "X", "J", "V", "S"];
  const days: { key: string; label: string; count: number; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: dateKey(d.toISOString()), label: labels[d.getDay()], count: completedTasksOn(tasks, d).length, isToday: i === 0 });
  }
  return days;
}

function completedThisWeek(tasks: Task[]): number {
  const weekStart = startOfDayTs(new Date()) - 6 * 86400000;
  return tasks.filter((task) => {
    if (task.status !== "completada" || !task.completed_at) return false;
    const ts = new Date(task.completed_at).getTime();
    return Number.isFinite(ts) && ts >= weekStart;
  }).length;
}

function todayCompletionRate(tasks: Task[]): { done: number; total: number; pct: number } {
  const done = completedTasksOn(tasks, new Date()).length;
  const pending = tasksForBucket(tasks, "diario").length;
  const total = done + pending;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

function recentTaskActivity(tasks: Task[], limit = 6): Task[] {
  return tasks
    .filter((task) => task.status === "completada" && task.completed_at)
    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
    .slice(0, limit);
}

function getTaskPriority(task: Pick<Task, "priority">): TaskPriority {
  return normalizeTaskPriority(task.priority);
}

function priorityLabel(value: TaskPriority) {
  if (value === "critica") return "Critica";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function priorityClass(value: TaskPriority) {
  if (value === "critica") return "border-red-500/30 bg-red-500/10 text-red-700";
  if (value === "alta") return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  if (value === "media") return "border-blue-500/30 bg-blue-500/10 text-blue-700";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
}

function priorityBarClass(value: TaskPriority) {
  if (value === "critica") return "bg-red-500";
  if (value === "alta") return "bg-amber-500";
  if (value === "media") return "bg-blue-500";
  return "bg-emerald-500";
}

function sortTasks(a: Task, b: Task) {
  return String(a.due_at || "9999").localeCompare(String(b.due_at || "9999"));
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDatetimeLocalValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addDaysKeepingTime(value: string | undefined, days: number) {
  const base = parseDate(value) ?? new Date();
  base.setDate(base.getDate() + days);
  return toDatetimeLocalValue(base);
}

function dateKey(value?: string) {
  const date = parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayKey() {
  return dateKey(nowIso());
}


function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function buildMonthCells(month: Date) {
  const first = startOfMonth(month);
  const leading = (first.getDay() + 6) % 7;
  const start = addDays(first, -leading);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return { date, key: dateKey(date.toISOString()), inMonth: date.getMonth() === month.getMonth() };
  });
}

function formatShortDateTime(value?: string) {
  const date = parseDate(value);
  if (!date) return "sin fecha";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDateLabel(value?: string) {
  if (!value) return "sin fecha";
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(Number(year), Number(month) - 1, Number(day)));
  }
  return formatShortDateTime(value);
}

function formatLongDate(value?: string) {
  const date = parseDate(value);
  if (!date) return "sin fecha";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
