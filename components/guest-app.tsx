"use client";

import Image from "next/image";
import Link from "next/link";
import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  Bell,
  Bookmark,
  BookOpen,
  Briefcase,
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
  FolderKanban,
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
import { insertDb, updateDb, deleteDb } from "@/lib/db";
import { toast } from "sonner";
import { TechOpportunitiesSection, type TechOpportunityTaskTarget } from "@/components/tech-opportunities-section";
import { toggleFavoriteAction, markResourceStatusAction } from "@/lib/fp/resource-notes-actions";
import { BlocNotepad } from "@/components/bloc-notepad";
import type { TechOpportunity } from "@/lib/tech-opportunity-types";
import type { JobApplication, ApplicationStatus } from "@/lib/job-radar/types";
import { APPLICATION_STATUSES, STATUS_LABELS, STATUS_COLORS } from "@/lib/job-radar/types";

type View = "dashboard" | "work" | "courses" | "hackathons" | "tasks" | "calendar" | "links" | "sources" | "settings" | "bloc";
type TaskStatus = "pendiente" | "en_progreso" | "completada" | "pospuesta" | "cancelada";
type TaskBucket = "diario" | "urgente" | "semanal";
type TaskPriority = "alta" | "media" | "baja" | "critica";
type QuickAddType = "task" | "course" | "hackathon" | "company";

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

type ProgressNote = {
  id: string;
  text: string;
  created_at: string;
};

type Task = {
  id: string;
  title: string;
  description?: string;
  due_at?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  reminder_at?: string;
  progress_notes: ProgressNote[];
  created_at: string;
  completed_at?: string;
};

type Opportunity = {
  id: string;
  title: string;
  company?: string;
  url?: string;
  status: string;
  location?: string;
  created_at: string;
};

type Course = {
  id: string;
  id_slug?: string;
  title: string;
  platform?: string;
  url?: string;
  price?: number | string;
  category?: string;
  start_at?: string;
  deadline_at?: string;
  status: "pendiente" | "empezado" | "terminado" | "pausado" | "descartado";
  entidad?: string;
  area?: string;
  modalidad?: string;
  localidad?: string;
  provincia?: string;
  formato?: string;
  certificacion_tipo?: string;
  certificacion_oficial?: boolean;
  practicas_empresa?: boolean;
  horas_totales?: number;
  horas_practicas?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  coste?: string;
  requisitos_resumen?: string;
  encaje_daw_1_5?: number;
  prioridad?: string;
  tags?: string | string[];
  fuente_url?: string;
  ultima_revision?: string;
  notes?: string;
  sourceTable?: "courses" | "tech_opportunities" | "fp_content_items";
  created_at: string;
};

type RequiredCompetencyLearningItem = {
  competencia_id: string;
  id: string;
  id_slug: string;
  title: string;
  type: string;
  source_url: string;
  video_url: string | null;
  tipo_relacion: string;
  user_status?: string | null;
};

type RequiredCompetency = {
  id: string;
  titulo: string;
  descripcion?: string;
  etapa: string;
  nivel_objetivo?: number;
  horas_estimadas?: number;
  evidencia_minima?: string;
  obligatoria_para_item: boolean;
  orden_preparacion?: number;
  learningItems: RequiredCompetencyLearningItem[];
};

type FpCatalogItem = {
  id: string;
  id_slug: string;
  type: string;
  title: string;
  description?: string;
  entity?: string;
  delivery_mode?: string;
  location?: string;
  province?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  cost?: string;
  certification?: string;
  practices?: string;
  source_url?: string;
  tags?: string[];
  suggested_action?: string;
  notes?: string;
  priority: "Alta" | "Media" | "Baja";
  requiredCompetencies?: RequiredCompetency[];
  is_favorite?: boolean;
  user_status?: string | null;
  user_completed_at?: string | null;
  created_at: string;
};

type Hackathon = {
  id: string;
  id_slug?: string;
  categoria?: string;
  name: string;
  organizer?: string;
  province?: string;
  city?: string;
  type?: string;
  modalidad?: string;
  localidad?: string;
  status: "inscripcion_abierta" | "pendiente" | "realizado" | "revisar_futura_edicion" | "descartado";
  priority: "alta" | "media" | "baja";
  start_at?: string;
  end_at?: string;
  registration_deadline_at?: string;
  inscripcion_hasta?: string;
  certificacion_o_premio?: string;
  practicas_empresa?: boolean;
  encaje_daw_1_5?: number;
  tags?: string | string[];
  incluido_en_readme_original?: boolean;
  ultima_revision?: string;
  url?: string;
  notes?: string;
  sourceTable?: "hackathons" | "tech_opportunities" | "fp_content_items";
  requiredCompetencies?: RequiredCompetency[];
  is_favorite?: boolean;
  created_at: string;
};

type Company = {
  id: string;
  name: string;
  web?: string;
  employment_url?: string;
  employment_type?: string;
  category?: string;
  granada?: string;
  source?: string;
  notes?: string;
  link_status: "sin_verificar" | "ok" | "revisar";
  created_at: string;
};

type QuickLink = {
  id: string;
  name: string;
  url: string;
  category?: string;
  created_at: string;
};

export type Store = {
  version: 2;
  userName?: string;
  tasks: Task[];
  opportunities: Opportunity[];
  techOpportunities: TechOpportunity[];
  courses: Course[];
  hackathons: Hackathon[];
  fpContent: FpCatalogItem[];
  links: QuickLink[];
  reminders: unknown[];
  companies: Company[];
};

type CalendarEvent = {
  id: string;
  type: "task" | "course" | "hackathon" | "event" | "google";
  title: string;
  date_at: string;
  end_at?: string;
  status?: string;
  href: string;
};

type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  htmlLink?: string;
  status?: string;
};

const googleEventsCache = new Map<string, GoogleCalendarEvent[]>();

async function loadGoogleCalendarRange(start: string, end: string, force = false) {
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

function useGoogleCalendarEvents(month: Date, refreshKey = 0) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);

  useEffect(() => {
    let alive = true;
    const start = startOfMonth(month).toISOString();
    const end = addMonths(startOfMonth(month), 1).toISOString();

    loadGoogleCalendarRange(start, end, refreshKey > 0)
      .then((next) => {
        if (alive) setEvents(next);
      })
      .catch(() => {
        if (alive) setEvents([]);
      });

    return () => {
      alive = false;
    };
  }, [month, refreshKey]);

  return useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        type: "google" as const,
        title: event.title,
        date_at: event.start,
        end_at: event.end,
        status: event.status,
        href: event.htmlLink || "/calendar",
      })),
    [events],
  );
}


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
  companies: [],
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
const dashboardJobPortals: JobPlatform[] = [...jobPlatforms];
const dashboardHackathonCutoff = new Date("2026-05-01T00:00:00");

export type ReturnTypeActions = {
  addTask: (data: Omit<Task, "id" | "created_at" | "progress_notes"> & { progress_notes?: ProgressNote[] }) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addTaskNote: (id: string, text: string) => void;
  addCourse: (data: Omit<Course, "id" | "created_at">) => void;
  updateCourse: (id: string, data: Partial<Course>) => void;
  addHackathon: (data: Omit<Hackathon, "id" | "created_at">) => void;
  updateHackathon: (id: string, data: Partial<Hackathon>) => void;
  addCompany: (data: Omit<Company, "id" | "created_at" | "link_status"> & { link_status?: Company["link_status"] }) => void;
  updateCompany: (id: string, data: Partial<Company>) => void;
  addLink: (data: Omit<QuickLink, "id" | "created_at">) => void;
  toggleFpFavorite: (idSlug: string, nextValue: boolean) => void;
  markLearningItemDone: (idSlug: string) => void;
  reset: () => void;
};

type StoreContextType = {
  store: Store;
  actions: ReturnTypeActions;
};

const StoreContext = createContext<StoreContextType | null>(null);

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}

export function MobileHeaderActions() {
  const { store, actions } = useStore();
  return (
    <div className="flex items-center gap-1">
      <GoogleCalendarStatusControl />
      <NotificationBell store={store} actions={actions} />
    </div>
  );
}

