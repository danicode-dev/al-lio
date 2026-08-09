"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, ListTodo, MessageSquareText, Plus, X } from "lucide-react";
import type { ReturnTypeActions, Store } from "@/components/guest-app";
import { dashboardLightSurface } from "@/components/dashboard/dashboard-surface";

function isCompleted(status: string) {
  return status === "completada" || status === "cancelada";
}

export function DashboardTodo({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const latestTasks = useMemo(
    () => [...store.tasks].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4),
    [store.tasks],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return;

    actions.addTask({
      title: nextTitle,
      description: notes.trim(),
      due_at: "",
      status: "pendiente",
      priority: "media",
      category: "diario",
    });
    setTitle("");
    setNotes("");
    setComposerOpen(false);
  }

  return (
    <section style={dashboardLightSurface} className="rounded-[20px] border border-[#ece7dc] bg-white p-5 text-[#111111] shadow-[0_10px_26px_rgba(17,17,17,0.045)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf5ff] text-[#2572b9]">
            <ListTodo className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-[#111111]">To-do</h2>
            <p className="mt-0.5 text-xs text-[#777269]">Lo último que has añadido.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setComposerOpen((open) => !open)}
          className="grid h-9 w-9 place-items-center rounded-xl bg-[#f06a37] text-white shadow-[0_8px_18px_rgba(240,106,55,0.24)] transition hover:bg-[#df5725]"
          aria-label={composerOpen ? "Cerrar alta de tarea" : "Añadir tarea"}
        >
          {composerOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      {composerOpen && (
        <form onSubmit={submit} className="mt-4 rounded-xl border border-[#f0d6c9] bg-[#fff9f6] p-3">
          <label className="sr-only" htmlFor="dashboard-task-title">Nueva tarea</label>
          <input
            id="dashboard-task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="¿Qué quieres hacer?"
            autoFocus
            className="h-10 w-full rounded-lg border border-[#e5d7cd] bg-white px-3 text-sm font-medium text-[#25221d] outline-none placeholder:text-[#a59f94] focus:border-[#f06a37] focus:ring-2 focus:ring-[#f06a37]/15"
          />
          <label className="sr-only" htmlFor="dashboard-task-notes">Notas</label>
          <textarea
            id="dashboard-task-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Añade una nota si la necesitas"
            rows={2}
            className="mt-2 w-full resize-none rounded-lg border border-[#e5d7cd] bg-white px-3 py-2 text-sm text-[#333029] outline-none placeholder:text-[#a59f94] focus:border-[#f06a37] focus:ring-2 focus:ring-[#f06a37]/15"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#8e887e]">Se añadirá a Diario.</p>
            <button type="submit" disabled={!title.trim()} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#f06a37] px-3 text-xs font-extrabold text-white transition hover:bg-[#df5725] disabled:cursor-not-allowed disabled:opacity-50">
              Añadir <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 divide-y divide-[#f0ece2] border-y border-[#f0ece2]">
        {latestTasks.length ? latestTasks.map((task) => {
          const done = isCompleted(task.status);
          return (
            <div key={task.id} className="flex items-start gap-3 py-3 first:pt-3 last:pb-3">
              <button
                type="button"
                onClick={() => actions.updateTask(task.id, done ? { status: "pendiente", completed_at: "" } : { status: "completada", completed_at: new Date().toISOString() })}
                className={done ? "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#1f7a4d] text-white" : "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-[#c9c3b6] text-transparent transition hover:border-[#f06a37]"}
                aria-label={done ? `Marcar ${task.title} como pendiente` : `Marcar ${task.title} como completada`}
              >
                {done && <Check className="h-3.5 w-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={done ? "truncate text-sm font-semibold text-[#9a958a] line-through" : "truncate text-sm font-semibold text-[#302d27]"}>{task.title}</p>
                {task.description && (
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[#777269]">
                    <MessageSquareText className="h-3 w-3 shrink-0 text-[#a59f94]" />
                    {task.description}
                  </p>
                )}
              </div>
              {done && <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-[#1f7a4d]">Hecha</span>}
            </div>
          );
        }) : (
          <div className="flex min-h-28 flex-col items-center justify-center px-4 text-center">
            <ListTodo className="h-5 w-5 text-[#b6afa4]" />
            <p className="mt-2 text-sm font-bold text-[#333029]">Empieza con una tarea</p>
            <p className="mt-1 text-xs text-[#777269]">Añade una nota para recordar el contexto.</p>
          </div>
        )}
      </div>

      <Link href="/tasks" className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#e15d2d] transition hover:text-[#c6491d]">
        Ver todas las tareas <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
