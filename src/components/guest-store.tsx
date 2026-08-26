"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { toggleCompanyFavoriteAction } from "@/lib/companies/actions";
import { toggleHackathonFavoriteAction } from "@/lib/hackathons/actions";
import { deleteDb, insertDb, updateDb } from "@/lib/db";
import { markCompetencyCompletedAction } from "@/lib/fp/competency-actions";
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
        const response = await insertDb("tasks", {
          id,
          title: data.title,
          description: data.description || null,
          due_date: data.due_at || null,
          reminder_at: data.reminder_at || null,
          priority: toDbTaskPriority(priority),
          status: data.status,
          category,
        }, ["/tasks", "/calendar", "/dashboard"]);
        if (!response?.result) throw new Error("Task was not persisted");
        toast.success("Tarea creada");
      } catch (error) {
        setStore((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
        toast.error("Error al crear la tarea");
        throw error;
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
        const response = await insertDb("courses", {
          id,
          title: data.title,
          platform: data.platform || null,
          url: data.url || null,
          start_date: data.start_at || null,
          deadline: data.deadline_at || null,
          status: data.status,
          notes: data.notes || null,
        }, ["/courses", "/dashboard"]);
        if (!response?.result) throw new Error("Course was not persisted");
        toast.success("Curso añadido");
      } catch (error) {
        setStore((current) => ({ ...current, courses: current.courses.filter((course) => course.id !== id) }));
        toast.error("Error al añadir el curso");
        throw error;
      }
    },
    updateCourse: async (id: string, data: Partial<Course>) => {
      const previousCourse = store.courses.find((course) => course.id === id);
      setStore((current) => ({ ...current, courses: patchById(current.courses, id, data) }));
      const { start_at: startAt, deadline_at: deadlineAt, ...rest } = data;
      const dbData: Record<string, unknown> = { ...rest };
      if (startAt !== undefined) dbData.start_date = startAt || null;
      if (deadlineAt !== undefined) dbData.deadline = deadlineAt || null;
      try {
        const response = await updateDb("courses", id, dbData, ["/courses", "/dashboard"]);
        if (!response?.result) throw new Error("Course update was not persisted");
      } catch (error) {
        if (previousCourse) {
          setStore((current) => ({ ...current, courses: patchById(current.courses, id, previousCourse) }));
        }
        toast.error("No se pudo actualizar el curso");
        throw error;
      }
    },
    completeCourse: async (course: Course) => {
      if (course.sourceTable === "fp_content_items") {
        const idSlug = course.id_slug;
        if (!idSlug) {
          toast.error("No se pudo completar el curso");
          throw new Error("Missing id_slug for fp course completion");
        }
        const completedAt = nowIso();
        setStore((current) => ({
          ...current,
          fpContent: current.fpContent.map((item) => item.id_slug === idSlug ? { ...item, user_status: "completed", user_completed_at: completedAt } : item),
        }));
        try {
          const result = await markResourceStatusAction(idSlug, "completed");
          if (result.error) throw new Error(result.error);
          toast.success("Curso completado");
        } catch (error) {
          setStore((current) => ({
            ...current,
            fpContent: current.fpContent.map((item) => item.id_slug === idSlug ? { ...item, user_status: null, user_completed_at: null } : item),
          }));
          toast.error("No se pudo completar el curso");
          throw error;
        }
        return;
      }

      if (course.sourceTable === "tech_opportunities") {
        const idSlug = course.id_slug;
        const existing = idSlug ? store.courses.find((c) => c.id_slug === idSlug) : undefined;

        if (existing) {
          setStore((current) => ({ ...current, courses: patchById(current.courses, existing.id, { status: "terminado" }) }));
          try {
            const response = await updateDb("courses", existing.id, { status: "terminado" }, ["/courses", "/dashboard"]);
            if (!response?.result) throw new Error("Course was not persisted");
            toast.success("Curso completado");
          } catch (error) {
            setStore((current) => ({ ...current, courses: patchById(current.courses, existing.id, existing) }));
            toast.error("No se pudo completar el curso");
            throw error;
          }
          return;
        }

        const id = makeId();
        const notes = [course.notes, "Marcado como terminado desde AL-LÍO."].filter(Boolean).join("\n\n");
        setStore((current) => ({
          ...current,
          courses: [{ ...course, id, created_at: nowIso(), status: "terminado", sourceTable: undefined, notes }, ...current.courses],
        }));
        try {
          const response = await insertDb("courses", {
            id,
            id_slug: idSlug || null,
            title: course.title,
            platform: course.platform || null,
            url: course.url || null,
            start_date: course.start_at || null,
            deadline: course.deadline_at || null,
            status: "terminado",
            notes: notes || null,
          }, ["/courses", "/dashboard"]);
          if (!response?.result) throw new Error("Course was not persisted");
          toast.success("Curso completado");
        } catch (error) {
          setStore((current) => ({ ...current, courses: current.courses.filter((c) => c.id !== id) }));
          toast.error("No se pudo completar el curso");
          throw error;
        }
        return;
      }

      // Plain, already user-owned course row.
      const previousCourse = store.courses.find((c) => c.id === course.id);
      setStore((current) => ({ ...current, courses: patchById(current.courses, course.id, { status: "terminado" }) }));
      try {
        const response = await updateDb("courses", course.id, { status: "terminado" }, ["/courses", "/dashboard"]);
        if (!response?.result) throw new Error("Course was not persisted");
        toast.success("Curso completado");
      } catch (error) {
        if (previousCourse) {
          setStore((current) => ({ ...current, courses: patchById(current.courses, course.id, previousCourse) }));
        }
        toast.error("No se pudo completar el curso");
        throw error;
      }
    },
    addHackathon: async (data: Omit<Hackathon, "id" | "created_at">) => {
      const id = makeId();
      setStore((current) => ({ ...current, hackathons: [{ id, created_at: nowIso(), ...data }, ...current.hackathons] }));
      try {
        const response = await insertDb("hackathons", {
          id,
          name: data.name,
          organizer: data.organizer || null,
          province: data.province,
          city: data.city || null,
          type: "hackathon",
          status: data.status || "revisar_futura_edicion",
          event_start_date: data.start_at || null,
          event_end_date: data.end_at || null,
          registration_deadline: data.registration_deadline_at || null,
          url: data.url || null,
          notes: data.notes || null,
          priority: data.priority,
        }, ["/hackathons", "/calendar", "/dashboard"]);
        if (!response?.result) throw new Error("Hackathon was not persisted");
        toast.success("Evento o reto añadido");
      } catch (error) {
        setStore((current) => ({ ...current, hackathons: current.hackathons.filter((hackathon) => hackathon.id !== id) }));
        toast.error("Error al añadir el evento o reto");
        throw error;
      }
    },
    // Dedicated action (not the generic updateHackathon below) so a failed
    // write always rolls back the optimistic flip and surfaces an honest
    // error toast - updateHackathon is fire-and-forget with no rollback,
    // which is fine for its current callers but not for a Saved toggle a
    // student expects to be trustworthy (issue #131).
    toggleHackathonFavorite: (id: string) => {
      const current = store.hackathons.find((hackathon) => hackathon.id === id);
      const nextValue = !current?.is_favorite;
      setStore((current) => ({
        ...current,
        hackathons: current.hackathons.map((hackathon) => hackathon.id === id ? { ...hackathon, is_favorite: nextValue } : hackathon),
      }));
      void toggleHackathonFavoriteAction(id).then((result) => {
        if (!result.error) return;
        setStore((current) => ({
          ...current,
          hackathons: current.hackathons.map((hackathon) => hackathon.id === id ? { ...hackathon, is_favorite: !nextValue } : hackathon),
        }));
        toast.error("No se pudo guardar el evento o reto");
      });
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
    completeHackathon: async (item: Hackathon) => {
      if (item.sourceTable === "fp_content_items") {
        const idSlug = item.id_slug;
        if (!idSlug) {
          toast.error("No se pudo marcar el evento como realizado");
          throw new Error("Missing id_slug for fp hackathon completion");
        }
        const previousContent = store.fpContent.find((content) => content.id_slug === idSlug);
        const previousStatus = previousContent?.user_status;
        const previousCompletedAt = previousContent?.user_completed_at;
        const completedAt = nowIso();
        setStore((current) => ({
          ...current,
          fpContent: current.fpContent.map((content) => content.id_slug === idSlug ? { ...content, user_status: "completed", user_completed_at: completedAt } : content),
        }));
        try {
          const result = await markResourceStatusAction(idSlug, "completed");
          if (result.error) throw new Error(result.error);
          toast.success("Evento marcado como realizado");
        } catch (error) {
          setStore((current) => ({
            ...current,
            fpContent: current.fpContent.map((content) => content.id_slug === idSlug ? {
              ...content,
              user_status: previousStatus,
              user_completed_at: previousCompletedAt,
            } : content),
          }));
          toast.error("No se pudo marcar el evento como realizado");
          throw error;
        }
        return;
      }

      // Plain, already user-owned hackathon row (sourceTable is "hackathons"
      // or undefined). tech_opportunities-sourced items never reach this
      // branch - the UI does not offer "Realizado" for them, since there is
      // no safe per-user completion table for that source, unlike
      // fp_content_items's fp_user_content_state.
      const previousHackathon = store.hackathons.find((hackathon) => hackathon.id === item.id);
      setStore((current) => ({ ...current, hackathons: patchById(current.hackathons, item.id, { status: "realizado" }) }));
      try {
        const response = await updateDb("hackathons", item.id, { status: "realizado" }, ["/hackathons"]);
        if (!response?.result) throw new Error("Hackathon was not persisted");
        toast.success("Evento marcado como realizado");
      } catch (error) {
        if (previousHackathon) {
          setStore((current) => ({ ...current, hackathons: patchById(current.hackathons, item.id, previousHackathon) }));
        }
        toast.error("No se pudo marcar el evento como realizado");
        throw error;
      }
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
    markCompetencyCompleted: (skillId: string) => {
      const patchCompetencies = (fpContent: FpCatalogItem[], completed: boolean) => fpContent.map((item) => ({
        ...item,
        requiredCompetencies: item.requiredCompetencies?.map((competency) => (
          competency.id === skillId ? { ...competency, completed } : competency
        )),
      }));
      setStore((current) => ({ ...current, fpContent: patchCompetencies(current.fpContent, true) }));
      void markCompetencyCompletedAction(skillId).then((result) => {
        if (!result.error) return;
        setStore((current) => ({ ...current, fpContent: patchCompetencies(current.fpContent, false) }));
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