export function StoreProvider({ initialStore, children }: { initialStore: Store; children: React.ReactNode }) {
  const [store, setStore] = useState<Store>(initialStore || { ...emptyStore, hackathons: seedHackathons });
  const hasMountedRef = useRef(false);

  // Sync store if initialStore changes (e.g. after router.refresh), but skip mount to avoid double-render
  useEffect(() => {
    if (!hasMountedRef.current) { hasMountedRef.current = true; return; }
    if (initialStore) setStore(initialStore);
  }, [initialStore]);

  const actions = {
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
      const task = store.tasks.find((t) => t.id === id);
      const newDesc = (task?.description ? task.description + "\n\n" : "") + `[Nota]: ${text}`;
      setStore((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === id ? { ...task, description: newDesc, progress_notes: [{ id: makeId(), text, created_at: nowIso() }, ...(task.progress_notes || [])] } : task,
        ),
      }));
      await updateDb("tasks", id, { description: newDesc }, ["/tasks"]);
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
      const { start_at, deadline_at, ...rest } = data;
      const dbData: Record<string, unknown> = { ...rest };
      if (start_at !== undefined) dbData.start_date = start_at || null;
      if (deadline_at !== undefined) dbData.deadline = deadline_at || null;
      await updateDb("courses", id, dbData, ["/courses"]);
    },
    addHackathon: async (data: Omit<Hackathon, "id" | "created_at">) => {
      const id = makeId();
      setStore((current) => ({ ...current, hackathons: [{ id, created_at: nowIso(), ...data }, ...current.hackathons] }));
      try {
        await insertDb("hackathons", { id, name: data.name, organizer: data.organizer, province: data.province, city: data.city, type: "hackathon", status: data.status || "revisar_futura_edicion", event_start_date: data.start_at, event_end_date: data.end_at, registration_deadline: data.registration_deadline_at, url: data.url, notes: data.notes, priority: data.priority }, ["/hackathons"]);
        toast.success("Hackathon añadido");
      } catch {
        toast.error("Error al añadir el hackathon");
      }
    },
    updateHackathon: async (id: string, data: Partial<Hackathon>) => {
      setStore((current) => ({ ...current, hackathons: patchById(current.hackathons, id, data) }));
      const { start_at, end_at, registration_deadline_at, ...rest } = data;
      const dbData: Record<string, unknown> = { ...rest };
      if (start_at !== undefined) dbData.event_start_date = start_at || null;
      if (end_at !== undefined) dbData.event_end_date = end_at || null;
      if (registration_deadline_at !== undefined) dbData.registration_deadline = registration_deadline_at || null;
      await updateDb("hackathons", id, dbData, ["/hackathons"]);
    },
    addCompany: async (data: Omit<Company, "id" | "created_at" | "link_status"> & { link_status?: Company["link_status"] }) => {
      setStore((current) => ({ ...current, companies: [{ id: makeId(), created_at: nowIso(), link_status: "sin_verificar", ...data }, ...current.companies] }));
      try {
        await insertDb("opportunities", { title: data.name, company: data.name, source: data.web || "Manual", url: data.employment_url || data.web || "https://", status: "guardada", notes: data.notes, category: data.category, location: data.granada || "Granada" }, ["/work"]);
        toast.success("Empresa guardada");
      } catch {
        toast.error("Error al guardar la empresa");
      }
    },
    updateCompany: async (id: string, data: Partial<Company>) => {
      setStore((current) => ({ ...current, companies: patchById(current.companies, id, data) }));
      const dbData: any = {};
      if (data.name) { dbData.title = data.name; dbData.company = data.name; }
      if (data.web) dbData.source = data.web;
      if (data.employment_url) dbData.url = data.employment_url;
      if (data.notes) dbData.notes = data.notes;
      if (data.category) dbData.category = data.category;
      await updateDb("opportunities", id, dbData, ["/work"]);
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
        fpContent: current.fpContent.map((item) => (item.id_slug === idSlug ? { ...item, is_favorite: nextValue } : item)),
      }));
      toggleFavoriteAction(idSlug, nextValue).then((result) => {
        if (result.error) {
          setStore((current) => ({
            ...current,
            fpContent: current.fpContent.map((item) => (item.id_slug === idSlug ? { ...item, is_favorite: !nextValue } : item)),
          }));
          toast.error("No se pudo guardar");
        }
      });
    },
    markLearningItemDone: (idSlug: string) => {
      const patchLearningItems = (fpContent: FpCatalogItem[], status: string | null) => fpContent.map((item) => ({
        ...item,
        requiredCompetencies: item.requiredCompetencies?.map((competency) => ({
          ...competency,
          learningItems: competency.learningItems.map((learningItem) =>
            learningItem.id_slug === idSlug ? { ...learningItem, user_status: status } : learningItem
          ),
        })),
      }));
      setStore((current) => ({ ...current, fpContent: patchLearningItems(current.fpContent, "completed") }));
      markResourceStatusAction(idSlug, "completed").then((result) => {
        if (result.error) {
          setStore((current) => ({ ...current, fpContent: patchLearningItems(current.fpContent, null) }));
          toast.error("No se pudo guardar");
        }
      });
    },
    reset: () => setStore({ ...emptyStore, hackathons: seedHackathons }),
  };

  return <StoreContext.Provider value={{ store, actions }}>{children}</StoreContext.Provider>;
}

const BELL_DISMISSED_KEY = "al-lio.bell.dismissed.v1";

function loadBellDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(BELL_DISMISSED_KEY) || "[]"); } catch { return []; }
}

function saveBellDismissed(keys: string[]) {
  try { localStorage.setItem(BELL_DISMISSED_KEY, JSON.stringify(keys)); } catch { /* ignore */ }
}

