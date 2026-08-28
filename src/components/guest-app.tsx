"use client";

import Image from "next/image";
import Link from "next/link";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare2,
  ChevronDown,
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
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  Trophy,
  X,
  Youtube,
} from "lucide-react";
import { DndContext, useDraggable, useDroppable, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { getNextCatalogItem } from "@/lib/catalog/next-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildJobSearchUrl, jobPlatforms, type JobPlatform } from "@/lib/deeplinks/job-search-urls";
import { SPANISH_PROVINCES } from "@/lib/deeplinks/spanish-provinces";
import { getQuickSearchesAction, saveQuickSearchAction, type SavedQuickSearch } from "@/lib/work/actions";
import { isPreparationComplete, selectFeaturedHackathon } from "@/lib/fp/event-lifecycle";
import { isSafeHttpUrl, selectAptitudeVideos } from "@/lib/fp/event-cta";
import {
  getCoursePresentation,
  isFpCourseLike,
  isTechCourse,
  fpItemToCourse,
  techOpportunityToCourse,
} from "@/lib/courses/course-presentation";
import {
  canToggleHackathonFavorite,
  fpItemToHackathon,
  getHackathonPresentation,
  hackathonPublicDescription,
  isFpHackathonLike,
  isTechHackathonOrEvent,
  techOpportunityToHackathon,
  toggleHackathonFavoriteFor,
} from "@/lib/hackathons/hackathon-presentation";
import { toast } from "sonner";
import { BlocNotepad } from "@/components/bloc/bloc-notepad";
import {
  CalendarView,
  sortCalendarEvents as sortEvents,
  type CalendarEvent,
} from "@/components/calendar/app-calendar";
import { calendarHref } from "@/lib/dashboard/calendar-events";
import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";
import type { JobApplication, ApplicationStatus } from "@/lib/job-radar/types";
import { APPLICATION_STATUSES, STATUS_LABELS, STATUS_COLORS } from "@/lib/job-radar/types";
import { useStore } from "@/components/guest-store";
import { StudentHeaderActions } from "@/components/student-header-actions";
import { PageHeader } from "@/components/page-header";
import {
  CatalogCard,
  CatalogFact,
  CatalogFavoriteButton,
  CatalogFeaturedCard,
  CatalogInfoGrid,
  CatalogNextLink,
  CatalogPanel,
} from "@/components/catalog/catalog-card";
import {
  CollectionControls,
  FilterChips,
  FilterPanelCompact,
} from "@/components/catalog/collection-controls";
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

const VIEW_HEADER_CONTENT: Record<string, { eyebrow: string; title: string; subtitle: string }> = {
  work: { eyebrow: "Empleo y candidaturas", title: "Trabajo", subtitle: "Portales de búsqueda, tus empresas guardadas y el seguimiento de tus candidaturas." },
  tasks: { eyebrow: "Tu organización", title: "Tareas", subtitle: "Todo lo que tienes pendiente, organizado por prioridad." },
  courses: { eyebrow: "Formación", title: "Cursos", subtitle: "Formación complementaria y recursos para avanzar en tu ciclo." },
  hackathons: { eyebrow: "Comunidad", title: "Eventos y retos", subtitle: "Hackathons, retos y convocatorias para poner a prueba lo que sabes." },
  links: { eyebrow: "Recursos", title: "Enlaces", subtitle: "Accesos rápidos guardados." },
  sources: { eyebrow: "Recursos", title: "Fuentes", subtitle: "Portales de referencia para tu búsqueda de empleo." },
  settings: { eyebrow: "Administración", title: "Configuración", subtitle: "Ajustes del panel y datos de demostración." },
  bloc: { eyebrow: "Bloc", title: "Bloc de notas", subtitle: "Escribe, organiza y exporta tus notas a PDF o Word." },
};

export function GuestApp({ view }: { view: View }) {
  const { store, actions } = useStore();
  const headerContent = VIEW_HEADER_CONTENT[view];

  return (
    <div
      className={cn(
        "pb-6",
        view === "bloc" ? "space-y-3 md:space-y-6" : "space-y-6",
        // Same phone-only treatment as the news route: Courses and Events
        // lift their search / filters cluster into the header's empty
        // right-side band (globals.css, .al-catalog-hoist).
        (view === "courses" || view === "hackathons") && "al-catalog-hoist",
      )}
    >
      {view !== "dashboard" && view !== "calendar" && headerContent && (
        <PageHeader
          eyebrow={headerContent.eyebrow}
          title={headerContent.title}
          subtitle={headerContent.subtitle}
          className={view === "bloc" ? "al-bloc-page-header" : undefined}
          actions={
            <div className="hidden md:flex md:items-center md:gap-2">
              <StudentHeaderActions />
            </div>
          }
        />
      )}
      {view === "work" && <Work store={store} actions={actions} />}
      {view === "tasks" && <Tasks store={store} actions={actions} />}
      {view === "courses" && <Courses store={store} actions={actions} />}
      {view === "hackathons" && <Hackathons store={store} actions={actions} />}
      {view === "calendar" && (
        <CalendarView
          events={getCalendarEvents(store)}
          completedTasks={store.tasks}
          headerActions={<StudentHeaderActions />}
          calendarStatus={<GoogleCalendarStatusControl />}
        />
      )}
      {view === "links" && <LinksView store={store} actions={actions} />}
      {view === "sources" && <Sources />}
      {view === "settings" && <Settings reset={actions.reset} addTask={actions.addTask} />}
      {view === "bloc" && <BlocView />}
    </div>
  );
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

// The Google "G" mark - identifies the Calendar integration at a glance,
// replacing the ambiguous four-colour square.
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
  .al-work-tab-active { background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); box-shadow: inset 0 0 0 1px var(--al-action-soft-border), 0 4px 12px rgba(80, 43, 27, 0.05); }

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
  .al-work-portal-search-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; height: 34px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--al-action-soft-border); background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; text-decoration: none; transition: background .15s, border-color .15s, color .15s; }
  .al-work-portal-search-btn:hover { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
  .al-work-portal-search-btn-disabled { opacity: .5; cursor: not-allowed; pointer-events: none; }

  .al-work-province { position: relative; }
  .al-work-province-trigger { width: 100%; height: 32px; display: flex; align-items: center; justify-content: space-between; gap: 6px; border-radius: 8px; border: 1px solid #e4dfd5; background: white; padding: 0 10px; cursor: pointer; font-size: 12px; color: #111111; transition: border-color .15s, box-shadow .15s; }
  .al-work-province-trigger:hover:not(:disabled) { border-color: #d8d1c2; }
  .al-work-province-trigger[aria-expanded="true"] { border-color: rgba(225, 93, 45, 0.5); box-shadow: 0 0 0 3px rgba(225, 93, 45, 0.12); }
  .al-work-province-trigger:disabled { cursor: not-allowed; background: #f5f2ea; color: #9a958a; }
  .al-work-province-value { flex: 1; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .al-work-province-placeholder { color: #a39d8e; }
  .al-work-province-chevron { width: 14px; height: 14px; color: #9a9589; flex-shrink: 0; transition: transform .15s; }
  .al-work-province-trigger[aria-expanded="true"] .al-work-province-chevron { transform: rotate(180deg); }
  .al-work-province-panel { position: absolute; z-index: 20; top: calc(100% + 6px); left: 0; right: 0; background: white; border: 1px solid #ece7dc; border-radius: 12px; box-shadow: 0 16px 40px rgba(17, 17, 17, 0.12); padding: 6px; }
  .al-work-province-filter { width: 100%; height: 30px; border-radius: 7px; border: 1px solid #ece7dc; padding: 0 8px; font-size: 12px; margin-bottom: 4px; }
  .al-work-province-list { list-style: none; margin: 0; padding: 0; max-height: 180px; overflow-y: auto; }
  .al-work-province-option { width: 100%; display: block; text-align: left; padding: 6px 8px; border-radius: 7px; border: none; background: transparent; font-size: 12px; color: #111111; cursor: pointer; }
  .al-work-province-option:hover { background: #f7f4ee; }
  .al-work-province-option-selected { background: #fbe7dd; color: #e15d2d; font-weight: 600; }
  .al-work-province-empty { padding: 8px; font-size: 12px; color: #9a958a; text-align: center; }

  .al-work-remote-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .al-work-remote-switch { position: relative; display: inline-flex; height: 20px; width: 36px; flex-shrink: 0; align-items: center; border-radius: 999px; border: 1px solid transparent; cursor: pointer; background: #e4dfd5; transition: background-color .15s, border-color .15s; }
  .al-work-remote-switch[aria-checked="true"] { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); }
  .al-work-remote-switch-thumb { display: inline-block; height: 14px; width: 14px; border-radius: 999px; background: white; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); transform: translateX(3px); transition: transform .15s; }
  .al-work-remote-switch[aria-checked="true"] .al-work-remote-switch-thumb { background: var(--al-action-soft-text); transform: translateX(17px); }

  .al-work-portal-link-grid { display: grid; gap: 8px; }
  .al-work-portal-link-card { display: flex; align-items: center; gap: 8px; border: 1px solid #ece7dc; border-radius: 12px; background: white; padding: 8px 10px; text-decoration: none; transition: border-color .15s, box-shadow .15s; }
  .al-work-portal-link-card:hover { border-color: rgba(225, 93, 45, 0.35); box-shadow: 0 8px 18px rgba(17, 17, 17, 0.05); }
  .al-work-portal-link-title { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: #333029; }
  .al-work-portal-link-icon { color: #9a958a; flex-shrink: 0; }

  .al-work-companies-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .al-work-company-views { display: inline-flex; align-items: center; gap: 2px; border: 1px solid #ece7dc; border-radius: 11px; background: white; padding: 3px; }
  .al-work-company-view { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 10px; border: none; border-radius: 8px; background: transparent; color: #6b6f72; font-size: 12px; font-weight: 600; cursor: pointer; }
  .al-work-company-view-active { box-shadow: inset 0 0 0 1px var(--al-action-soft-border); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
  .al-work-company-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .al-work-company-card { position: relative; border: 1px solid #ece7dc; border-radius: 16px; background: white; padding: 16px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); display: flex; flex-direction: column; gap: 8px; min-height: 178px; }
  .al-work-company-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .al-work-company-name { font-size: 14.5px; font-weight: 700; color: #111111; line-height: 1.3; }
  .al-work-company-category { font-size: 11.5px; color: #6b6f72; line-height: 1.4; margin-top: 2px; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
  .al-work-company-note { font-size: 11px; color: #9a958a; line-height: 1.45; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
  .al-work-company-hint { font-size: 11px; color: #9a958a; line-height: 1.4; }
  .al-work-company-fav { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 999px; border: 1px solid #ece7dc; background: white; color: #c9c3b6; cursor: pointer; flex-shrink: 0; transition: color .15s, border-color .15s, background .15s; }
  .al-work-company-fav-active { color: var(--al-action-soft-text); border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); }
  .al-work-company-actions { display: flex; gap: 8px; margin-top: auto; padding-top: 6px; }
  .al-work-company-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 34px; border-radius: 10px; font-size: 12px; font-weight: 700; text-decoration: none; cursor: pointer; }
  .al-work-company-btn-solid { border: 1px solid var(--al-action-soft-border); color: var(--al-action-soft-text); background: var(--al-action-soft-bg); transition: background .15s, border-color .15s, color .15s; }
  .al-work-company-btn-solid:hover { border-color: var(--al-action-soft-border-hover); color: var(--al-action-soft-text-hover); background: var(--al-action-soft-bg-hover); }

  .al-work-tab:focus-visible, .al-work-portal-search-btn:focus-visible, .al-work-remote-switch:focus-visible, .al-work-company-view:focus-visible, .al-work-company-fav:focus-visible, .al-work-company-btn:focus-visible { outline: 3px solid var(--al-action-soft-focus); outline-offset: 2px; }

  .al-work-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 16px; text-align: center; border: 1px dashed #e4dfd5; border-radius: 16px; background: white; }
  .al-work-empty-title { font-size: 14px; font-weight: 700; color: #333029; }
  .al-work-empty-desc { font-size: 12px; color: #9a958a; max-width: 360px; }
`;

// Duplicated diacritics-strip pattern (see course-presentation.ts /
// hackathon-presentation.ts for why this is built via String.fromCharCode
// rather than a \u escape) so province type-ahead matches "leon" -> "León".
const WORK_DIACRITICS_PATTERN = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function normalizeForProvinceSearch(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(WORK_DIACRITICS_PATTERN, "");
}

function ProvinceCombobox({
  value,
  onChange,
  disabled,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setFilter("");
    const raf = requestAnimationFrame(() => filterRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const results = useMemo(() => {
    const needle = normalizeForProvinceSearch(filter);
    if (!needle) return SPANISH_PROVINCES;
    return SPANISH_PROVINCES.filter((province) => normalizeForProvinceSearch(province).includes(needle));
  }, [filter]);

  return (
    <div className="al-work-province" ref={containerRef}>
      <button
        type="button"
        className="al-work-province-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={cn("al-work-province-value", (disabled || !value) && "al-work-province-placeholder")}>
          {disabled ? placeholder : value || placeholder}
        </span>
        <ChevronDown className="al-work-province-chevron" aria-hidden="true" />
      </button>
      {open && !disabled && (
        <div className="al-work-province-panel">
          <input
            ref={filterRef}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Buscar provincia..."
            className="al-work-province-filter"
            aria-label="Filtrar provincias"
          />
          <ul className="al-work-province-list" role="listbox" aria-label={ariaLabel}>
            {results.length === 0 && <li className="al-work-province-empty">Sin resultados</li>}
            {results.map((province) => {
              const isSelected = province === value;
              return (
                <li key={province}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn("al-work-province-option", isSelected && "al-work-province-option-selected")}
                    onClick={() => {
                      onChange(province);
                      setOpen(false);
                    }}
                  >
                    {province}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const QuickJobSearchCard = memo(function QuickJobSearchCard({
  platform,
  expanded,
  onToggle,
  saved,
  onSearch,
}: {
  platform: JobPlatform;
  expanded: boolean;
  onToggle: (p: JobPlatform) => void;
  saved?: SavedQuickSearch;
  onSearch: (platform: JobPlatform, keyword: string, location: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("");
  const [remote, setRemote] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || !saved) return;
    hydrated.current = true;
    setQuery(saved.keyword);
    const location = saved.location ?? "";
    if (normalizeForProvinceSearch(location) === "teletrabajo") {
      setRemote(true);
    } else if (location) {
      setProvince(location);
    }
  }, [saved]);

  const effectiveLocation = remote ? "Teletrabajo" : province;
  const url = useMemo(() => buildJobSearchUrl(platform, query, effectiveLocation), [platform, query, effectiveLocation]);
  const canSearch = query.trim().length > 0;

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
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 text-xs" placeholder="Puesto o palabra clave" aria-label={`Busqueda en ${platform}`} />
          </div>
          <div className="al-work-portal-field">
            <span className="al-work-portal-field-label">Provincia</span>
            <ProvinceCombobox
              value={province}
              onChange={setProvince}
              disabled={remote}
              placeholder={remote ? "Teletrabajo" : "Elige provincia"}
              ariaLabel={`Provincia de busqueda en ${platform}`}
            />
          </div>
          <label className="al-work-remote-row">
            <span className="al-work-portal-field-label">Teletrabajo</span>
            <button
              type="button"
              role="switch"
              aria-checked={remote}
              onClick={() => setRemote((current) => !current)}
              className="al-work-remote-switch"
            >
              <span className="al-work-remote-switch-thumb" />
            </button>
          </label>
          <a
            href={canSearch ? url : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!canSearch}
            className={cn("al-work-portal-search-btn", !canSearch && "al-work-portal-search-btn-disabled")}
            onClick={(event) => {
              if (!canSearch) { event.preventDefault(); return; }
              onSearch(platform, query, effectiveLocation);
            }}
          >
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
  "Welcome to the Jungle": "border border-[#e9d6cb] bg-[#fff8f4] text-[#a63f1a]",
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
  const [companyView, setCompanyView] = useState<"all" | "favorites">("all");
  const [savedSearches, setSavedSearches] = useState<Record<string, SavedQuickSearch>>({});
  const [savedSearchesLoaded, setSavedSearchesLoaded] = useState(false);

  // Candidaturas state
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appLoaded, setAppLoaded] = useState(false);
  const [appSyncing, setAppSyncing] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState("");
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ company_name: "", company_url: "", job_title: "", job_url: "" });

  const handleToggleWork = useCallback((p: JobPlatform) => setExpandedPortal((v) => v === p ? null : p), []);

  useEffect(() => {
    if (tab !== "portals" || savedSearchesLoaded) return;
    let cancelled = false;
    getQuickSearchesAction().then((rows) => {
      if (cancelled) return;
      const map: Record<string, SavedQuickSearch> = {};
      for (const row of rows) {
        if (!map[row.platform]) map[row.platform] = row;
      }
      setSavedSearches(map);
      setSavedSearchesLoaded(true);
    });
    return () => { cancelled = true; };
  }, [tab, savedSearchesLoaded]);

  const handlePortalSearch = useCallback((platform: JobPlatform, keyword: string, location: string) => {
    setSavedSearches((prev) => ({ ...prev, [platform]: { platform, keyword, location } }));
    saveQuickSearchAction(platform, keyword, location).catch(() => {});
  }, []);

  const filteredCompanies = useMemo(() => store.companies.filter((company) => {
    if (companyView === "favorites" && !company.is_favorite) return false;
    const haystack = `${company.nombre} ${company.categoria ?? ""}`.toLowerCase();
    return !companySearch || haystack.includes(companySearch.toLowerCase());
  }), [store.companies, companySearch, companyView]);
  const favoriteCompanyCount = store.companies.filter((company) => company.is_favorite).length;

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
      <div className="al-work-tabs" style={{ marginTop: 8 }}>
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
                Estos portales funcionan bien con nuestro buscador. Haz clic, escribe tu puesto y elige tu provincia (o activa teletrabajo) para abrir la búsqueda ya filtrada.
              </p>
            </div>
            <div className="al-work-portal-grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {WORKING_JOB_PLATFORMS.map((platform) => (
                <QuickJobSearchCard
                  key={platform}
                  platform={platform}
                  expanded={expandedPortal === platform}
                  onToggle={handleToggleWork}
                  saved={savedSearches[platform]}
                  onSearch={handlePortalSearch}
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
            <div className="al-work-company-views" role="group" aria-label="Vista de empresas">
              <button type="button" className={cn("al-work-company-view", companyView === "all" && "al-work-company-view-active")} onClick={() => setCompanyView("all")} aria-pressed={companyView === "all"}>
                Todas
              </button>
              <button type="button" className={cn("al-work-company-view", companyView === "favorites" && "al-work-company-view-active")} onClick={() => setCompanyView("favorites")} aria-pressed={companyView === "favorites"}>
                <Heart className="h-3.5 w-3.5" fill={companyView === "favorites" ? "currentColor" : "none"} />
                Favoritas {favoriteCompanyCount}
              </button>
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
          ) : !filteredCompanies.length && companyView === "favorites" && !companySearch ? (
            <div className="al-work-empty">
              <Heart className="h-8 w-8 text-[#E15D2D]/50" />
              <p className="al-work-empty-title">Aún no tienes empresas favoritas</p>
              <p className="al-work-empty-desc">Marca el corazón de una empresa y aparecerá aquí al instante.</p>
            </div>
          ) : !filteredCompanies.length ? (
            <EmptyText>{companyView === "favorites" ? "No hay empresas favoritas con esa búsqueda." : "No hay empresas con esa búsqueda."}</EmptyText>
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
                className={cn("rounded-full border px-3 py-1 text-xs transition-colors", !appStatusFilter ? "al-action-soft-selected" : "hover:bg-muted")}
              >
                Todas
              </button>
              {APPLICATION_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAppStatusFilter((v) => v === s ? "" : s)}
                  className={cn("rounded-full border px-3 py-1 text-xs transition-colors", appStatusFilter === s ? "al-action-soft-selected" : "hover:bg-muted")}
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
  .al-tasks-form-btn-primary { height: 32px; padding: 0 14px; border-radius: 9px; border: 1px solid var(--al-action-soft-border); background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12px; font-weight: 700; cursor: pointer; transition: background .15s, border-color .15s, color .15s; }
  .al-tasks-form-btn-primary:hover { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
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
  .al-tasks-detail-btn-primary { height: 40px; border-radius: 11px; border: 1px solid var(--al-action-soft-border); background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s, border-color .15s, color .15s; }
  .al-tasks-detail-btn-primary:hover { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
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

// A single collapsed row inside FilterPanelCompact: the month grid stays
// hidden until the student opens it, so the panel is short by default.
function FilterDateRow({
  dayFilter,
  datesWithItems,
  onDaySelect,
}: {
  dayFilter: string;
  datesWithItems: Set<string>;
  onDaySelect: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center">
        <button type="button" className="al-fp-date-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <CalendarDays />
          {dayFilter ? formatDateLabel(dayFilter) : "Cualquier fecha"}
          <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
        {dayFilter && (
          <button type="button" className="al-fp-date-clear" onClick={() => onDaySelect("")}>
            Quitar
          </button>
        )}
      </div>
      {open && (
        <div className="al-fp-date-cal">
          <FilterCalendar datesWithItems={datesWithItems} dayFilter={dayFilter} onDaySelect={onDaySelect} />
        </div>
      )}
    </div>
  );
}

function Courses({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const allCourses = useMemo(
    () => getDisplayCourses(store.courses, store.techOpportunities, store.fpContent),
    [store.courses, store.techOpportunities, store.fpContent]
  );

  const [viewTab, setViewTab] = useState<"total" | "empezados" | "proximos" | "guardados">("total");
  const [showFilters, setShowFilters] = useState(false);
  const [monthFilter, setMonthFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [modalidadFilter, setModalidadFilter] = useState("");
  const [prioridadFilter, setPrioridadFilter] = useState("");
  const [soloGratuitos, setSoloGratuitos] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

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

  // The four control-row entries double as the KPI counts and the filter
  // tabs: Total (current courses - not finished, not past), Empezados and
  // Próx. inicio (starts within 30 days) as subsets of it, plus the
  // heart-driven Guardados. "Terminado" is no longer its own tab - it
  // stays reachable through the Estado filter.
  const total = useMemo(() => sorted.filter((c) => !isCourseArchived(c) && !isCoursePast(c)), [sorted]);
  const guardados = useMemo(() => sorted.filter((c) => c.is_favorite), [sorted]);
  const empezados = useMemo(() => total.filter((c) => c.status === "empezado"), [total]);
  const proximos = useMemo(() => {
    const t = todayKey();
    const i30 = dateKey(addDays(new Date(), 30).toISOString());
    return total.filter((c) => {
      const d = (c.fecha_inicio || c.start_at || "").slice(0, 10);
      return d >= t && d <= i30;
    });
  }, [total]);
  const tabBase = useMemo(
    () => viewTab === "empezados" ? empezados : viewTab === "proximos" ? proximos : viewTab === "guardados" ? guardados : total,
    [viewTab, empezados, proximos, guardados, total]
  );

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

  const activeFilterCount = [monthFilter, dayFilter, estadoFilter, modalidadFilter, prioridadFilter, soloGratuitos].filter(Boolean).length;

  // One featured course above the grid: the next one due to start, breaking
  // ties by priority. Only on the untouched Total view - once the student
  // picks another tab, searches or filters, every result is shown flat.
  const showFeatured = viewTab === "total" && !search && activeFilterCount === 0;
  const featuredCourse = useMemo(() => {
    if (!showFeatured) return null;
    const pool = filtered.filter((c) => !isCourseArchived(c) && c.status !== "terminado");
    if (!pool.length) return null;
    const rank = (c: Course) => {
      const p = normalizePriorityText(c.prioridad);
      return p.includes("alta") ? 0 : p.includes("baja") ? 2 : 1;
    };
    const startKey = (c: Course) => (c.fecha_inicio || c.start_at || "").slice(0, 10);
    const today = todayKey();
    // The course that is actually about to happen: the soonest one that has
    // not started yet, ties broken by priority. This is cycle-specific, so
    // every grade features its own next course instead of a shared, already
    // running one winning on an old start date.
    const upcoming = pool
      .filter((c) => startKey(c) >= today)
      .sort((a, b) => (startKey(a) || "9999-12-31").localeCompare(startKey(b) || "9999-12-31") || rank(a) - rank(b));
    if (upcoming.length) return upcoming[0];
    // Nothing on the horizon: the highest-priority active course, most
    // recently started first - still specific to this cycle.
    return [...pool].sort((a, b) => rank(a) - rank(b) || startKey(b).localeCompare(startKey(a)))[0] ?? null;
  }, [showFeatured, filtered]);
  const gridCourses = useMemo(
    () => (featuredCourse ? filtered.filter((c) => c.id !== featuredCourse.id) : filtered),
    [filtered, featuredCourse]
  );

  function clearAll() {
    setMonthFilter(""); setDayFilter(""); setEstadoFilter(""); setModalidadFilter(""); setPrioridadFilter(""); setSoloGratuitos(false); setSearchInput(""); setSearch("");
  }

  return (
    <>
      <style>{`
        .al-course-empty { min-height: 320px; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
        .al-course-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
        .al-course-empty-illustration { width: 100%; max-width: 280px; height: auto; }
        .al-course-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
        .al-course-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
        .al-course-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; border: 1px solid var(--al-action-soft-border); cursor: pointer; }
      `}</style>
      <div className="al-catalog-view space-y-4">
        <div className="al-cc-shell">
          <CollectionControls
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Buscar título, entidad, tag..."
            tabs={[
              { id: "total", label: "Total", count: total.length },
              { id: "empezados", label: "Empezados", count: empezados.length },
              { id: "proximos", label: "Próx. inicio", count: proximos.length },
              { id: "guardados", label: "Guardados", count: guardados.length },
            ]}
            activeTab={viewTab}
            onTabChange={(id) => { setViewTab(id as typeof viewTab); clearAll(); }}
            filterCount={activeFilterCount}
            filtersOpen={showFilters}
            onToggleFilters={() => setShowFilters((v) => !v)}
          />

          {showFilters && (
            <FilterPanelCompact activeCount={activeFilterCount} onClear={clearAll} onClose={() => setShowFilters(false)}>
              <div>
                <p className="al-fp-row-label">Estado</p>
                <FilterChips
                  options={[["", "Todos"], ["pendiente", "Pendiente"], ["empezado", "Activo"], ["terminado", "Terminado"], ["pausado", "Pausado"]]}
                  value={estadoFilter}
                  onChange={setEstadoFilter}
                />
              </div>
              {modalidades.length > 0 && (
                <div>
                  <p className="al-fp-row-label">Modalidad</p>
                  <FilterChips
                    options={[["", "Todas"], ...modalidades.map((m): [string, string] => [m, m])]}
                    value={modalidadFilter}
                    onChange={setModalidadFilter}
                  />
                </div>
              )}
              <div>
                <p className="al-fp-row-label">Prioridad</p>
                <FilterChips
                  options={[["", "Todas"], ["alta", "Alta"], ["media", "Media"], ["baja", "Baja"]]}
                  value={prioridadFilter}
                  onChange={setPrioridadFilter}
                />
              </div>
              <div>
                <p className="al-fp-row-label">Fecha de inicio</p>
                <FilterDateRow
                  dayFilter={dayFilter}
                  datesWithItems={datesWithItems}
                  onDaySelect={(d) => { setDayFilter(d); if (d) setMonthFilter(""); }}
                />
              </div>
              <div>
                <p className="al-fp-row-label">Solo</p>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input type="checkbox" checked={soloGratuitos} onChange={(e) => setSoloGratuitos(e.target.checked)} className="rounded" />
                  Gratuitos
                </label>
              </div>
            </FilterPanelCompact>
          )}
        </div>

        <div className="min-w-0 space-y-4">
            {featuredCourse && (() => {
              const fp = getCoursePresentation(featuredCourse);
              return (
                <CatalogFeaturedCard
                  imageSrc={courseHeroImage(featuredCourse)}
                  tag={<><Flame className="h-3 w-3" />Destacado</>}
                  title={fp.title}
                  subtitle={fp.provider}
                  status={<span className={cn("al-catalog-status", courseStatusPillClass(featuredCourse.status))}>{capitalizeFirst(featuredCourse.status)}</span>}
                  favorite={canToggleCourseFavorite(featuredCourse) ? (
                    <CatalogFavoriteButton
                      active={!!featuredCourse.is_favorite}
                      featured
                      onClick={() => toggleCourseFavoriteFor(featuredCourse, actions)}
                    />
                  ) : undefined}
                  description={fp.description}
                  facts={(
                    <>
                      {fp.startDate && <CatalogFact icon={<CalendarDays />}>{formatDateLabel(fp.startDate)}</CatalogFact>}
                      {fp.modality && <CatalogFact icon={<Building2 />}>{fp.modality}</CatalogFact>}
                      {fp.level && <CatalogFact icon={<Target />}>{fp.level}</CatalogFact>}
                    </>
                  )}
                  detailHref={`/courses/${encodeURIComponent(featuredCourse.id)}`}
                />
              );
            })()}

            {(featuredCourse || gridCourses.length) ? (
              <div className="al-catalog-grid al-catalog-grid-cards">
                {gridCourses.map((item) => {
                  const presentation = getCoursePresentation(item);
                  return (
                    <CatalogCard
                      key={item.id}
                      title={presentation.title}
                      subtitle={presentation.provider}
                      badges={(
                        <>
                          <span className={cn("al-catalog-status", courseStatusPillClass(item.status))}>{capitalizeFirst(item.status)}</span>
                          {canToggleCourseFavorite(item) && (
                            <CatalogFavoriteButton
                              active={!!item.is_favorite}
                              onClick={() => toggleCourseFavoriteFor(item, actions)}
                            />
                          )}
                        </>
                      )}
                      facts={(
                        <>
                          {presentation.startDate && <CatalogFact icon={<CalendarDays />}>{formatDateLabel(presentation.startDate)}</CatalogFact>}
                          {presentation.modality && <CatalogFact icon={<Building2 />}>{presentation.modality}</CatalogFact>}
                          {presentation.level && <CatalogFact icon={<Target />}>{presentation.level}</CatalogFact>}
                        </>
                      )}
                      detailHref={`/courses/${encodeURIComponent(item.id)}`}
                    />
                  );
                })}
              </div>
            ) : viewTab === "guardados" && !search && activeFilterCount === 0 ? (
              <div className="al-course-empty">
                <span className="al-course-empty-icon"><Heart className="h-6 w-6" /></span>
                <p className="al-course-empty-title">No tienes cursos guardados</p>
                <p className="al-course-empty-desc">Toca el corazón de un curso para guardarlo aquí, sin importar su estado o progreso.</p>
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

function courseStatusPillClass(status: Course["status"]): string {
  const classes: Record<Course["status"], string> = {
    pendiente: "al-catalog-status-pending",
    empezado: "al-catalog-status-active",
    terminado: "al-catalog-status-complete",
    pausado: "al-catalog-status-muted",
    descartado: "al-catalog-status-dismissed",
  };
  return classes[status];
}

function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

// Number of banner variants available per professional family under
// /assets/cursos/ (curso-hero-<family>-<1..N>.jpg).
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

// A course keeps one stable banner (hashed from its slug), but two courses
// in the same family almost never share it - so the grid does not look
// repetitive and a re-featured course still carries its own image.
function courseHeroImage(course: Course): string {
  const family = courseHeroFamily(course);
  const key = course.id_slug || course.id || course.title || "x";
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const index = (Math.abs(hash) % COURSE_HERO_POOL[family]) + 1;
  return `/assets/cursos/curso-hero-${family}-${index}.jpg`;
}

// Mirrors canToggleHackathonFavorite/toggleHackathonFavoriteFor exactly -
// tech_opportunities-sourced courses are deliberately excluded for the same
// documented reason (issue #120, see 0008_course_favorites.sql); everything
// else - fp_content_items and the student's own courses rows - can be saved.
export function canToggleCourseFavorite(item: Course): boolean {
  if (item.sourceTable === "tech_opportunities") return false;
  if (item.sourceTable === "fp_content_items") return !!item.id_slug;
  return true;
}

export function toggleCourseFavoriteFor(item: Course, actions: ReturnTypeActions) {
  if (item.sourceTable === "fp_content_items") {
    actions.toggleFpFavorite(item.id_slug!, !item.is_favorite);
  } else {
    actions.toggleCourseFavorite(item.id);
  }
}

// The internal detail surface for Courses, mirroring HackathonDetailView
// (issue #135) exactly: a real route (/courses/[id]) replacing the old
// CourseDetailModal outright - one entry point (Ver detalles), not a page
// link competing with a still-present popup. Resolves the item from the
// live client store by id (same getDisplayCourses pipeline the list uses)
// so favorite/status state always matches the card - it can never show a
// stale or contradictory state. FP catalogue courses also expose the
// reviewed aptitudes they teach or demonstrate; user-created and legacy
// tech courses degrade honestly when no mapping exists.
export function CourseDetailView({ id }: { id: string }) {
  const { store, actions } = useStore();
  const allCourses = useMemo(
    () => getDisplayCourses(store.courses, store.techOpportunities, store.fpContent),
    [store.courses, store.techOpportunities, store.fpContent]
  );
  const item = useMemo(() => allCourses.find((c) => c.id === id) ?? null, [allCourses, id]);

  if (!item) {
    return (
      <div className="space-y-4">
        <style>{`
          .al-course-empty { min-height: 320px; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
          .al-course-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
          .al-course-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
          .al-course-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
          .al-course-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; border: 1px solid var(--al-action-soft-border); cursor: pointer; text-decoration: none; }
        `}</style>
        <PageHeader
          eyebrow="Cursos"
          title="Curso no disponible"
          actions={
            <div className="hidden md:flex md:items-center md:gap-2">
              <StudentHeaderActions />
            </div>
          }
        />
        <div className="al-course-empty">
          <span className="al-course-empty-icon"><BookOpen className="h-6 w-6" /></span>
          <p className="al-course-empty-title">Ya no podemos mostrar este curso</p>
          <p className="al-course-empty-desc">Puede haberse retirado del catálogo o no estar disponible para tu ciclo. Vuelve al listado para ver los cursos activos.</p>
          <Link href="/courses" className="al-course-empty-btn">Volver a Cursos</Link>
        </div>
      </div>
    );
  }

  const presentation = getCoursePresentation(item);
  const canFavorite = canToggleCourseFavorite(item);
  const archived = isCourseArchived(item);
  const aptitudes = item.aptitudes ?? [];

  const learnings = aptitudes.filter((a) => a.relation === "ensena").map((a) => a.titulo).filter(Boolean);
  // requisitos_resumen is a single free-text field; only treat it as a
  // requirements checklist when it is actually delimited into 2+ items,
  // otherwise it is prose already shown under "Sobre el curso".
  const requirements = (presentation.requirements ?? "")
    .split(/\r?\n|·|•|;/)
    .map((s) => s.trim())
    .filter(Boolean);
  const hasRequirementList = requirements.length >= 2;
  const startKey = (presentation.startDate ?? "").slice(0, 10);
  const daysUntil = startKey ? Math.ceil((new Date(`${startKey}T00:00:00`).getTime() - Date.now()) / 86_400_000) : null;
  const nextCourse = getNextCatalogItem(allCourses, item.id);
  const infoRows: Array<[string, string | undefined]> = [
    ["Certificación", presentation.certification],
    ["Modalidad", presentation.modality],
    ["Entidad", presentation.provider],
    ["Duración", presentation.duration],
  ];

  return (
    <div className="space-y-5">
      <Link href="/courses" className="inline-flex items-center gap-1 text-xs font-semibold text-[#6b6f72] transition hover:text-[#c94f21]">
        <ChevronLeft className="h-3.5 w-3.5" />Cursos
      </Link>
      <PageHeader
        eyebrow="Curso"
        title={presentation.title}
        subtitle={presentation.provider}
        actions={
          <div className="hidden md:flex md:items-center md:gap-2">
            <StudentHeaderActions />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <CatalogPanel>
            <div className="al-catalog-hero-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={courseHeroImage(item)} alt="" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn(courseStatusClass(item.status))}>{item.status}</Badge>
              {presentation.priority && <ChipTag className={coursePriorityClass(presentation.priority)}>{priorityText(presentation.priority)}</ChipTag>}
            </div>
            <CatalogInfoGrid items={[
              {
                label: "Fechas",
                value: <>{presentation.startDate ? formatDateLabel(presentation.startDate) : "Sin fecha"}{presentation.endDate ? ` → ${formatDateLabel(presentation.endDate)}` : ""}</>,
              },
              { label: "Ubicación", value: presentation.location || "No especificada" },
              { label: "Modalidad", value: presentation.modality || "No especificada" },
              { label: "Nivel", value: presentation.level || "No especificado" },
              { label: "Duración", value: presentation.duration || "No especificada" },
              { label: "Estado", value: capitalizeFirst(presentation.status) },
            ]} />
          </CatalogPanel>

          <div className="al-catalog-detail-cols">
            <CatalogPanel title="Sobre el curso">
              <p className="whitespace-pre-wrap text-[12.5px] leading-6 text-[#4b4740]">{presentation.description || "Este curso todavía no tiene una descripción disponible."}</p>
            </CatalogPanel>
            <CatalogPanel title="Qué aprenderás">
              {learnings.length ? (
                <ul className="space-y-2">
                  {learnings.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1f7a4d]" />{t}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12.5px] leading-6 text-[#6b6f72]">Los objetivos concretos se publicarán antes del inicio.</p>
              )}
            </CatalogPanel>
            <CatalogPanel title="Requisitos de acceso">
              {hasRequirementList ? (
                <ul className="space-y-2">
                  {requirements.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9a958a]" />{t}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12.5px] leading-6 text-[#6b6f72]">Consulta los requisitos en la convocatoria oficial.</p>
              )}
            </CatalogPanel>
          </div>

          {aptitudes.length > 0 && (
            <CatalogPanel title="Estructura del curso">
              <ol className="space-y-2.5">
                {aptitudes.map((a, i) => (
                  <li key={`${a.id}-${a.relation}`} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fbe7dd] text-[11px] font-bold text-[#c94f21]">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-[#111111]">{a.titulo}</p>
                      {a.descripcion && <p className="mt-0.5 text-[11.5px] leading-5 text-[#6b6f72]">{a.descripcion}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </CatalogPanel>
          )}

          <CatalogPanel title="Información adicional">
            <CatalogInfoGrid items={infoRows.filter(([, value]) => value).map(([label, value]) => ({ label, value }))} />
            {presentation.requirements && <p className="text-[11.5px] leading-5 text-[#777269]"><span className="al-catalog-info-k">Observaciones</span><br />{presentation.requirements}</p>}
          </CatalogPanel>

        </div>

        <div className="space-y-4">
          <CatalogPanel>
            <p className="al-catalog-side-title">Estado del curso</p>
            <Badge className={cn(courseStatusClass(item.status))}>{item.status}</Badge>
            <div>
              <p className="al-catalog-info-k">Próximo hito</p>
              <p className="al-catalog-info-v">{presentation.startDate ? `Inicio · ${formatDateLabel(presentation.startDate)}` : "Fecha por confirmar"}</p>
            </div>
            {typeof daysUntil === "number" && daysUntil >= 0 && (
              <div className="rounded-xl bg-[#e7f5ee] px-3 py-2 text-[12px] font-semibold text-[#1f7a4d]">
                {daysUntil === 0 ? "Empieza hoy" : `Faltan ${daysUntil} ${daysUntil === 1 ? "día" : "días"}`}
              </div>
            )}
            <div className="flex flex-col gap-2 pt-1">
              {isSafeHttpUrl(presentation.sourceUrl) && (
                <a href={presentation.sourceUrl} target="_blank" rel="noopener noreferrer" className="al-catalog-action al-catalog-action-solid">
                  <ExternalLink className="h-3.5 w-3.5" />Abrir curso
                </a>
              )}
              {canFavorite && (
                <button
                  type="button"
                  className={cn("al-catalog-action", item.is_favorite && "al-catalog-action-soft")}
                  aria-pressed={!!item.is_favorite}
                  onClick={() => toggleCourseFavoriteFor(item, actions)}
                >
                  <Heart className="h-3.5 w-3.5" fill={item.is_favorite ? "currentColor" : "none"} />
                  {item.is_favorite ? "Guardado en favoritos" : "Guardar en favoritos"}
                </button>
              )}
              {!archived && (
                <button type="button" className="al-catalog-action" onClick={() => actions.completeCourse(item).catch(() => {})}>
                  <CheckCircle2 className="h-3.5 w-3.5" />Marcar como terminado
                </button>
              )}
            </div>
          </CatalogPanel>

          {nextCourse && (
            <CatalogPanel>
              <p className="al-catalog-side-title">Siguiente curso</p>
              <CatalogNextLink
                href={`/courses/${encodeURIComponent(nextCourse.id)}`}
                title={nextCourse.title}
                meta={(nextCourse.fecha_inicio || nextCourse.start_at)
                  ? `Inicio · ${formatDateLabel((nextCourse.fecha_inicio || nextCourse.start_at)!)}`
                  : nextCourse.entidad || "Ver curso"}
                actionLabel="Ver curso"
              />
            </CatalogPanel>
          )}
        </div>
      </div>
    </div>
  );
}

function Hackathons({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const allHackathons = useMemo(
    () => getDisplayHackathons(store.hackathons, store.techOpportunities, store.fpContent),
    [store.hackathons, store.techOpportunities, store.fpContent]
  );

  const [viewTab, setViewTab] = useState<"total" | "abiertos" | "proximos" | "guardados">("total");
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

  // Mirrors Cursos: the four control-row entries are both the KPI counts
  // and the filter tabs. Total is the current events (not finished, not
  // past); Inscripción abierta and Próx. inicio are subsets of it.
  // "Realizado" is no longer its own tab - it moves to the Estado filter.
  const total = useMemo(() => sorted.filter((h) => !isHackathonArchived(h) && !isHackathonPast(h)), [sorted]);
  // Guardados (issue #131): a heart-driven filter, independent of the
  // lifecycle split above - saving an event never moves it between tabs,
  // so the same event can appear in both Guardados and Total.
  const guardados = useMemo(() => sorted.filter((h) => h.is_favorite), [sorted]);
  const abiertos = useMemo(() => total.filter((h) => h.status === "inscripcion_abierta"), [total]);
  const proximos = useMemo(() => {
    const t = todayKey();
    const i30 = dateKey(addDays(new Date(), 30).toISOString());
    return total.filter((h) => {
      const d = (h.start_at || "").slice(0, 10);
      return d >= t && d <= i30;
    });
  }, [total]);
  const tabBase = useMemo(
    () => viewTab === "abiertos" ? abiertos : viewTab === "proximos" ? proximos : viewTab === "guardados" ? guardados : total,
    [viewTab, abiertos, proximos, guardados, total]
  );


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

  const activeFilterCount = [monthFilter, dayFilter, estadoFilter, provinciaFilter, modalidadFilter, prioridadFilter, soloInscripcionAbierta].filter(Boolean).length;

  function clearAll() {
    setMonthFilter(""); setDayFilter(""); setEstadoFilter(""); setProvinciaFilter(""); setModalidadFilter(""); setPrioridadFilter(""); setSoloInscripcionAbierta(false); setSearchInput(""); setSearch("");
  }

  const showFeatured = viewTab === "total" && !search && activeFilterCount === 0;
  const featuredHackathon = useMemo(
    () => showFeatured ? selectFeaturedHackathon(total) : null,
    [total, showFeatured],
  );
  const gridHackathons = useMemo(
    () => featuredHackathon ? filtered.filter((item) => item.id !== featuredHackathon.id) : filtered,
    [featuredHackathon, filtered],
  );
  const featuredProgress = featuredHackathon ? hackathonAptitudeProgress(featuredHackathon) : null;

  return (
    <>
      <style>{`
        .al-hack-empty-wrap { display: grid; gap: 14px; grid-template-columns: 1fr; }
        @media (min-width: 640px) { .al-hack-empty-wrap.al-hack-empty-two { grid-template-columns: 1fr 1fr; } }
        .al-hack-empty { min-height: 320px; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
        .al-hack-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
        .al-hack-empty-illustration { width: 100%; max-width: 280px; height: auto; }
        .al-hack-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
        .al-hack-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
        .al-hack-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; border: 1px solid var(--al-action-soft-border); cursor: pointer; }
      `}</style>
      <div className="al-catalog-view space-y-4">
        <div className="al-cc-shell">
          <CollectionControls
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Buscar nombre, organizador, tema, aptitud..."
            tabs={[
              { id: "total", label: "Total", count: total.length },
              { id: "abiertos", label: "Inscripción abierta", count: abiertos.length },
              { id: "proximos", label: "Próx. inicio", count: proximos.length },
              { id: "guardados", label: "Guardados", count: guardados.length },
            ]}
            activeTab={viewTab}
            onTabChange={(id) => { setViewTab(id as typeof viewTab); clearAll(); }}
            filterCount={activeFilterCount}
            filtersOpen={showFilters}
            onToggleFilters={() => setShowFilters((v) => !v)}
          />

          {showFilters && (
            <FilterPanelCompact activeCount={activeFilterCount} onClear={clearAll} onClose={() => setShowFilters(false)}>
              <div>
                <p className="al-fp-row-label">Estado</p>
                <FilterChips
                  options={[["", "Todos"], ["pendiente", "Pendiente"], ["inscripcion_abierta", "Activo"], ["realizado", "Realizado"]]}
                  value={estadoFilter}
                  onChange={setEstadoFilter}
                />
              </div>
              {modalidades.length > 0 && (
                <div>
                  <p className="al-fp-row-label">Modalidad</p>
                  <FilterChips
                    options={[["", "Todas"], ...modalidades.map((m): [string, string] => [m, m])]}
                    value={modalidadFilter}
                    onChange={setModalidadFilter}
                  />
                </div>
              )}
              {provincias.length > 0 && (
                <div>
                  <p className="al-fp-row-label">Provincia</p>
                  <FilterChips
                    options={[["", "Todas"], ...provincias.map((p): [string, string] => [p, p])]}
                    value={provinciaFilter}
                    onChange={setProvinciaFilter}
                  />
                </div>
              )}
              <div>
                <p className="al-fp-row-label">Prioridad</p>
                <FilterChips
                  options={[["", "Todas"], ["alta", "Alta"], ["media", "Media"], ["baja", "Baja"]]}
                  value={prioridadFilter}
                  onChange={setPrioridadFilter}
                />
              </div>
              <div>
                <p className="al-fp-row-label">Fecha de inicio</p>
                <FilterDateRow
                  dayFilter={dayFilter}
                  datesWithItems={datesWithItems}
                  onDaySelect={(d) => { setDayFilter(d); if (d) setMonthFilter(""); }}
                />
              </div>
              <div>
                <p className="al-fp-row-label">Solo</p>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input type="checkbox" checked={soloInscripcionAbierta} onChange={(e) => setSoloInscripcionAbierta(e.target.checked)} className="rounded" />
                  Inscripción abierta
                </label>
              </div>
            </FilterPanelCompact>
          )}
        </div>

        <div className="min-w-0 space-y-4">
            {featuredHackathon && (() => {
              const presentation = getHackathonPresentation(featuredHackathon);
              return (
                <CatalogFeaturedCard
                  imageSrc="/assets/hackathons/eventos-hero.svg"
                  tag={<><Flame className="h-3 w-3" />Próximo</>}
                  title={presentation.title}
                  subtitle={presentation.organizer}
                  status={(
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <span className={cn("al-catalog-status", hackathonStatusPillClass(featuredHackathon.status))}>{hackathonStatusLabel(featuredHackathon.status)}</span>
                      {!isHackathonArchived(featuredHackathon) && isPreparationComplete(featuredHackathon) && (
                        <Badge className="al-hack-prep-ready al-hack-chip-green"><CheckCircle2 className="h-3 w-3" />Preparación lista</Badge>
                      )}
                    </div>
                  )}
                  favorite={canToggleHackathonFavorite(featuredHackathon) ? (
                    <CatalogFavoriteButton
                      active={!!featuredHackathon.is_favorite}
                      featured
                      onClick={() => toggleHackathonFavoriteFor(featuredHackathon, actions)}
                    />
                  ) : undefined}
                  description={presentation.description}
                  facts={(
                    <>
                      {presentation.startDate && <CatalogFact icon={<CalendarDays />}>{formatDateLabel(presentation.startDate)}</CatalogFact>}
                      {presentation.location && <CatalogFact icon={<MapPin />}>{presentation.location}</CatalogFact>}
                      {presentation.modality && <CatalogFact icon={<Building2 />}>{presentation.modality}</CatalogFact>}
                      {featuredProgress && featuredProgress.total > 0 && (
                        <CatalogFact icon={<CheckCircle2 />}>{featuredProgress.done}/{featuredProgress.total} aptitudes</CatalogFact>
                      )}
                    </>
                  )}
                  detailHref={`/hackathons/${encodeURIComponent(featuredHackathon.id)}`}
                />
              );
            })()}

            {(featuredHackathon || gridHackathons.length) ? (
              <div className="al-catalog-grid al-catalog-grid-cards">
                {gridHackathons.map((item) => {
                  const presentation = getHackathonPresentation(item);
                  const canFavorite = canToggleHackathonFavorite(item);
                  return (
                    <CatalogCard
                      key={item.id}
                      title={presentation.title}
                      subtitle={presentation.organizer}
                      badges={(
                        <>
                          <span className={cn("al-catalog-status", hackathonStatusPillClass(item.status))}>{hackathonStatusLabel(item.status)}</span>
                          {!isHackathonArchived(item) && isPreparationComplete(item) && (
                            <Badge className="al-hack-prep-ready al-hack-chip-green"><CheckCircle2 className="h-3 w-3" /><span className="sr-only sm:not-sr-only">Preparación lista</span></Badge>
                          )}
                          {canFavorite && (
                            <CatalogFavoriteButton
                              active={!!item.is_favorite}
                              onClick={() => toggleHackathonFavoriteFor(item, actions)}
                            />
                          )}
                        </>
                      )}
                      facts={(
                        <>
                          {presentation.startDate && <CatalogFact icon={<CalendarDays />}>{formatDateLabel(presentation.startDate)}</CatalogFact>}
                          {presentation.location && <CatalogFact icon={<MapPin />}>{presentation.location}</CatalogFact>}
                          {presentation.modality && <CatalogFact icon={<Building2 />}>{presentation.modality}</CatalogFact>}
                          {presentation.priority && <CatalogFact icon={<Target />}>{priorityText(presentation.priority)}</CatalogFact>}
                        </>
                      )}
                      detailHref={`/hackathons/${encodeURIComponent(item.id)}`}
                    />
                  );
                })}
              </div>
            ) : (
              <HackathonsEmptyState variant={search || activeFilterCount > 0 ? "sin_resultados" : viewTab === "total" ? "sin_activos" : "sin_datos"} onClearFilters={clearAll} />
            )}
        </div>
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

function hackathonStatusPillClass(status: Hackathon["status"]): string {
  const classes: Record<Hackathon["status"], string> = {
    inscripcion_abierta: "al-catalog-status-open",
    pendiente: "al-catalog-status-pending",
    realizado: "al-catalog-status-complete",
    revisar_futura_edicion: "al-catalog-status-review",
    descartado: "al-catalog-status-dismissed",
  };
  return classes[status];
}

// A single requirement, fully expanded (title, description, its own
// grounded internal-course links, mark-done action) - not a compact
// checklist row behind a second "see more" button. Folding the old
// step-by-step modal's content directly into the page is issue #135's
// explicit follow-up ask: one entry point (Ver detalles), not two
// competing ones for the same information.
function RequirementRow({ competency, actions }: { competency: RequiredCompetency; actions: ReturnTypeActions }) {
  const done = isCompetencyDone(competency);
  const internalCourses = selectAptitudeVideos(competency.learningItems)
    .flatMap((learningItem) => learningItem.internal_learning_slug
      ? [{ ...learningItem, internal_learning_slug: learningItem.internal_learning_slug }]
      : [])
    .filter((learningItem, index, items) => items.findIndex((candidate) => candidate.internal_learning_slug === learningItem.internal_learning_slug) === index);
  const internalCourseIds = new Set(internalCourses.map((learningItem) => learningItem.id));
  const referenceTitles = [...new Set(
    competency.learningItems
      .filter((learningItem) => !internalCourseIds.has(learningItem.id))
      .map((learningItem) => learningItem.title.trim())
      .filter(Boolean),
  )].slice(0, 2);

  return (
    <div className="rounded-2xl border border-[#ece7dc] p-3.5">
      <div className="flex items-start gap-2.5">
        <span className={cn("al-modal-req-check mt-0.5", done ? "al-modal-req-check-done" : "al-modal-req-check-pending")}>
          <Check className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13.5px] font-bold text-[#111111]">{competency.titulo}</p>
            <span className={cn("al-modal-step-badge", competency.obligatoria_para_item ? "al-modal-step-badge-oblig" : "al-modal-step-badge-reco")}>
              {competency.obligatoria_para_item ? "Imprescindible" : "Recomendada"}
            </span>
          </div>
          {competency.descripcion && <p className="mt-1.5 text-xs leading-5 text-[#4b4740]">{competency.descripcion}</p>}
          <div className="al-modal-req-actions mt-2">
            {internalCourses.map((learningItem) => (
              <Link key={learningItem.id} href={`/aprende/${encodeURIComponent(learningItem.internal_learning_slug)}`} className="al-modal-req-btn al-modal-req-btn-video">
                <Youtube className="h-3 w-3" />{learningItem.title}
              </Link>
            ))}
            {referenceTitles.length > 0 && <EmptyText>Otros recursos: {referenceTitles.join(" · ")}</EmptyText>}
            {internalCourses.length === 0 && referenceTitles.length === 0 && <EmptyText>Sin curso interno disponible todavía.</EmptyText>}
          </div>
          {done ? (
            <span className="al-modal-mark-done al-modal-mark-done-active mt-3">
              <CheckCircle2 className="h-3.5 w-3.5" />Marcado como hecho
            </span>
          ) : (
            <button type="button" className="al-modal-mark-done mt-3" onClick={() => actions.markCompetencyCompleted(competency.id)}>
              <Check className="h-3.5 w-3.5" />Marcar como hecho
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function HackathonDetailView({ id }: { id: string }) {
  const { store, actions } = useStore();
  const allHackathons = useMemo(
    () => getDisplayHackathons(store.hackathons, store.techOpportunities, store.fpContent),
    [store.hackathons, store.techOpportunities, store.fpContent]
  );
  const item = useMemo(() => allHackathons.find((h) => h.id === id) ?? null, [allHackathons, id]);
  const [pendingComplete, setPendingComplete] = useState(false);

  if (!item) {
    return (
      <div className="space-y-4">
        <style>{`
          .al-hack-empty { min-height: 320px; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
          .al-hack-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
          .al-hack-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
          .al-hack-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
          .al-hack-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; border: 1px solid var(--al-action-soft-border); cursor: pointer; text-decoration: none; }
        `}</style>
        <PageHeader
          eyebrow="Eventos y retos"
          title="Evento no disponible"
          actions={
            <div className="hidden md:flex md:items-center md:gap-2">
              <StudentHeaderActions />
            </div>
          }
        />
        <div className="al-hack-empty">
          <span className="al-hack-empty-icon"><Trophy className="h-6 w-6" /></span>
          <p className="al-hack-empty-title">Ya no podemos mostrar este evento</p>
          <p className="al-hack-empty-desc">Puede haberse retirado del catálogo o no estar disponible para tu ciclo. Vuelve al listado para ver los eventos activos.</p>
          <Link href="/hackathons" className="al-hack-empty-btn">Volver a Eventos y retos</Link>
        </div>
      </div>
    );
  }

  const description = hackathonPublicDescription(item);
  const presentation = getHackathonPresentation(item);
  const canFavorite = canToggleHackathonFavorite(item);
  const inscripcionFin = item.inscripcion_hasta || item.registration_deadline_at;
  const requirements = item.requiredCompetencies ?? [];
  const progress = hackathonAptitudeProgress(item);
  const past = isHackathonPast(item);
  const archived = isHackathonArchived(item);
  const requiredSkills = requirements.filter((competency) => competency.obligatoria_para_item);
  const startKey = (presentation.startDate ?? "").slice(0, 10);
  const nextHackathon = (() => {
    const pool = allHackathons
      .filter((candidate) => candidate.id !== item.id && !isHackathonArchived(candidate))
      .map((candidate) => ({ candidate, key: (candidate.start_at || "").slice(0, 10) }))
      .filter(({ key }) => key)
      .sort((a, b) => a.key.localeCompare(b.key));
    return (pool.find(({ key }) => key >= startKey) ?? pool[0])?.candidate ?? null;
  })();

  async function handleComplete(target: Hackathon) {
    if (pendingComplete) return;
    setPendingComplete(true);
    try {
      await actions.completeHackathon(target);
    } catch {
      // Store action already surfaced a toast and rolled back optimistic state.
    } finally {
      setPendingComplete(false);
    }
  }

  return (
    <div className="space-y-5">
      <style>{`
        .al-modal-req-check { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 999px; flex-shrink: 0; }
        .al-modal-req-check-done { background: linear-gradient(180deg, #4C9A6E, #1f7a4d); color: white; }
        .al-modal-req-check-pending { border: 2px solid #e4dfd5; color: transparent; }
        .al-modal-step-badge { display: inline-flex; align-items: center; height: 20px; padding: 0 9px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; flex-shrink: 0; }
        .al-modal-step-badge-oblig { background: #e7f5ee; color: #1f7a4d; }
        .al-modal-step-badge-reco { background: #fdf1dd; color: #b4791f; }
        .al-modal-req-actions { display: flex; flex-wrap: wrap; gap: 6px; }
        .al-modal-req-btn { display: inline-flex; align-items: center; gap: 5px; height: 29px; padding: 0 10px; border-radius: 8px; border: 1px solid #ece7dc; background: white; font-size: 11px; font-weight: 600; color: #333029; text-decoration: none; cursor: pointer; }
        .al-modal-req-btn-video { border-color: rgba(225, 93, 45, 0.3); background: #fbe7dd; color: #c94f21; }
        .al-modal-mark-done { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 9px; border: none; cursor: pointer; font-size: 11.5px; font-weight: 700; background: linear-gradient(180deg, #4C9A6E, #1f7a4d); color: white; }
        .al-modal-mark-done-active { background: #e7f5ee; color: #1f7a4d; cursor: default; }
      `}</style>
      <Link href="/hackathons" className="inline-flex items-center gap-1 text-xs font-semibold text-[#6b6f72] transition hover:text-[#c94f21]">
        <ChevronLeft className="h-3.5 w-3.5" />Eventos y retos
      </Link>
      <PageHeader
        eyebrow={presentation.type || "Evento o reto"}
        title={presentation.title}
        subtitle={presentation.organizer}
        actions={
          <div className="hidden md:flex md:items-center md:gap-2">
            <StudentHeaderActions />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <CatalogPanel>
            <div className="al-catalog-hero-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/hackathons/eventos-hero.svg" alt="" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("al-catalog-status", hackathonStatusPillClass(item.status))}>{hackathonStatusLabel(item.status)}</span>
              {presentation.priority && <ChipTag className={hackPriorityClass(presentation.priority)}>{priorityText(presentation.priority)}</ChipTag>}
              {!archived && isPreparationComplete(item) && (
                <Badge className="al-hack-prep-ready al-hack-chip-green"><CheckCircle2 className="h-3 w-3" />Preparación lista</Badge>
              )}
            </div>
            {past && <p className="rounded-lg bg-[#f3ece1] px-3 py-2 text-xs font-semibold text-[#6b6f72]">Este evento ya ha finalizado.</p>}
            <CatalogInfoGrid items={[
              {
                label: "Fechas",
                value: <>{presentation.startDate ? formatDateLabel(presentation.startDate) : "Sin fecha indicada"}{presentation.endDate ? ` → ${formatDateLabel(presentation.endDate)}` : ""}</>,
              },
              { label: "Ubicación", value: presentation.location || "No especificada" },
              { label: "Modalidad", value: presentation.modality || "No especificada" },
              { label: "Inscripción hasta", value: inscripcionFin ? formatDateLabel(inscripcionFin) : "No especificada" },
              { label: "Prioridad", value: presentation.priority ? priorityText(presentation.priority) : "No especificada" },
              { label: "Estado", value: hackathonStatusLabel(item.status) },
            ]} />
          </CatalogPanel>

          <div className="al-catalog-detail-cols">
            <CatalogPanel title="Sobre el evento o reto">
              <p className="whitespace-pre-wrap text-[12.5px] leading-6 text-[#4b4740]">{description || "Este evento todavía no tiene una descripción disponible."}</p>
            </CatalogPanel>
            <CatalogPanel title="Qué pondrás a prueba">
              {requiredSkills.length ? (
                <ul className="space-y-2">
                  {requiredSkills.slice(0, 4).map((competency) => (
                    <li key={competency.id} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1f7a4d]" />{competency.titulo}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12.5px] leading-6 text-[#6b6f72]">Las aptitudes concretas se publicarán cuando la convocatoria las confirme.</p>
              )}
            </CatalogPanel>
            <CatalogPanel title="Cómo prepararte">
              {requirements.length ? (
                <p className="text-[12.5px] leading-6 text-[#4b4740]">Tienes {requirements.length} {requirements.length === 1 ? "aptitud vinculada" : "aptitudes vinculadas"}. Revisa debajo los cursos y recursos disponibles para cada una.</p>
              ) : (
                <p className="text-[12.5px] leading-6 text-[#6b6f72]">Consulta la convocatoria oficial y vuelve cuando publiquemos una preparación vinculada a tu ciclo.</p>
              )}
            </CatalogPanel>
          </div>

          {requirements.length > 0 && (
            <CatalogPanel title="Recursos para prepararte">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] leading-5 text-[#6b6f72]">Cada aptitud muestra únicamente cursos internos o referencias ya vinculadas en el catálogo.</p>
                {progress.total > 0 && <span className="text-xs font-semibold text-[#9a958a]">{progress.done}/{progress.total} completadas</span>}
              </div>
              <div className="space-y-3">
                {requirements.map((competency) => (
                  <RequirementRow key={competency.id} competency={competency} actions={actions} />
                ))}
              </div>
            </CatalogPanel>
          )}

          <CatalogPanel title="Información adicional">
            <CatalogInfoGrid items={[
              { label: "Tipo", value: presentation.type || "Evento o reto" },
              { label: "Entidad", value: presentation.organizer || "No especificada" },
              { label: "Certificación o premio", value: item.certificacion_o_premio || "No especificado" },
              { label: "Modalidad", value: presentation.modality || "No especificada" },
              { label: "Ubicación", value: presentation.location || "No especificada" },
              { label: "Prioridad", value: presentation.priority ? priorityText(presentation.priority) : "No especificada" },
            ]} />
          </CatalogPanel>
        </div>

        <div className="space-y-4">
          <CatalogPanel>
            <p className="al-catalog-side-title">Estado del evento</p>
            <span className={cn("al-catalog-status w-fit", hackathonStatusPillClass(item.status))}>{hackathonStatusLabel(item.status)}</span>
            <div>
              <p className="al-catalog-info-k">Próximo hito</p>
              <p className="al-catalog-info-v">
                {inscripcionFin
                  ? `Cierre de inscripción · ${formatDateLabel(inscripcionFin)}`
                  : presentation.startDate
                    ? `Inicio · ${formatDateLabel(presentation.startDate)}`
                    : "Fecha por confirmar"}
              </p>
            </div>
            {progress.total > 0 && (
              <div className="rounded-xl bg-[#faf8f4] p-3">
                <div className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-[#4b4740]">
                  <span>Tu preparación</span>
                  <span>{progress.done}/{progress.total}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eee7dc]">
                  <div className="h-full rounded-full bg-[#1f7a4d] transition-[width]" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-1">
              {isSafeHttpUrl(item.url) && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="al-catalog-action al-catalog-action-solid">
                  <ExternalLink className="h-3.5 w-3.5" />Abrir convocatoria oficial
                </a>
              )}
              {canFavorite && (
                <button
                  type="button"
                  className={cn("al-catalog-action", item.is_favorite && "al-catalog-action-soft")}
                  aria-pressed={!!item.is_favorite}
                  onClick={() => toggleHackathonFavoriteFor(item, actions)}
                >
                  <Heart className="h-3.5 w-3.5" fill={item.is_favorite ? "currentColor" : "none"} />
                  {item.is_favorite ? "Guardado en favoritos" : "Guardar en favoritos"}
                </button>
              )}
              <button type="button" className="al-catalog-action" onClick={() => actions.addTask({ title: `Revisar ${item.name}`, due_at: addDaysKeepingTime("", 1), status: "pendiente", priority: "media", description: "Evento o reto" }).catch(() => {})}>
                <Plus className="h-3.5 w-3.5" />Crear tarea
              </button>
              {!archived && item.sourceTable !== "tech_opportunities" && (
                <button type="button" className="al-catalog-action" disabled={pendingComplete} onClick={() => handleComplete(item)}>
                  <CheckCircle2 className="h-3.5 w-3.5" />{pendingComplete ? "Guardando…" : "Realizado"}
                </button>
              )}
            </div>
          </CatalogPanel>

          {nextHackathon && (() => {
            const nextPresentation = getHackathonPresentation(nextHackathon);
            return (
              <CatalogPanel>
                <p className="al-catalog-side-title">Siguiente evento o reto</p>
                <CatalogNextLink
                  href={`/hackathons/${encodeURIComponent(nextHackathon.id)}`}
                  title={nextPresentation.title}
                  meta={nextPresentation.startDate ? `Inicio · ${formatDateLabel(nextPresentation.startDate)}` : nextPresentation.organizer || "Ver evento"}
                  actionLabel="Ver evento"
                />
              </CatalogPanel>
            );
          })()}
        </div>
      </div>
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
                "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                settings.compactTaskView ? "border-[#e19b7c] bg-[#fbe7dd]" : "border-transparent bg-input"
              )}
            >
              <span className={cn(
                "inline-block h-4 w-4 rounded-full shadow transition-all",
                settings.compactTaskView ? "translate-x-6 bg-[#b94720]" : "translate-x-1 bg-white"
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
        <div className="al-work-company-actions">
          <a href={company.web} target="_blank" rel="noreferrer" className="al-work-company-btn al-work-company-btn-solid">
            Visitar web <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <p className="al-work-company-hint">Todavía no tenemos web disponible para esta empresa.</p>
      )}
    </div>
  );
}


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

export function getDisplayHackathons(hackathons: Hackathon[], items: TechOpportunity[], fpItems: FpCatalogItem[] = []) {
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

// Residual "event" tech category has no guaranteed detail route - land on
// the list rather than a 404. course/hackathon always resolve via their
// tech-/fp-/raw id (resolveCourseById / resolveHackathonById).
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
