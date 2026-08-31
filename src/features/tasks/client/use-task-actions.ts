"use client";

import { toast } from "sonner";

import type { ProgressNote, Task } from "@/components/store/types";
import {
  appendTaskNoteAction,
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/features/tasks/server/actions";
import { useApplicationStore } from "@/shared/store/application-store";

export type TaskActions = {
  addTask: (data: Omit<Task, "id" | "created_at" | "progress_notes"> & { progress_notes?: ProgressNote[] }) => Promise<string>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskNote: (id: string, text: string) => Promise<void>;
};

type TaskBucket = "diario" | "urgente" | "semanal";
type TaskPriority = "alta" | "media" | "baja" | "critica";

const taskBuckets: TaskBucket[] = ["diario", "urgente", "semanal"];
const taskPriorities: TaskPriority[] = ["baja", "media", "alta", "critica"];

function toTaskBucket(value?: string): TaskBucket {
  if (value === "log_ia") return "semanal";
  return taskBuckets.includes(value as TaskBucket) ? value as TaskBucket : "diario";
}

function normalizeTaskPriority(value?: string): TaskPriority {
  return taskPriorities.includes(value as TaskPriority) ? value as TaskPriority : "media";
}

function patchById(items: Task[], id: string, data: Partial<Task>) {
  return items.map((item) => item.id === id ? { ...item, ...data } : item);
}

function makeId() {
  return crypto.randomUUID();
}

export function useTaskActions(): TaskActions {
  const { store, setStore } = useApplicationStore();

  return {
    addTask: async (data) => {
      const id = makeId();
      const category = toTaskBucket(data.category);
      const priority = normalizeTaskPriority(data.priority);
      setStore((current) => ({
        ...current,
        tasks: [{ id, created_at: new Date().toISOString(), progress_notes: [], ...data, category, priority }, ...current.tasks],
      }));
      try {
        const response = await createTaskAction({
          id,
          title: data.title,
          description: data.description,
          dueAt: data.due_at,
          reminderAt: data.reminder_at,
          priority,
          status: data.status,
          category,
        });
        if (!response.ok) throw new Error(response.error);
        toast.success("Tarea creada");
        return id;
      } catch (error) {
        setStore((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
        toast.error("Error al crear la tarea");
        throw error;
      }
    },
    updateTask: async (id, data) => {
      const previousTask = store.tasks.find((task) => task.id === id);
      const normalizedData = {
        ...data,
        ...(data.category !== undefined ? { category: toTaskBucket(data.category) } : {}),
        ...(data.priority !== undefined ? { priority: normalizeTaskPriority(data.priority) } : {}),
      };
      setStore((current) => ({ ...current, tasks: patchById(current.tasks, id, normalizedData) }));
      try {
        const response = await updateTaskAction({
          id,
          patch: {
            ...(data.title !== undefined ? { title: data.title } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.due_at !== undefined ? { dueAt: data.due_at } : {}),
            ...(data.reminder_at !== undefined ? { reminderAt: data.reminder_at } : {}),
            ...(data.completed_at !== undefined ? { completedAt: data.completed_at } : {}),
            ...(data.category !== undefined ? { category: toTaskBucket(data.category) } : {}),
            ...(data.priority !== undefined ? { priority: normalizeTaskPriority(data.priority) } : {}),
            ...(data.status !== undefined ? { status: data.status } : {}),
          },
        });
        if (!response.ok) throw new Error(response.error);
      } catch (error) {
        if (previousTask) setStore((current) => ({ ...current, tasks: patchById(current.tasks, id, previousTask) }));
        toast.error("No se pudo actualizar la tarea");
        throw error;
      }
    },
    deleteTask: async (id) => {
      const previousTask = store.tasks.find((task) => task.id === id);
      setStore((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
      try {
        const response = await deleteTaskAction(id);
        if (!response.ok) throw new Error(response.error);
        toast.success("Tarea eliminada");
      } catch (error) {
        if (previousTask) setStore((current) => ({ ...current, tasks: [previousTask, ...current.tasks] }));
        toast.error("Error al eliminar la tarea");
        throw error;
      }
    },
    addTaskNote: async (id, text) => {
      const previousTask = store.tasks.find((item) => item.id === id);
      const description = `${previousTask?.description ? `${previousTask.description}\n\n` : ""}[Nota]: ${text}`;
      setStore((current) => ({
        ...current,
        tasks: current.tasks.map((item) => item.id === id
          ? { ...item, description, progress_notes: [{ id: makeId(), text, created_at: new Date().toISOString() }, ...(item.progress_notes || [])] }
          : item),
      }));
      try {
        const response = await appendTaskNoteAction({ id, text });
        if (!response.ok) throw new Error(response.error);
      } catch (error) {
        if (previousTask) setStore((current) => ({ ...current, tasks: patchById(current.tasks, id, previousTask) }));
        toast.error("No se pudo guardar la nota");
        throw error;
      }
    },
  };
}
