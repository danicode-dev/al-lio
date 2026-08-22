"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { toggleCompanyFavoriteAction } from "@/lib/companies/actions";
import { deleteDb, insertDb, updateDb } from "@/lib/db";
import { markResourceStatusAction, toggleFavoriteAction } from "@/lib/fp/resource-notes-actions";
import type {
  Course,
  FpCatalogItem,
  Hackathon,
  ProgressNote,
  QuickLink,
  ReturnTypeActions,
  Store,
  Task,
} from "@/components/guest-app";

type StoreContextType = {
  store: Store;
  actions: ReturnTypeActions;
};

const emptyStore: Store = {
  version: 2,
  tasks: [],
  opportunities: [],
  techOpportunities: [],
  courses: [],
  hackathons: [],
  fpContent: [],
  links: [],
  reminders: [],
  roadmap: null,
  companies: [],
  loadIssues: [],
};

const StoreContext = createContext<StoreContextType | null>(null);

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}

export function StoreProvider({ initialStore, children }: { initialStore: Store; children: ReactNode }) {
  const [store, setStore] = useState<Store>(initialStore || emptyStore);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (initialStore) setStore(initialStore);
  }, [initialStore]);

  const actions: ReturnTypeActions = {
    addTask: async (data: Omit<Task, "id" | "created_at" | "progress_notes"> & { progress_notes?: ProgressNote[] }) => {
      const id = makeId();
      const category = toTaskBucket(data.category);
      const priority = normalizeTaskPriority(data.priority);
      setStore((current) => ({ ...current, tasks: [{ id, created_at: nowIso(), progress_notes: [], ...data, category, priority }, ...current.tasks] }));
      try {
        await insertDb("tasks", {
          id,
          title: data.title,
          description: data.description,
          due_date: data.due_at || null,
          reminder_at: data.reminder_at || null,
          priority: toDbTaskPriority(priority),
          status: data.status,
          category,
        }, ["/tasks", "/calendar"]);
        toast.success("Tarea creada");
      } catch {
        toast.error("Error al crear la tarea");
      }
    },
    updateTask: async (id: string, data: Partial<Task>) => {
      const normalizedData = {
        ...data,
        ...(data.category !== undefined ? { category: toTaskBucket(data.category) } : {}),
        ...(data.priority !== undefined ? { priority: normalizeTaskPriority(data.priority) } : {}),
      };
      setStore((current) => ({ ...current, tasks: patchById(current.tasks, id, normalizedData) }));
      const dbData: Record<string, unknown> = { ...data };
      delete dbData.due_at;
      delete dbData.progress_notes;
      if (data.due_at !== undefined) dbData.due_date = data.due_at || null;
      if (data.reminder_at !== undefined) dbData.reminder_at = data.reminder_at || null;
      if (data.completed_at !== undefined) dbData.completed_at = data.completed_at || null;
      if (data.category !== undefined) dbData.category = toTaskBucket(data.category);
      if (data.priority !== undefined) dbData.priority = toDbTaskPriority(data.priority);
      await updateDb("tasks", id, dbData, ["/tasks", "/calendar"]);
    },
    deleteTask: async (id: string) => {
      setStore((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
      try {
        await deleteDb("tasks", id, ["/tasks", "/calendar"]);
        toast.success("Tarea eliminada");
      } catch {
        toast.error("Error al eliminar la tarea");
      }
    },
    addTaskNote: async (id: string, text: string) => {
      const task = store.tasks.find((item) => item.id === id);
      const newDescription = `${task?.description ? `${task.description}\n\n` : ""}[Nota]: ${text}`;
      setStore((current) => ({
        ...current,
        tasks: current.tasks.map((item) => item.id === id
          ? { ...item, description: newDescription, progress_notes: [{ id: makeId(), text, created_at: nowIso() }, ...(item.progress_notes || [])] }
          : item),
      }));
      await updateDb("tasks", id, { description: newDescription }, ["/tasks"]);
    },
    addCourse: async (data: Omit<Course, "id" | "created_at">) => {
      const id = makeId();
      setStore((current) => ({ ...current, courses: [{ id, created_at: nowIso(), ...data }, ...current.courses] }));
      try {
        await insertDb("courses", { id, title: data.title, platform: data.platform, url: data.url, start_date: data.start_at, deadline: data.deadline_at, status: data.status, notes: data.notes }, ["/courses"]);
        toast.success("Curso añadido");
      } catch {
        toast.error("Error al añadir el curso");
      }
    },
    updateCourse: async (id: string, data: Partial<Course>) => {
      setStore((current) => ({ ...current, courses: patchById(current.courses, id, data) }));
      const { start_at: startAt, deadline_at: deadlineAt, ...rest } = data;
      const dbData: Record<string, unknown> = { ...rest };
      if (startAt !== undefined) dbData.start_date = startAt || null;
      if (deadlineAt !== undefined) dbData.deadline = deadlineAt || null;
      await updateDb("courses", id, dbData, ["/courses"]);
    },
    addHackathon: async (data: Omit<Hackathon, "id" | "created_at">) => {
      const id = makeId();
      setStore((current) => ({ ...current, hackathons: [{ id, created_at: nowIso(), ...data }, ...current.hackathons] }));
      try {
        await insertDb("hackathons", { id, name: data.name, organizer: data.organizer, province: data.province, city: data.city, type: "hackathon", status: data.status || "revisar_futura_edicion", event_start_date: data.start_at, event_end_date: data.end_at, registration_deadline: data.registration_deadline_at, url: data.url, notes: data.notes, priority: data.priority }, ["/hackathons"]);
        toast.success("Evento o reto añadido");
      } catch {
        toast.error("Error al añadir el evento o reto");
      }
    },
    updateHackathon: async (id: string, data: Partial<Hackathon>) => {
      setStore((current) => ({ ...current, hackathons: patchById(current.hackathons, id, data) }));
      const { start_at: startAt, end_at: endAt, registration_deadline_at: registrationDeadlineAt, ...rest } = data;
      const dbData: Record<string, unknown> = { ...rest };
      if (startAt !== undefined) dbData.event_start_date = startAt || null;
      if (endAt !== undefined) dbData.event_end_date = endAt || null;
      if (registrationDeadlineAt !== undefined) dbData.registration_deadline = registrationDeadlineAt || null;
      await updateDb("hackathons", id, dbData, ["/hackathons"]);
    },
    addLink: async (data: Omit<QuickLink, "id" | "created_at">) => {
      const id = makeId();
      setStore((current) => ({ ...current, links: [{ id, created_at: nowIso(), ...data }, ...current.links] }));
      try {
        await insertDb("quick_links", { id, ...data }, ["/links"]);
        toast.success("Enlace guardado");
      } catch {
        toast.error("Error al guardar el enlace");
      }
    },
    toggleFpFavorite: (idSlug: string, nextValue: boolean) => {
      setStore((current) => ({
        ...current,
        fpContent: current.fpContent.map((item) => item.id_slug === idSlug ? { ...item, is_favorite: nextValue } : item),
      }));
      void toggleFavoriteAction(idSlug, nextValue).then((result) => {
        if (!result.error) return;
        setStore((current) => ({
          ...current,
          fpContent: current.fpContent.map((item) => item.id_slug === idSlug ? { ...item, is_favorite: !nextValue } : item),
        }));
        toast.error("No se pudo guardar");
      });
    },
    toggleCompanyFavorite: (companyId: string) => {
      setStore((current) => ({
        ...current,
        companies: current.companies.map((company) => company.id === companyId ? { ...company, is_favorite: !company.is_favorite } : company),
      }));
      void toggleCompanyFavoriteAction(companyId).then((result) => {
        if (!result.error) return;
        setStore((current) => ({
          ...current,
          companies: current.companies.map((company) => company.id === companyId ? { ...company, is_favorite: !company.is_favorite } : company),
        }));
        toast.error("No se pudo guardar el favorito");
      });
    },
    markLearningItemDone: (idSlug: string) => {
      const patchLearningItems = (fpContent: FpCatalogItem[], status: string | null) => fpContent.map((item) => ({
        ...item,
        requiredCompetencies: item.requiredCompetencies?.map((competency) => ({
          ...competency,
          learningItems: competency.learningItems.map((learningItem) => learningItem.id_slug === idSlug ? { ...learningItem, user_status: status } : learningItem),
        })),
      }));
      setStore((current) => ({ ...current, fpContent: patchLearningItems(current.fpContent, "completed") }));
      void markResourceStatusAction(idSlug, "completed").then((result) => {
        if (!result.error) return;
        setStore((current) => ({ ...current, fpContent: patchLearningItems(current.fpContent, null) }));
        toast.error("No se pudo guardar");
      });
    },
    reset: () => setStore(emptyStore),
  };

  return <StoreContext.Provider value={{ store, actions }}>{children}</StoreContext.Provider>;
}

type TaskBucket = "diario" | "urgente" | "semanal";
type TaskPriority = "alta" | "media" | "baja" | "critica";

const taskBuckets: TaskBucket[] = ["diario", "urgente", "semanal"];
const taskPriorities: TaskPriority[] = ["baja", "media", "alta", "critica"];

function patchById<T extends { id: string }>(items: T[], id: string, data: Partial<T>) {
  return items.map((item) => item.id === id ? { ...item, ...data } : item);
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function toTaskBucket(value?: string): TaskBucket {
  if (value === "log_ia") return "semanal";
  return taskBuckets.includes(value as TaskBucket) ? value as TaskBucket : "diario";
}

function normalizeTaskPriority(value?: string): TaskPriority {
  return taskPriorities.includes(value as TaskPriority) ? value as TaskPriority : "media";
}

function toDbTaskPriority(value?: string): "alta" | "media" | "baja" {
  const normalized = normalizeTaskPriority(value);
  return normalized === "critica" ? "alta" : normalized;
}
