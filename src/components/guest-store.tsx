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
} from "@/components/store/types";

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

const seedHackathons: Hackathon[] = [
  hack("h1", "Ideas Factory UGR", "UGR Emprendedora", "Granada", "Granada", "pendiente", "alta", "2026-10-15T09:00", "2026-10-17T18:00", "2026-10-09T09:00", "https://ideasfactory.es/ugr/", "Preparar idea, demo basica y pitch de 1 minuto."),
  hack("h2", "OpenSouthCode 2026", "OpenSouthCode", "Malaga", "Malaga", "pendiente", "alta", "2026-06-26T09:00", "2026-06-27T18:00", "2026-06-27T09:00", "https://www.opensouthcode.org/conferences/opensouthcode2026", "Networking, software libre, portfolio, GitHub y LinkedIn."),
  hack("h3", "Talent & Job Hackathon UMA", "Universidad de Malaga", "Malaga", "Malaga", "pendiente", "media", "2026-05-05T09:00", "2026-05-05T18:00", "2026-04-26T09:00", "https://talentank.uma.es/talent-and-job/", "Revisar si aceptan participantes externos a UMA."),
  hack("h4", "Aircury Summer of Code", "Aircury", "Granada", "Granada", "revisar_futura_edicion", "alta", "", "", "", "https://granadev.es/summer-of-code.html", "Muy alto encaje DAW. Preguntar por edicion 2026."),
  hack("h5", "GEN AI ARENA by SIDN", "SIDN / GDG Granada", "Granada", "Granada", "realizado", "alta", "2026-04-22T09:00", "2026-04-24T18:00", "", "https://www.arenasidn.com/", "IA, datos, marketing, Google Cloud y prototipado."),
  hack("h6", "Hackathon Granada Salud", "Andalucia Emprende / UGR / AI Granada", "Granada", "Granada", "revisar_futura_edicion", "alta", "2025-10-29T09:00", "2025-10-29T18:00", "", "https://canal.ugr.es/convocatoria/hackathon-andalucia-emprende-granada-salud-2025/", "IA, salud, FP, universidad y reto real."),
  hack("h7", "Hackathon Lactalis Puleva - UGR", "Lactalis Puleva / UGR", "Granada", "Granada", "revisar_futura_edicion", "media", "2025-10-30T09:00", "2025-10-30T18:00", "", "https://incubadoradetalento.es/incubadora-de-talento/programas-especificos-de-capacitacion/hackathon-lactalis-2/", "Negocio, innovacion, pitch y retos reales."),
  hack("h8", "NASA Space Apps Malaga", "NASA Space Apps / 42 Malaga", "Malaga", "Malaga", "revisar_futura_edicion", "alta", "2025-10-03T09:00", "2025-10-05T18:00", "", "https://catedratelefonicauma.es/en/space-apps-challenge-2025/", "Datos abiertos, IA, visualizacion, ciencia y software."),
  hack("h9", "GeneracionFP Megahackathon", "GeneracionFP", "Malaga", "Malaga", "revisar_futura_edicion", "alta", "2025-11-18T09:00", "2025-11-18T18:00", "", "https://www.vidaeconomica.com/2025/10/hackathon-innovacion-social-digital-fp-malaga-2025/", "Muy interesante por estar enfocado a Formacion Profesional."),
  hack("h10", "HackForGood Malaga", "UMA / Catedra Telefonica", "Malaga", "Malaga", "revisar_futura_edicion", "alta", "", "", "", "https://www.uma.es/sala-de-prensa/noticias/la-universidad-de-malaga-se-une-al-hackathon-hackforgood-convocado-por-la-catedra-telefonica/", "Hackathon social y tecnologia para impacto."),
  hack("h11", "42 Malaga", "Fundacion Telefonica", "Malaga", "Malaga", "revisar_futura_edicion", "media", "", "", "", "https://www.42malaga.com/actualidad/", "Revisar retos de programacion, NASA Space Apps y networking."),
  hack("h12", "Reto Cosentino UAL", "Cosentino / Universidad de Almeria", "Almeria", "Almeria", "revisar_futura_edicion", "alta", "2026-03-06T09:00", "2026-03-07T18:00", "", "https://w3.ual.es/retoCosentino/", "Reto empresarial real, mentoria, prototipo y defensa ante jurado."),
  hack("h13", "CIBER OLE Almeria", "CIBER OLE / UAL", "Almeria", "Almeria", "revisar_futura_edicion", "alta", "2025-12-02T09:00", "2025-12-04T18:00", "", "https://ciber-ole.eu/evento-almeria-2025", "Ciberseguridad, emprendimiento e innovacion."),
  hack("h14", "Hackathon UJA CyberChallenge", "Universidad de Jaen", "Jaen", "Jaen", "revisar_futura_edicion", "alta", "2025-04-03T09:00", "2025-04-04T18:00", "", "https://eps.ujaen.es/noticias/hackathon-uja-cyberchallenge", "Ciberseguridad para estudiantes UJA."),
  hack("h15", "Hackathon Ciberseguridad Linares", "Camara de Comercio de Linares / Evolutio", "Jaen", "Linares", "revisar_futura_edicion", "alta", "2026-03-25T09:00", "2026-03-26T18:00", "", "https://cadenaser.com/andalucia/2026/03/25/linares-se-consolida-como-referente-tecnologico-con-el-iii-hackathon-de-ciberseguridad-y-emprendimiento-radio-linares/", "Ciberseguridad y emprendimiento."),
  hack("h16", "Hackathon EMACSA - Define el futuro del agua", "EMACSA / UCO", "Cordoba", "Cordoba", "revisar_futura_edicion", "alta", "2026-04-10T09:00", "2026-04-11T18:00", "2026-03-06T09:00", "https://www.uco.es/servicios/actualidad/noticiasactualidaddia/item/164328-emacsa-concedera-dos-becas-formativas-de-ocho-meses-a-traves-de-su-hackathon-define-el-futuro-del-agua", "Muy alto encaje. FP, universidad, reto real y becas."),
  hack("h17", "Hackathon IA y Agricultura UCO", "Universidad de Cordoba", "Cordoba", "Cordoba", "revisar_futura_edicion", "alta", "2026-03-18T09:00", "2026-03-18T18:00", "", "https://www.uco.es/servicios/actualidad/sociedad/item/164675-la-catedra-internacional-enia-de-la-uco-convoca-un-hackathon-sobre-inteligencia-artificial-y-agricultura", "IA, backend, datos y problema real."),
  hack("h18", "AdaByron Andalucia", "AdaByron / Universidades andaluzas", "Cordoba", "Cordoba", "revisar_futura_edicion", "media", "2026-04-17T09:00", "2026-04-17T18:00", "", "https://ada-byron.es/2026/reg/andalucia/", "Programacion competitiva en equipos de 3."),
  hack("h19", "SalmorejoTech", "SalmorejoTech", "Cordoba", "Cordoba", "pendiente", "media", "", "", "", "https://www.salmorejo.tech/", "Evento tecnologico para comunidad y contactos."),
];