function NotificationBell({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => startOfDay(new Date()), []);
  const weekLimit = useMemo(() => addDays(today, 7), [today]);

  useEffect(() => {
    setDismissed(loadBellDismissed());
  }, []);

  useEffect(() => {
    let alive = true;
    loadGoogleCalendarRange(today.toISOString(), weekLimit.toISOString())
      .then((evs) => { if (alive) setGoogleEvents(evs); })
      .catch(() => { if (alive) setGoogleEvents([]); });
    return () => { alive = false; };
  }, [today, weekLimit]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const todayUrgentTasks = useMemo(() => {
    const now = new Date();
    return store.tasks.filter((task) => {
      if (task.status === "completada" || task.status === "cancelada") return false;
      const due = task.due_at ? new Date(task.due_at) : null;
      const isOverdue = due && due < now;
      const isDueToday = due && isSameDay(due, now);
      const isUrgent = task.priority === "alta" || task.priority === "critica" || task.category === "urgente";
      return Boolean(isOverdue) || Boolean(isDueToday) || isUrgent;
    }).slice(0, 5);
  }, [store.tasks]);

  const allAlerts = useMemo(() => {
    const localAlerts = getCalendarEvents(store).filter((event) => {
      if (event.type !== "course" && event.type !== "hackathon") return false;
      if (isCalendarEventDone(event)) return false;
      if (isCalendarItemPast(event, store)) return false;
      const date = parseDate(event.date_at);
      return Boolean(date) && date! >= today && date! <= weekLimit;
    });

    const gcalAlerts: CalendarEvent[] = googleEvents
      .filter((ev) => {
        const date = parseDate(ev.start);
        return Boolean(date) && date! >= today && date! <= weekLimit;
      })
      .map((ev) => ({
        id: `gcal-${ev.id}`,
        type: "event" as const,
        title: ev.title,
        date_at: ev.start,
        status: ev.status,
        href: ev.htmlLink || "/calendar",
      }));

    return [...localAlerts, ...gcalAlerts].sort(sortEvents).slice(0, 12);
  }, [store, googleEvents, today, weekLimit]);

  const alerts = useMemo(
    () => allAlerts.filter((event) => !dismissed.includes(`${event.type}-${event.id}`)),
    [allAlerts, dismissed],
  );

  function persistDismiss(key: string) {
    setDismissed((prev) => {
      const next = prev.includes(key) ? prev : [...prev, key];
      saveBellDismissed(next);
      return next;
    });
  }

  function dismiss(e: React.MouseEvent, key: string) {
    e.stopPropagation();
    persistDismiss(key);
  }

  function addToTasksBucket(e: React.MouseEvent, event: CalendarEvent, bucket: TaskBucket) {
    e.stopPropagation();
    actions.addTask({ title: event.title, status: "pendiente", priority: "media", category: bucket, due_at: event.date_at });
    persistDismiss(`${event.type}-${event.id}`);
  }

  function markEventDone(e: React.MouseEvent, event: CalendarEvent) {
    e.stopPropagation();
    completeCalendarEvent(event, store, actions);
    persistDismiss(`${event.type}-${event.id}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card/90 text-foreground shadow-sm transition-colors hover:bg-muted"
        onClick={() => setOpen((o) => !o)}
        aria-label="Alertas de la semana"
        title="Alertas de esta semana"
      >
        <Bell className="h-4 w-4" />
        {alerts.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
            {alerts.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] rounded-lg border bg-background shadow-xl sm:w-80">
          {todayUrgentTasks.length > 0 && (
            <>
              <div className="border-b px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 shrink-0 text-rose-500" />
                  <h3 className="text-sm font-semibold">Resumen de hoy</h3>
                </div>
              </div>
              <div className="divide-y border-b">
                {todayUrgentTasks.map((task) => {
                  const now = new Date();
                  const due = task.due_at ? new Date(task.due_at) : null;
                  const isOverdue = due && due < now;
                  return (
                    <a key={task.id} href="/tasks" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/60 transition-colors">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", isOverdue ? "bg-rose-500" : task.priority === "critica" ? "bg-rose-400" : "bg-amber-400")} />
                      <span className="flex-1 truncate text-sm">{task.title}</span>
                      {isOverdue && <span className="shrink-0 text-[10px] font-semibold text-rose-500">Vencida</span>}
                    </a>
                  );
                })}
              </div>
            </>
          )}
          <div className="border-b px-3 py-2.5">
            <div className="flex items-center gap-2">
              <AlarmClock className="h-4 w-4 shrink-0 text-amber-500" />
              <h3 className="text-sm font-semibold">Proximos 7 dias</h3>
            </div>
            <p className="text-xs text-muted-foreground">Cursos, hackathons y eventos de Google Calendar.</p>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sin alertas esta semana</p>
            ) : (
              <div className="divide-y">
                {alerts.map((event) => {
                  const key = `${event.type}-${event.id}`;
                  return (
                    <div key={key} className="px-3 py-2.5">
                      <p className="text-sm font-medium leading-snug">{event.title}</p>
                      {event.date_at && <p className="mb-2 text-xs text-muted-foreground">{formatShortDateTime(event.date_at)}</p>}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {taskBuckets.map((bucket) => (
                          <button
                            key={bucket.id}
                            type="button"
                            className="inline-flex h-6 items-center rounded bg-muted px-2 text-[11px] font-medium transition-colors hover:bg-muted/70"
                            onClick={(e) => addToTasksBucket(e, event, bucket.id)}
                          >
                            → {bucket.shortTitle}
                          </button>
                        ))}
                        {(event.type === "course" || event.type === "hackathon") && (
                          <button
                            type="button"
                            className="inline-flex h-6 items-center gap-1 rounded bg-emerald-500/10 px-2 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
                            onClick={(e) => markEventDone(e, event)}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Hecho
                          </button>
                        )}
                        <button
                          type="button"
                          className="ml-auto inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => dismiss(e, key)}
                        >
                          <X className="h-3 w-3" />
                          Descartar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function GuestApp({ view }: { view: View }) {
  const { store, actions } = useStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {view !== "dashboard" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
              {({
                work: "Trabajo",
                tasks: "Tareas",
                courses: "Cursos",
                hackathons: "Hackathons",
                calendar: "Calendario",
                links: "Links",
                sources: "Fuentes",
                settings: "Configuración",
                bloc: "Bloc",
              } as Record<string, string>)[view] ?? view}
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <GoogleCalendarStatusControl />
            <NotificationBell store={store} actions={actions} />
          </div>
        </div>
      )}
      {view === "dashboard" && (
        <div className="hidden md:flex items-center justify-end gap-2">
          <NotificationBell store={store} actions={actions} />
          <GoogleCalendarStatusControl />
        </div>
      )}

      {view === "dashboard" && <Dashboard store={store} actions={actions} />}
      {view === "work" && <Work store={store} actions={actions} />}
      {view === "tasks" && <Tasks store={store} actions={actions} />}
      {view === "courses" && <Courses store={store} actions={actions} />}
      {view === "hackathons" && <Hackathons store={store} actions={actions} />}
      {view === "calendar" && <CalendarView store={store} />}
      {view === "links" && <LinksView store={store} actions={actions} />}
      {view === "sources" && <Sources />}
      {view === "settings" && <Settings reset={actions.reset} addTask={actions.addTask} />}
      {view === "bloc" && <BlocView />}

      <QuickAdd open={quickAddOpen} setOpen={setQuickAddOpen} actions={actions} />
    </div>
  );
}

function Dashboard({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const activeTechOpportunities = useMemo(
    () => store.techOpportunities.filter((item) => !isTechOpportunityCompletedByUser(item, store) && !isTechOpportunityPast(item)),
    [store],
  );

  function addTechOpportunityTask(item: TechOpportunity, target: TechOpportunityTaskTarget) {
    const category: TaskBucket = target === "pendiente" ? "urgente" : target;
    const dueAt = target === "semanal"
      ? addDaysKeepingTime(toDatetimeLocalValue(new Date()), 3)
      : toDatetimeLocalValue(new Date());
    const priority: TaskPriority = item.prioridad?.toLowerCase() === "alta" || item.encaje_daw_1_5 === 5
      ? "alta"
      : "media";

    actions.addTask({
      title: `Inscribirme: ${item.nombre}`,
      description: buildTechOpportunityTaskDescription(item),
      due_at: dueAt,
      status: "pendiente",
      priority,
      category,
    });
  }

  return (
    <>
      <TodoOverview store={store} actions={actions} />
      <DashboardOperationalFeed store={store} actions={actions} />
      <div className="grid gap-4 lg:grid-cols-2">
        <TaskCalendar store={store} />
        <QuickLinksSection />
      </div>
      <TechOpportunitiesSection
        initialItems={activeTechOpportunities}
        onAddTask={addTechOpportunityTask}
        onComplete={(item) => completeTechOpportunityItem(item, actions)}
      />
    </>
  );
}

function buildTechOpportunityTaskDescription(item: TechOpportunity) {
  return [
    "Tarea creada desde Oportunidades tech para preparar la inscripción.",
    item.entidad ? `Entidad: ${item.entidad}` : "",
    item.modalidad ? `Modalidad: ${item.modalidad}` : "",
    compactTechOpportunityLocation(item) ? `Lugar: ${compactTechOpportunityLocation(item)}` : "",
    item.fecha_inicio ? `Fecha inicio: ${item.fecha_inicio}` : "",
    item.fecha_fin ? `Fecha fin: ${item.fecha_fin}` : "",
    item.estado ? `Estado: ${item.estado}` : "",
    item.requisitos_resumen ? `Requisitos: ${item.requisitos_resumen}` : "",
    item.fuente_url ? `Fuente: ${item.fuente_url}` : "",
  ].filter(Boolean).join("\n");
}

function compactTechOpportunityLocation(item: TechOpportunity) {
  return [item.localidad, item.provincia]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(", ");
}

function completeTechOpportunityItem(item: TechOpportunity, actions: ReturnTypeActions) {
  if (isTechCourse(item)) {
    completeCourseItem(techOpportunityToCourse(item), actions);
    return;
  }

  completeHackathonItem(techOpportunityToHackathon(item), actions);
}

function completeCourseItem(item: Course, actions: ReturnTypeActions) {
  if (item.sourceTable === "tech_opportunities" || item.sourceTable === "fp_content_items" || item.id.startsWith("tech-") || item.id.startsWith("fp-")) {
    const data = courseAddPayload(item);
    actions.addCourse({
      ...data,
      status: "terminado",
      sourceTable: undefined,
      notes: appendCompletionNote(item.notes, "Marcado como terminado desde D1OS."),
    });
    return;
  }

  actions.updateCourse(item.id, { status: "terminado" });
}

function completeHackathonItem(item: Hackathon, actions: ReturnTypeActions) {
  if (item.sourceTable === "tech_opportunities" || item.sourceTable === "fp_content_items" || item.id.startsWith("tech-") || item.id.startsWith("fp-")) {
    const data = hackathonAddPayload(item);
    actions.addHackathon({
      ...data,
      status: "realizado",
      sourceTable: undefined,
      notes: appendCompletionNote(item.notes, "Marcado como realizado desde D1OS."),
    });
    return;
  }

  actions.updateHackathon(item.id, { status: "realizado" });
}

function completeCalendarEvent(event: CalendarEvent, store: Store, actions: ReturnTypeActions) {
  if (event.type === "task") {
    actions.updateTask(event.id, { status: "completada", completed_at: nowIso() });
    return true;
  }

  const baseId = calendarEventBaseId(event.id);

  if (event.type === "course") {
    const course = getDisplayCourses(store.courses, store.techOpportunities)
      .find((item) => item.id === baseId || item.id_slug === baseId || item.id === `tech-${baseId}`);
    if (!course) return false;
    completeCourseItem(course, actions);
    return true;
  }

  if (event.type === "hackathon") {
    const hackathon = getDisplayHackathons(store.hackathons, store.techOpportunities)
      .find((item) => item.id === baseId || item.id_slug === baseId || item.id === `tech-${baseId}`);
    if (!hackathon) return false;
    completeHackathonItem(hackathon, actions);
    return true;
  }

  return false;
}

function calendarEventBaseId(id: string) {
  return id.replace(/-(start|deadline|end)$/, "");
}

function appendCompletionNote(notes: string | undefined, text: string) {
  return [notes, text].filter(Boolean).join("\n\n");
}

function courseAddPayload(item: Course) {
  const data: Partial<Course> = { ...item };
  delete data.id;
  delete data.created_at;
  return data as Omit<Course, "id" | "created_at">;
}

function hackathonAddPayload(item: Hackathon) {
  const data: Partial<Hackathon> = { ...item };
  delete data.id;
  delete data.created_at;
  return data as Omit<Hackathon, "id" | "created_at">;
}

function isTechOpportunityCompletedByUser(item: TechOpportunity, store: Store) {
  if (isTechCourse(item)) {
    const identity = courseIdentityKey(techOpportunityToCourse(item));
    return store.courses.some((course) => courseIdentityKey(course) === identity && isCourseArchived(course));
  }

  if (isTechHackathonOrEvent(item)) {
    const identity = hackathonIdentityKey(techOpportunityToHackathon(item));
    return store.hackathons.some((hackathon) => hackathonIdentityKey(hackathon) === identity && isHackathonArchived(hackathon));
  }

  return false;
}

function isTechOpportunityPast(item: TechOpportunity) {
  return isPastActionDate(item.fecha_fin || item.fecha_inicio);
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

function TodoOverview({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const { settings: appSettings } = useAppSettings();
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold leading-none">To-do</h2>
        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Link href="/tasks">Ver tablero completo</Link>
        </Button>
      </div>
      <TaskBoard store={store} actions={actions} variant="dashboard" compact={appSettings.compactTaskView} />
    </section>
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
  border: string;
  headerBg: string;
  iconBg: string;
  countBadge: string;
  plusBtn: string;
  checkbox: string;
  checkboxDone: string;
  bar: string;
  footerBg: string;
  footerText: string;
  subtitle: (active: number) => string;
  footerLabel: (active: number) => string;
}> = {
  diario: {
    border: "border-blue-200/70 dark:border-blue-900/50",
    headerBg: "bg-blue-50/80 dark:bg-blue-950/30",
    iconBg: "bg-blue-500",
    countBadge: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200",
    plusBtn: "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-900",
    checkbox: "border-blue-300 hover:border-blue-400 dark:border-blue-700",
    checkboxDone: "border-blue-500 bg-blue-500",
    bar: "bg-blue-500",
    footerBg: "bg-blue-50/60 dark:bg-blue-950/20",
    footerText: "text-blue-700 dark:text-blue-300",
    subtitle: (active) => `Hoy · ${active} ${active === 1 ? "pendiente" : "pendientes"}`,
    footerLabel: () => "Progreso diario",
  },
  urgente: {
    border: "border-orange-200/70 dark:border-orange-900/50",
    headerBg: "bg-orange-50/80 dark:bg-orange-950/30",
    iconBg: "bg-orange-500",
    countBadge: "bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-200",
    plusBtn: "bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/60 dark:text-orange-300 dark:hover:bg-orange-900",
    checkbox: "border-orange-300 hover:border-orange-400 dark:border-orange-700",
    checkboxDone: "border-orange-500 bg-orange-500",
    bar: "bg-orange-500",
    footerBg: "bg-orange-50/60 dark:bg-orange-950/20",
    footerText: "text-orange-700 dark:text-orange-300",
    subtitle: () => "Tareas por resolver",
    footerLabel: (active) => `${active} ${active === 1 ? "pendiente" : "pendientes"}`,
  },
  semanal: {
    border: "border-emerald-200/70 dark:border-emerald-900/50",
    headerBg: "bg-emerald-50/80 dark:bg-emerald-950/30",
    iconBg: "bg-emerald-500",
    countBadge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200",
    plusBtn: "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-900",
    checkbox: "border-emerald-300 hover:border-emerald-400 dark:border-emerald-700",
    checkboxDone: "border-emerald-500 bg-emerald-500",
    bar: "bg-emerald-500",
    footerBg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    footerText: "text-emerald-700 dark:text-emerald-300",
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
    <section
      ref={setDropRef}
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow",
        style.border,
        isOver && "ring-2 ring-inset ring-primary/40",
      )}
    >
      <div className={cn("flex items-center gap-3 px-4 py-3.5", style.headerBg)}>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm", style.iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold leading-tight">{bucket.title}</h3>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", style.countBadge)}>{tasks.length}</span>
          </div>
          <p className="text-xs text-muted-foreground">{style.subtitle(tasks.length)}</p>
        </div>
        <button
          type="button"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            style.plusBtn,
          )}
          onClick={() => setAddOpen(true)}
          aria-label={`Añadir tarea a ${bucket.title}`}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {addOpen && (
        <div className="border-t px-3 py-3">
          <QuickTaskForm bucket={bucket.id} actions={actions} open={addOpen} onOpenChange={setAddOpen} />
        </div>
      )}

      <div className="divide-y border-t">
        {tasks.map((task) => (
          <TaskItemRow key={task.id} task={task} accent={style} actions={actions} onOpen={() => onOpenTask(task)} />
        ))}
        {completedTasks.map((task) => (
          <TaskItemRow key={task.id} task={task} accent={style} actions={actions} onOpen={() => onOpenTask(task)} />
        ))}
        {total === 0 && !addOpen && (
          <div className="flex items-center justify-between gap-3 px-4 py-5">
            <p className="text-sm text-muted-foreground">No hay tareas en {bucket.title.toLowerCase()}.</p>
            <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Añadir
            </Button>
          </div>
        )}
      </div>

      <div className={cn("flex items-center justify-between gap-3 border-t px-4 py-2.5 text-xs", style.footerBg)}>
        <span className={cn("font-medium", style.footerText)}>{style.footerLabel(tasks.length)}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {completedTasks.length ? `${completedTasks.length} de ${total} completadas` : "0 completadas"}
          </span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", style.bar)} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function TaskItemRow({
  task,
  accent,
  actions,
  onOpen,
}: {
  task: Task;
  accent: (typeof taskSectionStyles)[TaskBucket];
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
      className={cn("relative flex select-none items-center gap-3 bg-card px-4 py-3", isDragging && "z-50 opacity-60 shadow-lg")}
      {...listeners}
    >
      <button
        type="button"
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          completed ? accent.checkboxDone : accent.checkbox,
        )}
        onClick={toggleCompleted}
        aria-label={completed ? "Marcar como pendiente" : "Completar tarea"}
      >
        {completed && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
      </button>

      <button type="button" className="min-w-0 flex-1 cursor-pointer text-left" onClick={onOpen}>
        <p className={cn("break-words font-medium leading-snug", completed && "text-muted-foreground line-through")}>{task.title}</p>
        {!completed && (task.due_at || task.reminder_at || task.status === "en_progreso" || task.status === "pospuesta") && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            {task.due_at && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatShortDateTime(task.due_at)}
              </span>
            )}
            {task.status === "en_progreso" && <span className="font-medium text-amber-600 dark:text-amber-400">· En curso</span>}
            {task.status === "pospuesta" && <span>· Pospuesta</span>}
            {task.reminder_at && (
              <span className="inline-flex items-center gap-1">
                · <AlarmClock className="h-3 w-3" />
                {formatShortDateTime(task.reminder_at)}
              </span>
            )}
          </p>
        )}
        {completed && <p className="mt-0.5 text-xs text-muted-foreground">Completada</p>}
      </button>

      {completed ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
    <section ref={setDropRef} className={cn("flex min-w-0 flex-col overflow-hidden rounded-lg border bg-muted/30 shadow-sm transition-colors dark:bg-zinc-950/70", compact ? "min-w-0" : "min-h-[430px]", isOver && "ring-2 ring-inset ring-primary/40 bg-muted/60")}>
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
    });
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

  return (
    <FieldForm action={submit}>
      <div className="rounded-md border bg-background p-2 shadow-sm">
        <div className="space-y-2">
          <Input name="title" placeholder={compact ? "Nueva tarea" : "Titulo de la tarea"} required autoFocus />
          {!compact && <Textarea name="description" placeholder="Descripcion breve" rows={3} />}
          <Select name="priority" defaultValue={bucket === "urgente" ? "alta" : "media"} className="h-8 text-xs">
            {taskPriorities.map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}
          </Select>
          {!compact && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input name="due_at" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
              <Input name="reminder_at" type="datetime-local" />
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm">Crear</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
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

  if (!task) return null;
  const currentTask = task;

  function save() {
    if (!title.trim()) return;
    actions.updateTask(currentTask.id, { title: title.trim(), description, category: bucket, priority, due_at: dueAt, reminder_at: reminderAt });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[92svh] w-full overflow-hidden rounded-t-lg border bg-background shadow-2xl sm:max-w-3xl sm:rounded-lg">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <h2 className="truncate text-lg font-semibold">Detalle de tarea</h2>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Cerrar"><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid max-h-[calc(92svh-73px)] overflow-y-auto md:grid-cols-[1fr_260px]">
          <div className="space-y-4 p-4">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titulo" />
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descripcion" rows={7} />
          </div>
          <aside className="space-y-3 border-t bg-muted/30 p-4 md:border-l md:border-t-0">
            <Select value={bucket} onChange={(event) => setBucket(event.target.value as TaskBucket)}>
              {taskBuckets.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </Select>
            <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              {taskPriorities.map((item) => <option key={item} value={item}>{priorityLabel(item)}</option>)}
            </Select>
            <Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            <Input type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} />
            <Button type="button" className="w-full" onClick={save}>Guardar</Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => { actions.updateTask(currentTask.id, { status: "completada", completed_at: nowIso() }); onClose(); }}>Marcar hecho</Button>
            <Button type="button" variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={() => { actions.deleteTask(currentTask.id); onClose(); }}>Eliminar</Button>
          </aside>
        </div>
      </div>
    </div>
  );
}

const dashboardFeedSections = [
  { id: "tasks", label: "Tareas urgentes", sub: "Prioridad alta, critica o pendientes reales.", Icon: Flame, color: "text-rose-500" },
  { id: "calendar", label: "Semana", sub: "Eventos y fechas importantes.", Icon: CalendarDays, color: "text-blue-500" },
  { id: "hackathons", label: "Hackathons proximos", sub: "Solo fechas desde el 01/05/2026.", Icon: FolderKanban, color: "text-amber-500" },
  { id: "jobs", label: "Busqueda rapida", sub: "Portales con termino y ubicacion editables.", Icon: Briefcase, color: "text-emerald-500" },
  { id: "radar", label: "Radar de empleo", sub: "Nuevas ofertas detectadas en empresas de Granada.", Icon: Target, color: "text-violet-500" },
] as const;

function DashboardOperationalFeed({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const [section, setSection] = useState(0);
  const [autoPaused, setAutoPaused] = useState(false);
  const [expandedPortal, setExpandedPortal] = useState<JobPlatform | null>(null);
  const [googleWeekEvents, setGoogleWeekEvents] = useState<GoogleCalendarEvent[]>([]);
  const [radarApps, setRadarApps] = useState<JobApplication[]>([]);
  const [radarSyncing, setRadarSyncing] = useState(false);
  const radarFetched = useRef(false);

  const handleToggleDashboard = useCallback((p: JobPlatform) => setExpandedPortal((v) => v === p ? null : p), []);

  useEffect(() => {
    if (autoPaused) return;
    const id = window.setInterval(() => {
      setSection((value) => (value + 1) % dashboardFeedSections.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [autoPaused]);

  useEffect(() => {
    let alive = true;
    async function loadGoogleWeekEvents() {
      try {
        const start = startOfDay(new Date()).toISOString();
        const end = addDays(startOfDay(new Date()), 14).toISOString();
        const next = await loadGoogleCalendarRange(start, end);
        if (alive) setGoogleWeekEvents(next);
      } catch {
        if (alive) setGoogleWeekEvents([]);
      }
    }
    loadGoogleWeekEvents();
    return () => {
      alive = false;
    };
  }, []);

  const current = dashboardFeedSections[section];

  useEffect(() => {
    if (current.id !== "radar" || radarFetched.current) return;
    radarFetched.current = true;
    let alive = true;
    fetch("/api/job-radar")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (alive && d?.applications) setRadarApps(d.applications); })
      .catch(() => {});
    return () => { alive = false; };
  }, [current.id]);

  const syncRadarDashboard = useCallback(async () => {
    setRadarSyncing(true);
    try {
      await fetch("/api/job-radar/sync", { method: "POST" });
      const res = await fetch("/api/job-radar");
      if (res.ok) {
        const d = await res.json();
        setRadarApps(d.applications ?? []);
        toast.success("Job Radar actualizado");
      }
    } catch {
      toast.error("Error al sincronizar Job Radar");
    } finally {
      setRadarSyncing(false);
    }
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);
  const weekLimit = useMemo(() => addDays(today, 14), [today]);

  const urgentTasks = useMemo(
    () =>
      activeTasks(store.tasks)
        .filter((task) => {
          const priority = getTaskPriority(task);
          return priority === "alta" || priority === "critica" || toTaskBucket(task.category) === "urgente";
        })
        .sort(sortTasksByPriority)
        .slice(0, 6),
    [store.tasks],
  );

  const googleCalendarWeekEvents = useMemo(
    () =>
      googleWeekEvents.map((event) => ({
        id: event.id,
        type: "google" as const,
        title: event.title,
        date_at: event.start,
        end_at: event.end,
        status: event.status,
        href: event.htmlLink || "/calendar",
      })),
    [googleWeekEvents],
  );

  const weekEvents = useMemo(
    () =>
      [...getCalendarEvents(store), ...googleCalendarWeekEvents]
        .filter((event) => {
          const date = parseDate(event.date_at);
          return Boolean(date) && date! >= today && date! <= weekLimit && !isCalendarEventDone(event) && !isCalendarItemPast(event, store);
        })
        .sort(sortEvents)
        .slice(0, 9),
    [store, googleCalendarWeekEvents, today, weekLimit],
  );

  const displayHackathons = useMemo(() => getDisplayHackathons(store.hackathons, store.techOpportunities), [store.hackathons, store.techOpportunities]);

  const upcomingHackathons = useMemo(
    () =>
      displayHackathons
        .filter(isDashboardFutureHackathon)
        .sort((a, b) =>
          String(hackathonDashboardDate(a)?.toISOString() || "9999").localeCompare(
            String(hackathonDashboardDate(b)?.toISOString() || "9999"),
          ),
        )
        .slice(0, 6),
    [displayHackathons],
  );

  const Icon = current.Icon;

  const moveSection = useCallback((direction: -1 | 1) => {
    setSection((value) => (value + direction + dashboardFeedSections.length) % dashboardFeedSections.length);
  }, []);

  return (
    <section
      className="space-y-2"
      onMouseEnter={() => setAutoPaused(true)}
      onMouseLeave={() => setAutoPaused(false)}
      onFocusCapture={() => setAutoPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setAutoPaused(false);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cn("h-4 w-4 shrink-0", current.color)} />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{current.label}</h2>
            <p className="truncate text-xs text-muted-foreground">{current.sub}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveSection(-1)} aria-label="Categoria anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {dashboardFeedSections.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(index)}
              className={cn("h-1.5 rounded-full transition-all duration-300", index === section ? "w-5 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60")}
              aria-label={`Ver ${item.label}`}
            />
          ))}
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveSection(1)} aria-label="Categoria siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card/80 p-3 shadow-sm">
        <div key={current.id} className="min-h-[190px] animate-in fade-in duration-300">
          {current.id === "tasks" && (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {urgentTasks.length ? urgentTasks.map((task) => <DashboardTaskMiniCard key={task.id} task={task} actions={actions} />) : <EmptyText>Sin tareas de alta prioridad.</EmptyText>}
            </div>
          )}
          {current.id === "calendar" && (
            <div className="grid max-h-[250px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
              {weekEvents.length ? weekEvents.map((event) => <DashboardEventMiniCard key={`${event.type}-${event.id}`} event={event} store={store} actions={actions} />) : <EmptyText>Sin eventos importantes esta semana.</EmptyText>}
            </div>
          )}
          {current.id === "hackathons" && (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {upcomingHackathons.length ? upcomingHackathons.map((hackathon) => <DashboardHackathonMiniCard key={hackathon.id} hackathon={hackathon} actions={actions} />) : <EmptyText>No hay hackathons proximos con fecha desde el 01/05/2026.</EmptyText>}
            </div>
          )}
          {current.id === "jobs" && (
            <div className="grid max-h-[250px] gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-4">
              {dashboardJobPortals.map((platform) => (
                <QuickJobSearchCard
                  key={platform}
                  platform={platform}
                  expanded={expandedPortal === platform}
                  onToggle={handleToggleDashboard}
                />
              ))}
            </div>
          )}
          {current.id === "radar" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {radarApps.filter((a) => a.is_new).length} nuevas · {radarApps.length} total
                </span>
                <button
                  type="button"
                  onClick={syncRadarDashboard}
                  disabled={radarSyncing}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3 w-3", radarSyncing && "animate-spin")} />
                  {radarSyncing ? "Escaneando..." : "Sincronizar"}
                </button>
              </div>
              {radarApps.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin ofertas. Pulsa Sincronizar para escanear las empresas.</p>
              ) : (
                <ul className="max-h-[190px] space-y-1.5 overflow-y-auto pr-1">
                  {radarApps.slice(0, 8).map((app) => (
                    <li key={app.id} className="flex items-center gap-2">
                      {app.is_new
                        ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/20" />
                      }
                      <span className="min-w-0 flex-1 text-xs">
                        <span className="font-medium text-foreground/90">{app.company_name}</span>
                        <span className="text-muted-foreground"> — {app.job_title}</span>
                      </span>
                      <a
                        href={app.job_url ?? app.company_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Ver oferta"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="mt-2 text-[10px] text-muted-foreground/50 select-none">{section + 1} / {dashboardFeedSections.length}</div>
      </div>
    </section>
  );
}

const DashboardTaskMiniCard = memo(function DashboardTaskMiniCard({ task, actions }: { task: Task; actions: ReturnTypeActions }) {
  const priority = getTaskPriority(task);
  return (
    <div className="relative overflow-hidden rounded-md border bg-background/70 p-2.5 shadow-sm">
      <span className={cn("absolute left-0 top-0 h-full w-1", priorityBarClass(priority))} />
      <div className="flex items-start justify-between gap-2 pl-1">
        <p className="min-w-0 truncate text-sm font-medium">{task.title}</p>
        <Badge className={cn("shrink-0 px-1.5 text-[10px]", priorityClass(priority))}>{priorityLabel(priority)}</Badge>
      </div>
      <div className="mt-2 flex items-center gap-1 pl-1">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => actions.updateTask(task.id, { status: "completada", completed_at: nowIso() })}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Hecho
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => actions.deleteTask(task.id)} aria-label="Eliminar tarea">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});

const DashboardEventMiniCard = memo(function DashboardEventMiniCard({ event, store, actions }: { event: CalendarEvent; store: Store; actions: ReturnTypeActions }) {
  const canComplete = event.type === "task" || event.type === "course" || event.type === "hackathon";
  return (
    <div className="flex items-start gap-2 rounded-md border bg-background/70 p-2.5 text-sm shadow-sm transition-colors hover:bg-muted/60">
      <Link href={event.href} className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate font-medium">{event.title}</p>
          <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", calendarDotClass(event.type, event.status))} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{formatShortDateTime(event.date_at)} - {calendarTypeLabel(event.type)}</p>
      </Link>
      {canComplete && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-emerald-600"
          onClick={() => completeCalendarEvent(event, store, actions)}
          aria-label="Marcar como hecho"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
});

const DashboardHackathonMiniCard = memo(function DashboardHackathonMiniCard({ hackathon, actions }: { hackathon: Hackathon; actions: ReturnTypeActions }) {
  const date = hackathonDashboardDate(hackathon);
  return (
    <div className="rounded-md border bg-background/70 p-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{hackathon.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{[hackathon.city || hackathon.province, date ? formatShortDateTime(date.toISOString()) : null].filter(Boolean).join(" - ")}</p>
        </div>
        <Badge className="shrink-0 px-1.5 text-[10px]">{hackathon.status}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {hackathon.url && <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs"><a href={hackathon.url} target="_blank" rel="noreferrer">Info</a></Button>}
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => actions.addTask({ title: `Investigar ${hackathon.name}`, due_at: toDatetimeLocalValue(addDays(new Date(), 1)), status: "pendiente", priority: "media", category: "urgente", description: "Hackathon" })}>Investigar</Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => completeHackathonItem(hackathon, actions)} aria-label="Marcar hackathon como realizado"><CheckCircle2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
});

const QuickJobSearchCard = memo(function QuickJobSearchCard({ platform, expanded, onToggle }: { platform: JobPlatform; expanded: boolean; onToggle: (p: JobPlatform) => void }) {
  const [query, setQuery] = useState("programador java");
  const [scope, setScope] = useState<"Granada" | "Teletrabajo">("Granada");
  const url = useMemo(() => buildJobSearchUrl(platform, query, scope), [platform, query, scope]);

  return (
    <div className={cn("rounded-md border bg-background/70 p-2.5 shadow-sm transition-colors", expanded && "border-primary/50 bg-primary/5")}>
      <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => onToggle(platform)}>
        <PortalMark platform={platform} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{platform}</p>
          <p className="truncate text-[11px] text-muted-foreground">Busqueda rapida</p>
        </div>
      </button>
      {expanded && (
        <div className="mt-2 grid gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 text-xs" placeholder="programador java" aria-label={`Busqueda en ${platform}`} />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Select value={scope} onChange={(event) => setScope(event.target.value as "Granada" | "Teletrabajo")} className="h-8 text-xs" aria-label={`Ambito de busqueda en ${platform}`}>
              <option value="Granada">Granada</option>
              <option value="Teletrabajo">Teletrabajo</option>
            </Select>
            <Button asChild size="sm" variant="outline" className="h-8 px-3 text-xs">
              <a href={url} target="_blank" rel="noreferrer">Buscar <ExternalLink className="h-3.5 w-3.5" /></a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

const quickLinkGroups = [
  {
    group: "Webs rapidas",
    links: [
      { label: "GitHub", href: "https://github.com/danicode-dev" },
      { label: "Portfolio", href: "https://danicode-dev.github.io/PORTFOLIO/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/" },
      { label: "Trello", href: "https://trello.com/" },
      { label: "Slack", href: "https://slack.com/" },
      { label: "Supabase", href: "https://supabase.com/" },
      { label: "Vercel", href: "https://vercel.com/" },
    ],
  },
  {
    group: "IA y diseno",
    links: [
      { label: "ChatGPT", href: "https://chatgpt.com/" },
      { label: "Claude", href: "https://claude.ai/" },
      { label: "Banana AI", href: "https://labs.google/fx/tools/image-fx" },
      { label: "Claude Design", href: "https://claude.ai/new" },
      { label: "Google Stitch", href: "https://stitch.withgoogle.com/" },
    ],
  },
] as const;

function QuickLinksSection() {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <h2 className="text-base font-semibold">Accesos rapidos</h2>
        <p className="text-sm text-muted-foreground">Links y herramientas que uso a diario.</p>
      </div>
      <div className="grid gap-0 sm:grid-cols-2 sm:divide-x divide-border">
        {quickLinkGroups.map((group) => (
          <div key={group.group} className="py-1 sm:px-4 first:sm:pl-0 last:sm:pr-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.group}</p>
            <div className="flex flex-col">
              {group.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white dark:bg-white/90">
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
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold", PORTAL_COLORS[platform] ?? "bg-muted text-foreground")}>
      {platform.slice(0, 2)}
    </span>
  );
}

function EventDateTimeFields({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
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
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Dia</p>
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
    const start = eventDate.toISOString();
    const end = addMinutes(eventDate, 60).toISOString();
    try {
      const res = await fetch("/api/google/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), start, end, notes: notes.trim() || undefined }),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Error al guardar"); }
      googleEventsCache.clear();
      toast.success("Evento añadido al calendario");
      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="absolute right-0 top-9 z-50 w-[min(23rem,calc(100vw-2rem))] rounded-lg border bg-background shadow-xl">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Nuevo evento</span>
        <button type="button" onClick={onClose} className="flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="space-y-2.5 p-3">
        <Input placeholder="Añadir título" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus />
        <button
          type="button"
          onClick={() => setDescriptionOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
        >
          <span className="text-muted-foreground">{notes.trim() ? "Descripcion anadida" : "Descripcion"}</span>
          <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", descriptionOpen && "rotate-90")} />
        </button>
        {descriptionOpen && (
          <Textarea placeholder="Escribe los detalles del evento" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="text-sm" />
        )}
        <EventDateTimeFields value={eventDate} onChange={setEventDate} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={saving || !title.trim()}>{saving ? "Guardando..." : "Guardar"}</Button>
      </div>
    </div>
  );
}

function TaskCalendar({ store }: { store: Store }) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  const newEventRef = useRef<HTMLDivElement>(null);
  const googleCalendarEvents = useGoogleCalendarEvents(month, calendarRefresh);
  const events = useMemo(() => [...getCalendarEvents(store), ...googleCalendarEvents].sort(sortEvents), [store, googleCalendarEvents]);
  const cells = buildMonthCells(month);
  const eventsByDay = groupEventsByDay(events);
  const selectedEvents = eventsByDay.get(selectedDay) ?? [];

  useEffect(() => {
    if (!newEventOpen) return;
    function handle(e: PointerEvent) {
      if (newEventRef.current && !newEventRef.current.contains(e.target as Node)) setNewEventOpen(false);
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [newEventOpen]);

  const defaultEventDate = useMemo(() => {
    const parsed = parseDate(selectedDay);
    const base = parsed ? new Date(parsed) : new Date();
    const now = new Date();
    base.setHours(now.getHours(), now.getMinutes(), 0, 0);
    return base;
  }, [selectedDay]);

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center">
        <div className="flex flex-1 items-center gap-0.5">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mes anterior"><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { const now = startOfMonth(new Date()); setMonth(now); setSelectedDay(todayKey()); }}>Hoy</Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMonth(addMonths(month, 1))} aria-label="Mes siguiente"><ChevronRight className="h-3.5 w-3.5" /></Button>
        </div>
        <h2 className="flex-1 text-center text-xs font-semibold uppercase tracking-widest">{monthTitle(month).toUpperCase()}</h2>
        <div ref={newEventRef} className="relative flex flex-1 items-center justify-end">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setNewEventOpen((o) => !o)} aria-label="Crear evento">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {newEventOpen && (
            <NewEventDialog
              defaultDate={defaultEventDate}
              onClose={() => setNewEventOpen(false)}
              onCreated={() => setCalendarRefresh((value) => value + 1)}
            />
          )}
        </div>
      </div>
      <div className="grid gap-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["L", "M", "X", "J", "V", "S", "D"].map((day) => <span key={day}>{day}</span>)}
          {cells.map((day) => {
            const hasEvents = eventsByDay.has(day.key);
            const selected = selectedDay === day.key;
            return (
              <button key={day.key} type="button" className={cn("relative flex h-9 items-center justify-center rounded-md text-sm", day.inMonth ? "bg-muted/60 text-foreground" : "text-muted-foreground/40", selected && "bg-primary text-primary-foreground", hasEvents && !selected && "ring-1 ring-primary/30")} onClick={() => setSelectedDay(day.key)}>
                {day.date.getDate()}
                {hasEvents && <span className={cn("absolute bottom-1 h-1 w-1 rounded-full", selected ? "bg-primary-foreground" : "bg-primary")} />}
              </button>
            );
          })}
        </div>
        {selectedEvents.length > 0 && (
          <div className="rounded-md border bg-background/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{formatDayTitle(selectedDay)}</h3>
              <Badge>{selectedEvents.length}</Badge>
            </div>
            <div className="space-y-2">
              {selectedEvents.map((event) => <CalendarAgendaRow key={`${event.type}-${event.id}`} event={event} compact />)}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}


function QuickAdd({ open, setOpen, actions }: { open: boolean; setOpen: (open: boolean) => void; actions: ReturnTypeActions }) {
  const [type, setType] = useState<QuickAddType>("task");
  const [dueAt, setDueAt] = useState(toDatetimeLocalValue(new Date()));

  useEffect(() => {
    if (open && type === "task") setDueAt(toDatetimeLocalValue(new Date()));
  }, [open, type]);

  function submit(form: FormData) {
    const title = val(form, "title");
    if (!title) return;

    if (type === "task") {
      actions.addTask({ title, description: val(form, "notes"), due_at: val(form, "due_at"), status: "pendiente", priority: "media" });
    }
    if (type === "course") {
      actions.addCourse({ title, platform: val(form, "platform"), url: val(form, "url"), start_at: val(form, "start_at"), deadline_at: val(form, "deadline_at"), status: "pendiente", notes: val(form, "notes") });
    }
    if (type === "hackathon") {
      actions.addHackathon({ name: title, organizer: val(form, "organizer"), province: val(form, "province") || "Granada", city: val(form, "city"), status: "revisar_futura_edicion", priority: "media", start_at: val(form, "start_at"), end_at: val(form, "end_at"), registration_deadline_at: val(form, "registration_deadline_at"), url: val(form, "url"), notes: val(form, "notes") });
    }
    if (type === "company") {
      actions.addCompany({ name: title, web: val(form, "web"), employment_url: val(form, "employment_url"), employment_type: "Manual", category: val(form, "category"), notes: val(form, "notes") });
    }

    setOpen(false);
  }

  return (
    <>
      {open && (
        <Card className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm p-4 shadow-xl md:bottom-20 md:right-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Alta rápida</p>
              <h2 className="font-semibold">Añadir a Al-Lio</h2>
            </div>
            <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Cerrar alta rapida"><X className="h-4 w-4" /></Button>
          </div>
          <FieldForm action={submit}>
            <Select value={type} onChange={(event) => setType(event.target.value as QuickAddType)} name="type">
              <option value="task">Tarea</option>
              <option value="course">Curso</option>
              <option value="hackathon">Hackathon</option>
              <option value="company">Empresa</option>
            </Select>
            <Input name="title" placeholder={type === "company" ? "Nombre" : "Título"} required />

            {type === "task" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <QuickDateButton label="Hoy" onClick={() => setDueAt(toDatetimeLocalValue(new Date()))} />
                  <QuickDateButton label="Mañana misma hora" onClick={() => setDueAt(addDaysKeepingTime(dueAt, 1))} />
                  <QuickDateButton label="Mañana mañana" onClick={() => setDueAt(nextDayAt(9, 0))} />
                  <QuickDateButton label="Mañana tarde" onClick={() => setDueAt(nextDayAt(17, 0))} />
                </div>
                <QuickDateButton label="Esta semana" onClick={() => setDueAt(addDaysKeepingTime(dueAt, 3))} className="w-full" />
                <Input name="due_at" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
                <Textarea name="notes" placeholder="Notas" />
              </>
            )}

            {type === "course" && (
              <>
                <Input name="platform" placeholder="Plataforma" />
                <Input name="url" placeholder="URL del curso" />
                <Input name="start_at" type="datetime-local" />
                <Input name="deadline_at" type="datetime-local" />
                <Textarea name="notes" placeholder="Notas" />
              </>
            )}

            {type === "hackathon" && (
              <>
                <Input name="organizer" placeholder="Organizador" />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input name="province" placeholder="Provincia" />
                  <Input name="city" placeholder="Ciudad" />
                </div>
                <Input name="url" placeholder="Link" />
                <Input name="start_at" type="datetime-local" />
                <Input name="end_at" type="datetime-local" />
                <Input name="registration_deadline_at" type="datetime-local" />
                <Textarea name="notes" placeholder="Notas" />
              </>
            )}

            {type === "company" && (
              <>
                <Input name="web" placeholder="Web" />
                <Input name="employment_url" placeholder="Portal de empleo" />
                <Input name="category" placeholder="Categoría" />
                <Textarea name="notes" placeholder="Notas" />
              </>
            )}

            <Button className="w-full">Guardar</Button>
          </FieldForm>
        </Card>
      )}
      <Button
        size="icon"
        className="fixed bottom-20 md:bottom-5 right-4 md:right-5 z-50 h-14 w-14 rounded-full shadow-xl"
        onClick={() => setOpen(!open)}
        aria-label="Añadir rápido"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}

const WORK_TABS: ["portals" | "companies" | "candidaturas", string][] = [
  ["portals", "Portales"],
  ["companies", "Empresas"],
  ["candidaturas", "Candidaturas"],
];

function Work({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const [tab, setTab] = useState<"portals" | "companies" | "candidaturas">("portals");
  const [expandedPortal, setExpandedPortal] = useState<JobPlatform | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [companyType, setCompanyType] = useState("");

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
    const haystack = `${company.name} ${company.category} ${company.granada} ${company.employment_type}`.toLowerCase();
    return (!companySearch || haystack.includes(companySearch.toLowerCase())) && (!companyType || company.employment_type === companyType);
  }), [store.companies, companySearch, companyType]);

  const companyTypes = useMemo(
    () => Array.from(new Set(store.companies.map((c) => c.employment_type).filter(Boolean))).sort(),
    [store.companies],
  );

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
    <Section title="Trabajo">
      <SegmentedTabs value={tab} setValue={setTab} tabs={WORK_TABS} />

      {tab === "portals" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Haz clic en un portal para escribir tu búsqueda y abrirla directamente.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {jobPlatforms.map((platform) => (
              <QuickJobSearchCard
                key={platform}
                platform={platform}
                expanded={expandedPortal === platform}
                onToggle={handleToggleWork}
              />
            ))}
          </div>
        </div>
      )}

      {tab === "companies" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Buscar empresa, stack o categoria" />
              </div>
              <Select value={companyType} onChange={(event) => setCompanyType(event.target.value)}>
                <option value="">Todos los enlaces</option>
                {companyTypes.map((type) => <option key={type}>{type}</option>)}
              </Select>
              {(companySearch || companyType) && (
                <Button type="button" size="sm" variant="ghost" className="h-9 px-2 text-xs text-muted-foreground" onClick={() => { setCompanySearch(""); setCompanyType(""); }}>
                  Limpiar
                </Button>
              )}
            </div>
          </Card>

          <CrudGrid
            form={
              <FieldForm action={(form) => actions.addCompany({ name: val(form, "name"), web: val(form, "web"), employment_url: val(form, "employment_url"), employment_type: "Manual", category: val(form, "category"), notes: val(form, "notes") })}>
                <Input name="name" placeholder="Empresa" required />
                <Input name="web" placeholder="Web" />
                <Input name="employment_url" placeholder="Portal de empleo" />
                <Input name="category" placeholder="Categoria" />
                <Textarea name="notes" placeholder="Notas" />
                <Button>Guardar empresa</Button>
              </FieldForm>
            }
          >
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{filteredCompanies.length} empresas guardadas</div>
              {filteredCompanies.map((company) => <CompanyRow key={company.id} company={company} />)}
              {!filteredCompanies.length && <EmptyText>No hay empresas con esos filtros.</EmptyText>}
            </div>
          </CrudGrid>
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
    </Section>
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
    <div className={cn("rounded-lg border bg-card p-4 space-y-2", app.is_new && "border-blue-400/50 dark:border-blue-500/40")}>
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
  const completed = store.tasks.filter((item) => item.status === "completada").sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));

  return (
    <div className="space-y-5">
      <p className="-mt-4 text-sm text-muted-foreground">Organiza tu trabajo y mantén el foco.</p>
      <div className="space-y-6">
        <TaskBoard store={store} actions={actions} variant="full" />
        {completed.length ? (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Realizadas</h3>
            {completed.slice(0, 12).map((task) => (
              <Row
                key={task.id}
                title={task.title}
                meta={`Completada ${formatLongDate(task.completed_at)}${task.description ? ` - ${task.description}` : ""}`}
                badge="completada"
                actions={<Button type="button" size="sm" variant="outline" onClick={() => actions.updateTask(task.id, { status: "pendiente", completed_at: "" })}>Reabrir</Button>}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}



function courseStatusClass(status: string) {
  if (status === "empezado") return "al-course-chip-terracotta";
  if (status === "terminado") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "pausado") return "al-course-chip-amber";
  if (status === "descartado") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  return "";
}

function hackathonStatusClass(status: string) {
  if (status === "inscripcion_abierta") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "realizado") return "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300";
  if (status === "descartado") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  if (status === "revisar_futura_edicion") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
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
        .al-course-card { position: relative; display: flex; flex-direction: column; gap: 8px; background: white; border: 1px solid #ece7dc; border-radius: 18px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); padding: 13px; }
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
                          <p className="al-course-card-title">{item.title}</p>
                          {(item.entidad || item.platform) && <p className="al-course-card-org">{item.entidad || item.platform}</p>}
                        </div>
                        <Badge className={cn("shrink-0", courseStatusClass(item.status))}>{item.status}</Badge>
                      </div>
                      {(startDate || endDate) && (
                        <p className="al-course-card-meta">
                          {startDate ? formatDateLabel(startDate) : "—"}{endDate ? ` → ${formatDateLabel(endDate)}` : ""}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {place && <ChipTag icon="pin">{place}</ChipTag>}
                        {item.modalidad && <ChipTag>{item.modalidad}</ChipTag>}
                        {item.prioridad && <ChipTag className={coursePriorityClass(item.prioridad)}>{priorityText(item.prioridad)}</ChipTag>}
                      </div>
                      {item.requisitos_resumen && <p className="al-course-card-desc line-clamp-1">{item.requisitos_resumen}</p>}
                      <div className="al-course-card-actions">
                        {url && <a href={url} target="_blank" rel="noreferrer" className="al-course-btn"><ExternalLink className="h-3.5 w-3.5" />Abrir</a>}
                        {!isCourseArchived(item) && (
                          <button type="button" className="al-course-btn" onClick={() => completeCourseItem(item, actions)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Terminado
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
  const [requirementsItem, setRequirementsItem] = useState<Hackathon | null>(null);

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
        .al-hack-hero-kicker-dot { width: 6px; height: 6px; border-radius: 999px; background: #4C9A6E; box-shadow: 0 0 0 3px rgba(76, 154, 110, 0.25); }
        .al-hack-hero-title { font-size: clamp(20px, 2.6vw, 26px); font-weight: 700; line-height: 1.15; letter-spacing: -0.01em; color: #111111; }
        .al-hack-hero-org { font-size: 12.5px; color: #6b6f72; }
        .al-hack-hero-meta { font-size: 12.5px; color: #4b4740; }
        .al-hack-hero-desc { font-size: 13px; color: #4b4740; line-height: 1.5; max-width: 56ch; }
        .al-hack-hero-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
        .al-hack-hero-btn-primary { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 16px; border-radius: 12px; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; font-size: 13px; font-weight: 700; box-shadow: 0 10px 24px rgba(225, 93, 45, 0.28); border: none; cursor: pointer; }
        .al-hack-hero-btn-ghost { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 14px; border-radius: 12px; background: white; color: #333029; font-size: 13px; font-weight: 600; border: 1px solid #ece7dc; cursor: pointer; }
        .al-hack-hero-side { width: 100%; background: #faf8f4; border: 1px solid #ece7dc; border-radius: 16px; padding: 16px; }
        @media (min-width: 900px) { .al-hack-hero-side { width: 220px; flex-shrink: 0; } }
        .al-hack-hero-side-label { display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 700; color: #6b6f72; text-transform: uppercase; letter-spacing: 0.05em; }
        .al-hack-hero-side-value { font-size: 12.5px; font-weight: 700; color: #c94f21; }
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
                  <span className="al-hack-hero-kicker"><span className="al-hack-hero-kicker-dot" />Hackatón futuro</span>
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
                        <PlayCircle className="h-4 w-4" />Entrar al hackatón
                      </Link>
                    ) : featuredHackathon.url ? (
                      <a href={featuredHackathon.url} target="_blank" rel="noreferrer" className="al-hack-hero-btn-primary">
                        <ExternalLink className="h-4 w-4" />Entrar al hackatón
                      </a>
                    ) : null}
                    {featuredHackathon.requiredCompetencies && featuredHackathon.requiredCompetencies.length > 0 && (
                      <button type="button" className="al-hack-hero-btn-ghost" onClick={() => setRequirementsItem(featuredHackathon)}>
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
                Mostrando {filtered.length} {filtered.length === 1 ? "hackathon" : "hackathons"} · desde {formatDateLabel(today)} · ordenado por fecha de inicio
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
                      {item.notes && <p className="al-hack-card-desc line-clamp-1">{item.notes}</p>}
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
                          <button type="button" className="al-hack-btn" onClick={() => setRequirementsItem(item)}>
                            <ListChecks className="h-3.5 w-3.5" />Ver detalles
                          </button>
                        )}
                        <button type="button" className="al-hack-btn" onClick={() => actions.addTask({ title: `Revisar ${item.name}`, due_at: addDaysKeepingTime("", 1), status: "pendiente", priority: "media", description: "Hackathon" })}>
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

        <HackathonRequirementsModal item={requirementsItem} actions={actions} onClose={() => setRequirementsItem(null)} />
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
          <p className="al-hack-empty-desc">Ningún hackathon coincide con tu búsqueda o filtros.</p>
          <button type="button" className="al-hack-empty-btn" onClick={onClearFilters}>Quitar filtros</button>
        </div>
      </div>
    );
  }
  return (
    <div className="al-hack-empty-wrap al-hack-empty-two">
      <div className="al-hack-empty">
        <Image src="/assets/hackathons/hackathons-empty-sin-datos.png" alt="" width={900} height={295} sizes="280px" className="al-hack-empty-illustration" />
        <p className="al-hack-empty-title">¡Sin hackatones disponibles!</p>
        <p className="al-hack-empty-desc">Vuelve pronto para nuevos eventos de programación.</p>
      </div>
      <div className="al-hack-empty">
        <Image src="/assets/hackathons/hackathons-empty-sin-activos.png" alt="" width={900} height={295} sizes="280px" className="al-hack-empty-illustration" />
        <p className="al-hack-empty-title">¡Aún no te has inscrito!</p>
        <p className="al-hack-empty-desc">Busca un hackatón y demuestra tus habilidades.</p>
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

  useEffect(() => {
    setStepIndex(0);
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
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
  }, [item]);

  if (!item) return null;

  const hasRuta = hackathonHasRutaVideo(item);
  const canFavorite = item.sourceTable === "fp_content_items" && !!item.id_slug;
  const safeIndex = steps.length > 0 ? Math.min(stepIndex, steps.length - 1) : 0;
  const currentStep = steps[safeIndex] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true">
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
      <div className="al-modal-shell max-h-[92svh] w-full overflow-hidden sm:max-w-lg">
        <div className="al-modal-head">
          <span className="al-modal-head-icon">
            <Image src="/assets/hackathons/hackathons-modal-checklist-icon.png" alt="" width={160} height={160} className="h-full w-full object-contain" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="al-modal-title line-clamp-2">Requisitos para {item.name}</h2>
            <p className="al-modal-subtitle">Todo lo que conviene dominar antes de presentarte.</p>
          </div>
          <button type="button" className="al-modal-close" onClick={onClose} aria-label="Cerrar">
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
              <CompetencyRequirement competency={currentStep} hackathonSlug={item.id_slug} actions={actions} />
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
            <EmptyText>No hay aptitudes registradas todavía para este hackathon.</EmptyText>
          </div>
        )}
        <div className="al-modal-footer">
          <div className="al-modal-footer-row">
            {hasRuta && item.id_slug ? (
              <Link href={`/ruta/${item.id_slug}`} className="al-modal-btn-primary">
                <span>Abrir ruta completa</span>
                <small>Ver pasos, links y recursos</small>
              </Link>
            ) : (
              <span className="al-modal-btn-primary" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                <span>Ruta todavía sin vídeo</span>
              </span>
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
    </div>
  );
}

function hackathonHasRutaVideo(item: Hackathon): boolean {
  return (item.requiredCompetencies ?? []).some((competency) =>
    competency.learningItems.some((learningItem) => learningItem.video_url)
  );
}

function isCompetencyDone(competency: RequiredCompetency): boolean {
  return competency.learningItems.some((learningItem) => learningItem.user_status === "completed");
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

function CompetencyRequirement({ competency, hackathonSlug, actions }: { competency: RequiredCompetency; hackathonSlug?: string; actions: ReturnTypeActions }) {
  const done = isCompetencyDone(competency);
  const videoItem = competency.learningItems.find((li) => li.video_url);
  const docItems = competency.learningItems.filter((li) => !li.video_url);

  function markDone() {
    for (const learningItem of competency.learningItems) {
      actions.markLearningItemDone(learningItem.id_slug);
    }
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
      {competency.learningItems.length > 0 && (
        done ? (
          <span className="al-modal-mark-done al-modal-mark-done-active">
            <CheckCircle2 className="h-3.5 w-3.5" />Marcado como hecho
          </span>
        ) : (
          <button type="button" className="al-modal-mark-done" onClick={markDone}>
            <Check className="h-3.5 w-3.5" />Marcar como hecho
          </button>
        )
      )}
    </div>
  );
}

function CalendarView({ store }: { store: Store }) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const googleCalendarEvents = useGoogleCalendarEvents(month);
  const events = useMemo(() => [...getCalendarEvents(store), ...googleCalendarEvents].sort(sortEvents), [store, googleCalendarEvents]);
  const cells = buildMonthCells(month);
  const eventsByDay = groupEventsByDay(events);
  const completed = store.tasks.filter((item) => item.status === "completada" && item.completed_at && isSameMonth(item.completed_at, month));

  return (
    <Section title="Calendario">
      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">{monthTitle(month)}</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" aria-label="Mes anterior" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Mes anterior</span></Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setMonth(startOfMonth(new Date()))}>Hoy</Button>
            <Button type="button" size="sm" variant="outline" aria-label="Mes siguiente" onClick={() => setMonth(addMonths(month, 1))}><span className="hidden sm:inline">Mes siguiente</span><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-l border-t text-xs text-muted-foreground">
          {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((day) => <div key={day} className="border-b border-r p-2 font-medium">{day}</div>)}
          {cells.map((cell) => {
            const dayEvents = eventsByDay.get(cell.key) ?? [];
            return (
              <div key={cell.key} className={`min-h-32 border-b border-r p-2 ${cell.inMonth ? "bg-background" : "bg-muted/30 text-muted-foreground/60"}`}>
                <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm ${cell.key === todayKey() ? "bg-primary text-primary-foreground" : ""}`}>{cell.date.getDate()}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 4).map((event) => <CalendarPill key={`${event.type}-${event.id}`} event={event} />)}
                  {dayEvents.length > 4 && <p className="text-[11px] text-muted-foreground">+{dayEvents.length - 4} mas</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Resumen realizado</h2>
            <p className="text-sm text-muted-foreground">Tareas completadas durante este mes.</p>
          </div>
          <Badge>{completed.length} completadas</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {completed.length ? completed.slice(0, 9).map((task) => (
            <div key={task.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{task.title}</p>
              <p className="mt-1 text-muted-foreground">{formatLongDate(task.completed_at)}</p>
            </div>
          )) : <EmptyText>Todavia no hay tareas completadas este mes.</EmptyText>}
        </div>
      </Card>
    </Section>
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

function QuickDateButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return <Button type="button" size="sm" variant="outline" className={className} onClick={onClick}>{label}</Button>;
}

function SegmentedTabs<T extends string>({ value, setValue, tabs }: { value: T; setValue: (value: T) => void; tabs: Array<[T, string]> }) {
  return (
    <div className="inline-flex rounded-md border bg-card p-1">
      {tabs.map(([id, label]) => (
        <Button key={id} type="button" size="sm" variant={value === id ? "default" : "ghost"} onClick={() => setValue(id)}>
          {label}
        </Button>
      ))}
    </div>
  );
}

function CompanyRow({ company }: { company: Company }) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="h-4 w-4" />
            <h3 className="font-semibold">{company.name}</h3>
            <Badge>{company.employment_type || "Manual"}</Badge>
            <Badge>{company.link_status}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{company.category || "Sin categoria"}</p>
          {company.granada ? <p className="mt-1 text-sm text-muted-foreground">{company.granada}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {company.web && <Button asChild size="sm" variant="outline"><a href={company.web} target="_blank" rel="noreferrer">Web<ExternalLink className="h-4 w-4" /></a></Button>}
          {company.employment_url && <Button asChild size="sm"><a href={company.employment_url} target="_blank" rel="noreferrer">Empleo<ExternalLink className="h-4 w-4" /></a></Button>}
        </div>
      </div>
    </Card>
  );
}


function CalendarAgendaRow({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) {
  return (
    <Link href={event.href} className={cn("flex items-start gap-2 rounded-md border bg-card/70 p-3 text-sm hover:bg-muted", compact && "p-2.5")}>
      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", calendarDotClass(event.type, event.status))} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{event.title}</span>
        <span className="text-xs text-muted-foreground">{formatTime(event.date_at)}{event.end_at ? ` - ${formatTime(event.end_at)}` : ""} - {calendarTypeLabel(event.type)}</span>
      </span>
    </Link>
  );
}

function CalendarPill({ event }: { event: CalendarEvent }) {
  return (
    <Link href={event.href} className={`block truncate rounded px-2 py-1 text-[11px] leading-tight ${calendarEventClass(event.type, event.status)}`} title={event.title}>
      {event.type === "task" && event.date_at ? `${formatTime(event.date_at)} ` : ""}{event.title}
    </Link>
  );
}

const techCourseCategories = new Set(["curso", "fp"]);
const techHackathonCategories = new Set(["hackathon_reto"]);
const techEventCategories = new Set(["evento_tech", "reto_programacion", "concurso_programacion"]);

function getDisplayCourses(courses: Course[], items: TechOpportunity[], fpItems: FpCatalogItem[] = []) {
  const seen = new Set(courses.map(courseIdentityKey));
  const fromTech = items
    .filter(isTechCourse)
    .map(techOpportunityToCourse)
    .filter((course) => !seen.has(courseIdentityKey(course)));
  fromTech.forEach((course) => seen.add(courseIdentityKey(course)));

  const fromFp = fpItems
    .filter(isFpCourseLike)
    .map(fpItemToCourse)
    .filter((course) => !seen.has(courseIdentityKey(course)));

  return [...fromTech, ...fromFp, ...courses].sort(sortCoursesForDisplay);
}

function getDisplayHackathons(hackathons: Hackathon[], items: TechOpportunity[], fpItems: FpCatalogItem[] = []) {
  const seen = new Set(hackathons.map(hackathonIdentityKey));
  const fromTech = items
    .filter(isTechHackathonOrEvent)
    .map(techOpportunityToHackathon)
    .filter((hackathon) => !seen.has(hackathonIdentityKey(hackathon)));
  fromTech.forEach((hackathon) => seen.add(hackathonIdentityKey(hackathon)));

  const fromFp = fpItems
    .filter(isFpHackathonLike)
    .map(fpItemToHackathon)
    .filter((hackathon) => !seen.has(hackathonIdentityKey(hackathon)));

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
    status: normalizeCourseStatus(item.status),
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
  const value = values.find((item) => item && String(item).trim());
  return String(value || "").trim().toLowerCase();
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

function groupEventsByDay(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dateKey(event.date_at);
    if (!key) continue;
    map.set(key, [...(map.get(key) ?? []), event]);
  }
  return map;
}

function patchById<T extends { id: string }>(items: T[], id: string, data: Partial<T>) {
  return items.map((item) => (item.id === id ? { ...item, ...data } : item));
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}


function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
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

function toDbTaskPriority(value?: string): "alta" | "media" | "baja" {
  const normalized = normalizeTaskPriority(value);
  return normalized === "critica" ? "alta" : normalized;
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

function isCalendarItemPast(event: CalendarEvent, store: Store) {
  const baseId = calendarEventBaseId(event.id);

  if (event.type === "course") {
    const course = getDisplayCourses(store.courses, store.techOpportunities)
      .find((item) => item.id === baseId || item.id_slug === baseId || item.id === `tech-${baseId}`);
    return course ? isCoursePast(course) : isPastActionDate(event.date_at);
  }

  if (event.type === "hackathon") {
    const hackathon = getDisplayHackathons(store.hackathons, store.techOpportunities)
      .find((item) => item.id === baseId || item.id_slug === baseId || item.id === `tech-${baseId}`);
    return hackathon ? isHackathonPast(hackathon) : isPastActionDate(event.date_at);
  }

  return false;
}

function isCalendarEventDone(event: Pick<CalendarEvent, "type" | "status">) {
  const status = String(event.status || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (event.type === "task") return status === "completada" || status === "cancelada";
  if (event.type === "course") return status.includes("termin") || status.includes("final") || status.includes("descart");
  if (event.type === "hackathon") return status.includes("realiz") || status.includes("final") || status.includes("descart");
  return status === "cancelled" || status === "cancelado";
}

function sortTasksByPriority(a: Task, b: Task) {
  const priorityOrder: Record<TaskPriority, number> = { critica: 0, alta: 1, media: 2, baja: 3 };
  const priorityDiff = priorityOrder[getTaskPriority(a)] - priorityOrder[getTaskPriority(b)];
  return priorityDiff || sortTasks(a, b);
}

function tasksForBucket(tasks: Task[], bucket: TaskBucket) {
  return activeTasks(tasks).filter((task) => toTaskBucket(task.category) === bucket).sort(sortTasksByPriority);
}

function getTaskPriority(task: Pick<Task, "priority">): TaskPriority {
  return normalizeTaskPriority(task.priority);
}

function priorityLabel(value: TaskPriority) {
  if (value === "critica") return "Critica";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function priorityClass(value: TaskPriority) {
  if (value === "critica") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  if (value === "alta") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (value === "media") return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

function priorityBarClass(value: TaskPriority) {
  if (value === "critica") return "bg-red-500";
  if (value === "alta") return "bg-amber-500";
  if (value === "media") return "bg-blue-500";
  return "bg-emerald-500";
}

function hackathonDashboardDate(hackathon: Hackathon) {
  return parseDate(hackathon.start_at) ?? parseDate(hackathon.registration_deadline_at);
}

function isDashboardFutureHackathon(hackathon: Hackathon) {
  const date = hackathonDashboardDate(hackathon);
  return Boolean(date) && date! >= dashboardHackathonCutoff && !isHackathonArchived(hackathon) && !isHackathonPast(hackathon);
}

function sortTasks(a: Task, b: Task) {
  return String(a.due_at || "9999").localeCompare(String(b.due_at || "9999"));
}

function sortEvents(a: CalendarEvent, b: CalendarEvent) {
  return String(a.date_at || "").localeCompare(String(b.date_at || ""));
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDatetimeLocalValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addDaysKeepingTime(value: string | undefined, days: number) {
  const base = parseDate(value) ?? new Date();
  base.setDate(base.getDate() + days);
  return toDatetimeLocalValue(base);
}

function nextDayAt(hour: number, minute: number) {
  const date = addDays(new Date(), 1);
  date.setHours(hour, minute, 0, 0);
  return toDatetimeLocalValue(date);
}


function dateKey(value?: string) {
  const date = parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayKey() {
  return dateKey(nowIso());
}


function isSameMonth(value: string | undefined, month: Date) {
  const date = parseDate(value);
  return Boolean(date) && date!.getFullYear() === month.getFullYear() && date!.getMonth() === month.getMonth();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

function buildMonthCells(month: Date) {
  const first = startOfMonth(month);
  const leading = (first.getDay() + 6) % 7;
  const start = addDays(first, -leading);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return { date, key: dateKey(date.toISOString()), inMonth: date.getMonth() === month.getMonth() };
  });
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
}

function formatDayTitle(value: string) {
  const date = parseDate(value);
  if (!date) return "Dia seleccionado";
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "2-digit", month: "long" }).format(date);
}

function formatTime(value?: string) {
  const date = parseDate(value);
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

function calendarEventClass(type: CalendarEvent["type"], status?: string) {
  if (isCalendarEventDone({ type, status })) return "bg-slate-100 text-slate-700 line-through";
  if (type === "task") return "bg-blue-100 text-blue-800";
  if (type === "course") return "bg-emerald-100 text-emerald-800";
  if (type === "event") return "bg-violet-100 text-violet-800";
  if (type === "google") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-900";
}

function calendarDotClass(type: CalendarEvent["type"], status?: string) {
  if (isCalendarEventDone({ type, status })) return "bg-slate-400";
  if (type === "task") return "bg-blue-500";
  if (type === "course") return "bg-emerald-500";
  if (type === "event") return "bg-violet-500";
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


function pad(value: number) {
  return String(value).padStart(2, "0");
}
