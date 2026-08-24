"use client";

import { FormEvent, KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Circle, ListChecks, ListTodo, Pencil, Plus, Trash2, X } from "lucide-react";

import { useStore } from "@/components/guest-store";
import type { Store } from "@/components/store/types";
import { cn } from "@/lib/utils";

type Task = Store["tasks"][number];
type TaskFilter = "pending" | "completed" | "all";

const categoryMeta = {
  diario: { label: "Hoy", color: "bg-sky-50 text-sky-700 border-sky-100" },
  urgente: { label: "Prioritario", color: "bg-amber-50 text-amber-700 border-amber-100" },
  semanal: { label: "Esta semana", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
} as const;

export function TasksView() {
  const { store, actions } = useStore();
  const [filter, setFilter] = useState<TaskFilter>("pending");
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<keyof typeof categoryMeta>("diario");
  const [priority, setPriority] = useState<Task["priority"]>("media");
  const [dueAt, setDueAt] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const counts = useMemo(() => {
    const completed = store.tasks.filter(isCompleted).length;
    return { completed, pending: store.tasks.length - completed, total: store.tasks.length };
  }, [store.tasks]);

  const visibleTasks = useMemo(() => [...store.tasks]
    .filter((task) => filter === "all" || (filter === "completed" ? isCompleted(task) : !isCompleted(task)))
    .sort(sortTasks), [filter, store.tasks]);

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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#e15d2d]">Tu organización</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#111111] sm:text-3xl">Tareas pendientes</h1>
          <p className="mt-1 text-sm text-[#6b6f72]">La misma información del inicio, con todo el detalle para organizarte.</p>
        </div>
        <button type="button" onClick={() => setComposerOpen((open) => !open)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f06a37] px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(240,106,55,0.22)] transition hover:bg-[#df5725]">
          {composerOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {composerOpen ? "Cerrar" : "Nueva tarea"}
        </button>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard icon={ListTodo} value={counts.pending} label="Pendientes" tone="orange" />
        <SummaryCard icon={ListChecks} value={counts.completed} label="Completadas" tone="green" />
        <SummaryCard icon={CalendarDays} value={counts.total} label="Totales" tone="blue" />
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
            <button type="submit" disabled={!title.trim()} className="h-11 self-end rounded-xl bg-[#f06a37] px-5 text-sm font-extrabold text-white transition hover:bg-[#df5725] disabled:cursor-not-allowed disabled:opacity-50">Guardar</button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-[20px] border border-[#ece7dc] bg-white shadow-[0_10px_26px_rgba(17,17,17,0.045)]">
        <div className="flex flex-col gap-3 border-b border-[#f0ece2] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#111111]">Tu lista</h2>
            <p className="mt-0.5 text-xs text-[#777269]">Ordenada por prioridad y fecha.</p>
          </div>
          <div className="flex rounded-xl bg-[#f7f4ee] p-1">
            <FilterButton active={filter === "pending"} onClick={() => setFilter("pending")}>Pendientes</FilterButton>
            <FilterButton active={filter === "completed"} onClick={() => setFilter("completed")}>Hechas</FilterButton>
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Todas</FilterButton>
          </div>
        </div>

        {store.loadIssues?.includes("tasks") ? (
          <EmptyState title="No se pudieron cargar tus tareas" description="Tus datos siguen guardados. Recarga la página para volver a intentarlo." />
        ) : visibleTasks.length === 0 ? (
          <EmptyState title={filter === "completed" ? "Todavía no has completado tareas" : "No tienes tareas pendientes"} description={filter === "completed" ? "Cuando completes una tarea aparecerá aquí." : "Puedes crear una nueva y empezar con algo pequeño."} />
        ) : (
          <div className="divide-y divide-[#f0ece2]">
            {visibleTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => actions.updateTask(task.id, isCompleted(task) ? { status: "pendiente", completed_at: "" } : { status: "completada", completed_at: new Date().toISOString() })} onEdit={() => setEditingTask(task)} onDelete={() => actions.deleteTask(task.id)} />)}
          </div>
        )}
      </section>

      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={async (data) => {
            await actions.updateTask(editingTask.id, data);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const completed = isCompleted(task);
  const category = categoryMeta[task.category as keyof typeof categoryMeta] ?? categoryMeta.diario;
  return (
    <article className="flex items-start gap-3 px-4 py-4 transition hover:bg-[#fdfbf7] sm:px-5">
      <button type="button" onClick={onToggle} className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg transition", completed ? "bg-[#1f7a4d] text-white" : "border-2 border-[#c9c3b6] text-transparent hover:border-[#f06a37]")} aria-label={completed ? `Reabrir ${task.title}` : `Completar ${task.title}`}>
        {completed ? <Check className="h-4 w-4" /> : <Circle className="h-2.5 w-2.5 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={cn("text-sm font-bold text-[#302d27]", completed && "text-[#9a958a] line-through")}>{task.title}</h3>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", category.color)}>{category.label}</span>
          {(task.priority === "alta" || task.priority === "critica") && <span className="rounded-full bg-[#fff0eb] px-2 py-0.5 text-[10px] font-bold text-[#c94f21]">Alta prioridad</span>}
        </div>
        {task.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#777269]">{task.description}</p>}
        {task.due_at && <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#8e887e]"><CalendarDays className="h-3.5 w-3.5" />{formatDate(task.due_at)}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!completed && <button type="button" onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-xl text-[#aaa399] transition hover:bg-[#fff0e9] hover:text-[#e15d2d]" aria-label={`Editar ${task.title}`}><Pencil className="h-4 w-4" /></button>}
        <button type="button" onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-xl text-[#aaa399] transition hover:bg-red-50 hover:text-red-600" aria-label={`Eliminar ${task.title}`}><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  );
}

function EditTaskDialog({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (data: Partial<Task>) => Promise<void> }) {
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

    return () => {
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, []);

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
      <button type="button" aria-label="Cerrar edición" onClick={saving ? undefined : onClose} className="fixed inset-0 z-50 cursor-default bg-black/30 backdrop-blur-[1px]" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={handleDialogKeyDown} className="fixed left-1/2 top-1/2 z-[51] max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[18px] border border-[#e4dfd5] bg-white text-[#111111] shadow-[0_22px_50px_rgba(17,17,17,0.24)]">
        <div className="flex items-center justify-between border-b border-[#f0ece2] px-4 py-3">
          <span id={titleId} className="text-sm font-extrabold">Editar tarea</span>
          <button type="button" onClick={onClose} disabled={saving} className="flex h-7 w-7 items-center justify-center rounded-full text-[#aaa399] transition hover:bg-[#f7f4ee] hover:text-[#333029] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
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
            <button type="submit" disabled={!title.trim() || saving} className="h-10 rounded-xl bg-[#f06a37] px-5 text-sm font-extrabold text-white transition hover:bg-[#df5725] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </div>
    </>
  );
}

function SummaryCard({ icon: Icon, value, label, tone }: { icon: typeof ListTodo; value: number; label: string; tone: "orange" | "green" | "blue" }) {
  const tones = { orange: "bg-[#fbe7dd] text-[#c94f21]", green: "bg-[#e7f5ee] text-[#1f7a4d]", blue: "bg-[#eaf2fb] text-[#2572b9]" };
  return <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#ece7dc] bg-white p-3 shadow-sm sm:p-4"><span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tones[tone])}><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-xl font-extrabold leading-none text-[#111111]">{value}</p><p className="mt-1 truncate text-[10px] font-semibold text-[#6b6f72] sm:text-xs">{label}</p></div></div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("rounded-lg px-2.5 py-1.5 text-xs font-bold transition", active ? "bg-white text-[#e15d2d] shadow-sm" : "text-[#777269] hover:text-[#333029]")}>{children}</button>;
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