function hack(
  id: string,
  name: string,
  organizer: string,
  province: string,
  city: string,
  status: Hackathon["status"],
  priority: Hackathon["priority"],
  start_at: string,
  end_at: string,
  registration_deadline_at: string,
  url: string,
  notes: string,
): Hackathon {
  return { id, name, organizer, province, city, status, priority, start_at, end_at, registration_deadline_at, url, notes, created_at: "2026-04-25T00:00:00.000Z" };
}

const StoreContext = createContext<StoreContextType | null>(null);

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}

export function StoreProvider({ initialStore, children }: { initialStore: Store; children: ReactNode }) {
  const [store, setStore] = useState<Store>(initialStore || { ...emptyStore, hackathons: seedHackathons });
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
      const previousTask = store.tasks.find((task) => task.id === id);
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
      try {
        const response = await updateDb("tasks", id, dbData, ["/tasks", "/calendar"]);
        if (!response?.result) throw new Error("Task update was not persisted");
      } catch (error) {
        if (previousTask) {
          setStore((current) => ({ ...current, tasks: patchById(current.tasks, id, previousTask) }));
        }
        toast.error("No se pudo actualizar la tarea");
        throw error;
      }
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
    reset: () => setStore({ ...emptyStore, hackathons: seedHackathons }),
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
