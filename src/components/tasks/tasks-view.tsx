"use client";

import { FormEvent, KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Check, Circle, ListChecks, ListTodo, Pencil, Plus, Trash2, X } from "lucide-react";

import { useStore } from "@/components/guest-store";
import type { Store } from "@/components/store/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StudentHeaderActions } from "@/components/student-header-actions";

type Task = Store["tasks"][number];
type TaskFilter = "pending" | "completed" | "all";
type TaskDialogMode = "view" | "edit";
type TaskDialogState = { taskId: string; mode: TaskDialogMode };

const categoryMeta = {
  diario: { label: "Hoy", color: "bg-sky-50 text-sky-700 border-sky-100" },
  urgente: { label: "Prioritario", color: "bg-amber-50 text-amber-700 border-amber-100" },
  semanal: { label: "Esta semana", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
} as const;

export function TasksView() {
  const { store, actions } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<TaskFilter>("pending");
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<keyof typeof categoryMeta>("diario");
  const [priority, setPriority] = useState<Task["priority"]>("media");
  const [dueAt, setDueAt] = useState("");
  const [taskDialog, setTaskDialog] = useState<TaskDialogState | null>(null);

  // Deep link from the calendar / alerts: /tasks?task=<id> opens that task
  // in view mode, then the param is dropped so a refresh doesn't reopen it.
  // Wait for the store to load before resolving the id, and consume it once.
  const requestedTaskId = searchParams.get("task");
  const taskParamConsumed = useRef(false);
  useEffect(() => {
    if (!requestedTaskId || taskParamConsumed.current) return;
    const tasksLoaded = store.tasks.length > 0 || store.loadIssues?.includes("tasks");
    if (!tasksLoaded) return;
    taskParamConsumed.current = true;
    const match = store.tasks.find((task) => task.id === requestedTaskId);
    if (match) setTaskDialog({ taskId: match.id, mode: "view" });
    router.replace(pathname, { scroll: false });
  }, [requestedTaskId, store.tasks, store.loadIssues, router, pathname]);

  const counts = useMemo(() => {
    const completed = store.tasks.filter(isCompleted).length;
    return { completed, pending: store.tasks.length - completed, total: store.tasks.length };
  }, [store.tasks]);

  const visibleTasks = useMemo(() => [...store.tasks]
    .filter((task) => filter === "all" || (filter === "completed" ? isCompleted(task) : !isCompleted(task)))
    .sort(sortTasks), [filter, store.tasks]);
  const dialogTask = taskDialog ? store.tasks.find((task) => task.id === taskDialog.taskId) ?? null : null;
  const listDescription = {
    pending: "Pendientes · ordenadas por prioridad y fecha.",
    completed: "Completadas · ordenadas por prioridad y fecha.",
    all: "Todas · pendientes primero, después completadas.",
  }[filter];
  const emptyStateCopy = {
    pending: { title: "No tienes tareas pendientes", description: "Puedes crear una nueva y empezar con algo pequeño." },
    completed: { title: "Todavía no has completado tareas", description: "Cuando completes una tarea aparecerá aquí." },
    all: { title: "Todavía no tienes tareas", description: "Crea tu primera tarea para empezar a organizarte." },
  }[filter];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    actions.addTask({
      title: cleanTitle,
      description: description.trim(),
      due_at: dueAt,
      status: "pendiente",
      priority,
      category,
    }).catch(() => {});
    setTitle("");
    setDescription("");
    setCategory("diario");
    setPriority("media");
    setDueAt("");
    setComposerOpen(false);
    setFilter("pending");
  }

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      <PageHeader
        eyebrow="Tu organización"
        title="Tareas pendientes"
        subtitle="La misma información del inicio, con todo el detalle para organizarte."
        actions={
          <div className="hidden md:flex md:items-center md:gap-2">
            <StudentHeaderActions />
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard icon={ListTodo} value={counts.pending} label="Pendientes" tone="orange" active={filter === "pending"} onClick={() => setFilter("pending")} />
        <SummaryCard icon={ListChecks} value={counts.completed} label="Completadas" tone="green" active={filter === "completed"} onClick={() => setFilter("completed")} />
        <SummaryCard icon={CalendarDays} value={counts.total} label="Totales" tone="blue" active={filter === "all"} onClick={() => setFilter("all")} />
      </div>

      {composerOpen && (
        <form onSubmit={submit} className="rounded-2xl border border-[#f0d6c9] bg-[#fff9f6] p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(180px,.55fr)_minmax(160px,.45fr)]">
            <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required placeholder="¿Qué necesitas hacer?" className="h-11 rounded-xl border border-[#e5d7cd] bg-white px-3 text-sm font-semibold text-[#25221d] outline-none placeholder:font-normal placeholder:text-[#a59f94] focus:border-[#f06a37] focus:ring-2 focus:ring-[#f06a37]/15" />
            <select value={category} onChange={(event) => setCategory(event.target.value as keyof typeof categoryMeta)} className="h-11 rounded-xl border border-[#e5d7cd] bg-white px-3 text-sm text-[#333029] outline-none focus:border-[#f06a37]">
              <option value="diario">Hoy</option>
              <option value="urgente">Prioritario</option>
              <option value="semanal">Esta semana</option>
            </select>
            <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="h-11 rounded-xl border border-[#e5d7cd] bg-white px-3 text-sm text-[#333029] outline-none focus:border-[#f06a37]">
              <option value="baja">Prioridad baja</option>
              <option value="media">Prioridad media</option>
              <option value="alta">Prioridad alta</option>
              <option value="critica">Prioridad crítica</option>
            </select>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px_auto]">
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Contexto o notas (opcional)" className="resize-none rounded-xl border border-[#e5d7cd] bg-white px-3 py-2 text-sm text-[#333029] outline-none placeholder:text-[#a59f94] focus:border-[#f06a37]" />
            <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} aria-label="Fecha de la tarea" className="h-11 rounded-xl border border-[#e5d7cd] bg-white px-3 text-sm text-[#333029] outline-none focus:border-[#f06a37]" />
            <button type="submit" disabled={!title.trim()} className="al-action-soft h-11 self-end rounded-xl px-5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50">Guardar</button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-[20px] border border-[#ece7dc] bg-white shadow-[0_10px_26px_rgba(17,17,17,0.045)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#f0ece2] p-4">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-[#111111]">Tu lista</h2>
            <p className="mt-0.5 text-xs text-[#777269]">{listDescription}</p>
          </div>
          <button type="button" onClick={() => setComposerOpen((open) => !open)} className="al-action-soft inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-extrabold transition">
            {composerOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {composerOpen ? "Cerrar" : "Nueva tarea"}
          </button>
        </div>

        {store.loadIssues?.includes("tasks") ? (
          <EmptyState title="No se pudieron cargar tus tareas" description="Tus datos siguen guardados. Recarga la página para volver a intentarlo." />
        ) : visibleTasks.length === 0 ? (
          <EmptyState title={emptyStateCopy.title} description={emptyStateCopy.description} />
        ) : (
          <div className="divide-y divide-[#f0ece2]">
            {visibleTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => actions.updateTask(task.id, isCompleted(task) ? { status: "pendiente", completed_at: "" } : { status: "completada", completed_at: new Date().toISOString() })} onOpen={() => setTaskDialog({ taskId: task.id, mode: "view" })} onEdit={() => setTaskDialog({ taskId: task.id, mode: "edit" })} onDelete={() => actions.deleteTask(task.id)} />)}
          </div>
        )}
      </section>

      {dialogTask && taskDialog && (
        <TaskDialog
          key={`${dialogTask.id}-${taskDialog.mode}`}
          task={dialogTask}
          initialMode={taskDialog.mode}
          onClose={() => setTaskDialog(null)}
          onSave={async (data) => {
            await actions.updateTask(dialogTask.id, data);
            setTaskDialog(null);
          }}
        />
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onOpen, onEdit, onDelete }: { task: Task; onToggle: () => void; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  const completed = isCompleted(task);
  const category = categoryMeta[task.category as keyof typeof categoryMeta] ?? categoryMeta.diario;
  return (
    <article className="flex items-start gap-3 px-4 py-4 transition hover:bg-[#fdfbf7] sm:px-5">
      <button type="button" onClick={onToggle} className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg transition", completed ? "bg-[#1f7a4d] text-white" : "border-2 border-[#c9c3b6] text-transparent hover:border-[#f06a37]")} aria-label={completed ? `Reabrir ${task.title}` : `Completar ${task.title}`}>
        {completed ? <Check className="h-4 w-4" /> : <Circle className="h-2.5 w-2.5 fill-current" />}
      </button>
      <button type="button" onClick={onOpen} aria-label={`Ver detalles de ${task.title}`} className="min-w-0 flex-1 rounded-lg text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#f06a37]/35 focus-visible:ring-offset-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn("text-sm font-bold text-[#302d27]", completed && "text-[#9a958a] line-through")}>{task.title}</span>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", category.color)}>{category.label}</span>
          {(task.priority === "alta" || task.priority === "critica") && <span className="rounded-full bg-[#fff0eb] px-2 py-0.5 text-[10px] font-bold text-[#c94f21]">Alta prioridad</span>}
        </span>
        {task.description && <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#777269]">{task.description}</span>}
        {task.due_at && <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#8e887e]"><CalendarDays className="h-3.5 w-3.5" />{formatDate(task.due_at)}</span>}
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {!completed && <button type="button" onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-xl text-[#aaa399] transition hover:bg-[#fff0e9] hover:text-[#e15d2d]" aria-label={`Editar ${task.title}`}><Pencil className="h-4 w-4" /></button>}
        <button type="button" onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-xl text-[#aaa399] transition hover:bg-red-50 hover:text-red-600" aria-label={`Eliminar ${task.title}`}><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  );
}

function TaskDialog({ task, initialMode, onClose, onSave }: { task: Task; initialMode: TaskDialogMode; onClose: () => void; onSave: (data: Partial<Task>) => Promise<void> }) {
  const [mode, setMode] = useState<TaskDialogMode>(initialMode);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [category, setCategory] = useState<keyof typeof categoryMeta>(
    (task.category as keyof typeof categoryMeta) in categoryMeta ? (task.category as keyof typeof categoryMeta) : "diario",
  );
  const [priority, setPriority] = useState<Task["priority"]>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_at ? task.due_at.slice(0, 10) : "");
  const [dueTime, setDueTime] = useState(task.due_at?.includes("T") ? task.due_at.slice(11, 16) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (initialMode === "view") dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [initialMode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || saving) return;
    setSaving(true);
    setError("");
    try {
      const dueAt = dueDate ? `${dueDate}${dueTime ? `T${dueTime}` : ""}` : "";
      await onSave({ title: cleanTitle, description: description.trim(), category, priority, due_at: dueAt });
    } catch {
      setError("No se pudo guardar la tarea. Revisa tu conexión e inténtalo de nuevo.");
      setSaving(false);
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !saving) {
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusableElements?.length) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (document.activeElement === dialogRef.current) {
      event.preventDefault();
      (event.shiftKey ? lastElement : firstElement).focus();
      return;
    }
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <>
      <button type="button" aria-label={mode === "edit" ? "Cerrar edición" : "Cerrar detalle"} onClick={saving ? undefined : onClose} className="fixed inset-0 z-50 cursor-default bg-black/30 backdrop-blur-[1px]" />
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={handleDialogKeyDown} className="fixed left-1/2 top-1/2 z-[51] max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[18px] border border-[#e4dfd5] bg-white text-[#111111] shadow-[0_22px_50px_rgba(17,17,17,0.24)] outline-none">
        <div className="flex items-center justify-between border-b border-[#f0ece2] px-4 py-3">
          <span id={titleId} className="text-sm font-extrabold">{mode === "edit" ? "Editar tarea" : "Detalle de la tarea"}</span>
          <button type="button" onClick={onClose} disabled={saving} className="flex h-7 w-7 items-center justify-center rounded-full text-[#aaa399] transition hover:bg-[#f7f4ee] hover:text-[#333029] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        {mode === "view" ? (
          <div className="space-y-4 p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-extrabold", isCompleted(task) ? "bg-[#e7f5ee] text-[#1f7a4d]" : "bg-[#fff0eb] text-[#c94f21]")}>{taskStatusLabel(task.status)}</span>
                <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", (categoryMeta[task.category as keyof typeof categoryMeta] ?? categoryMeta.diario).color)}>{(categoryMeta[task.category as keyof typeof categoryMeta] ?? categoryMeta.diario).label}</span>
                <span className="rounded-full bg-[#f7f4ee] px-2.5 py-1 text-[10px] font-bold text-[#6b6f72]">Prioridad {priorityLabel(task.priority).toLowerCase()}</span>
              </div>
              <p className="mt-3 text-base font-extrabold leading-6 text-[#25221d]">{task.title}</p>
            </div>
            <div className="rounded-xl bg-[#faf8f4] p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#9a958a]">Descripción</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-[#4b4740]">{task.description || "Sin descripción añadida."}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#ece7dc] p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#9a958a]">Fecha y hora</p>
                <p className="mt-1 text-sm font-semibold text-[#333029]">{task.due_at ? formatTaskDue(task.due_at) : "Sin fecha"}</p>
              </div>
              <div className="rounded-xl border border-[#ece7dc] p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#9a958a]">Estado</p>
                <p className="mt-1 text-sm font-semibold text-[#333029]">{taskStatusLabel(task.status)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-[#777269] transition hover:bg-[#f7f4ee]">Cerrar</button>
              <button type="button" onClick={() => setMode("edit")} className="al-action-soft inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-extrabold transition"><Pencil className="h-3.5 w-3.5" />Editar tarea</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 p-4">
            <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required placeholder="¿Qué necesitas hacer?" className="h-11 w-full rounded-xl border border-[#e5d7cd] bg-white px-3 text-sm font-semibold text-[#25221d] outline-none placeholder:font-normal placeholder:text-[#a59f94] focus:border-[#f06a37] focus:ring-2 focus:ring-[#f06a37]/15" />
            <div className="grid grid-cols-2 gap-3">
              <select value={category} onChange={(event) => setCategory(event.target.value as keyof typeof categoryMeta)} className="h-11 rounded-xl border border-[#e5d7cd] bg-white px-3 text-sm text-[#333029] outline-none focus:border-[#f06a37]">
                <option value="diario">Hoy</option>
                <option value="urgente">Prioritario</option>
                <option value="semanal">Esta semana</option>
              </select>
              <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="h-11 rounded-xl border border-[#e5d7cd] bg-white px-3 text-sm text-[#333029] outline-none focus:border-[#f06a37]">
                <option value="baja">Prioridad baja</option>
                <option value="media">Prioridad media</option>
                <option value="alta">Prioridad alta</option>
                <option value="critica">Prioridad crítica</option>
              </select>
            </div>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Contexto o notas (opcional)" className="w-full resize-none rounded-xl border border-[#e5d7cd] bg-white px-3 py-2 text-sm text-[#333029] outline-none placeholder:text-[#a59f94] focus:border-[#f06a37]" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} aria-label="Fecha de la tarea" className="h-11 w-full rounded-xl border border-[#e5d7cd] bg-white px-3 text-sm text-[#333029] outline-none focus:border-[#f06a37]" />
              <input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} disabled={!dueDate} aria-label="Hora de la tarea (opcional)" className="h-11 w-full rounded-xl border border-[#e5d7cd] bg-white px-3 text-sm text-[#333029] outline-none focus:border-[#f06a37] disabled:cursor-not-allowed disabled:bg-[#f7f4ee] disabled:text-[#aaa399]" />
            </div>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-xl px-4 text-sm font-semibold text-[#777269] transition hover:bg-[#f7f4ee] disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={!title.trim() || saving} className="al-action-soft h-10 rounded-xl px-5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function SummaryCard({ icon: Icon, value, label, tone, active, onClick }: { icon: typeof ListTodo; value: number; label: string; tone: "orange" | "green" | "blue"; active: boolean; onClick: () => void }) {
  const tones = { orange: "bg-[#fbe7dd] text-[#c94f21]", green: "bg-[#e7f5ee] text-[#1f7a4d]", blue: "bg-[#eaf2fb] text-[#2572b9]" };
  const activeTones = { orange: "border-[#efb49d] bg-[#fff9f6]", green: "border-[#abd8c1] bg-[#f8fcfa]", blue: "border-[#b7d3ec] bg-[#f8fbfe]" };
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={`Mostrar ${label.toLowerCase()}`} className={cn("flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border p-3 text-center shadow-sm outline-none transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#f06a37]/35 focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:gap-3 sm:p-4 sm:text-left", active ? activeTones[tone] : "border-[#ece7dc] bg-white")}>
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10", tones[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-extrabold leading-none text-[#111111] sm:text-xl">{value}</p>
        <p className="mt-1 text-[11px] font-semibold leading-tight text-[#6b6f72] sm:text-xs">{label}</p>
      </div>
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f7f4ee] text-[#aaa399]"><ListTodo className="h-5 w-5" /></span><p className="mt-3 text-sm font-extrabold text-[#333029]">{title}</p><p className="mt-1 max-w-md text-xs leading-5 text-[#777269]">{description}</p></div>;
}

function isCompleted(task: Task) {
  return task.status === "completada" || task.status === "cancelada";
}

function sortTasks(first: Task, second: Task) {
  if (isCompleted(first) !== isCompleted(second)) return isCompleted(first) ? 1 : -1;
  const priority = { critica: 0, alta: 1, media: 2, baja: 3 };
  const priorityDifference = priority[first.priority] - priority[second.priority];
  if (priorityDifference) return priorityDifference;
  const firstDate = first.due_at || "9999-12-31";
  const secondDate = second.due_at || "9999-12-31";
  return firstDate.localeCompare(secondDate) || second.created_at.localeCompare(first.created_at);
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Fecha pendiente";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatTaskDue(value: string) {
  const time = value.match(/T(\d{2}:\d{2})/)?.[1];
  return `${formatDate(value)}${time ? ` · ${time}` : ""}`;
}

function priorityLabel(priority: Task["priority"]) {
  return { baja: "Baja", media: "Media", alta: "Alta", critica: "Crítica" }[priority];
}

function taskStatusLabel(status: Task["status"]) {
  return { pendiente: "Pendiente", en_progreso: "En progreso", completada: "Completada", pospuesta: "Pospuesta", cancelada: "Cancelada" }[status];
}
