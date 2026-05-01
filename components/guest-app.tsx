"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  FolderKanban,
  ListTodo,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildJobSearchUrl, type JobPlatform } from "@/lib/deeplinks/job-search-urls";
import { insertDb, updateDb, deleteDb } from "@/lib/db";
import { TechOpportunitiesSection } from "@/components/tech-opportunities-section";
import type { TechOpportunity } from "@/lib/tech-opportunity-types";

type View = "dashboard" | "work" | "courses" | "hackathons" | "tasks" | "calendar" | "links" | "sources" | "settings" | "bloc";
type TaskStatus = "pendiente" | "en_progreso" | "completada" | "pospuesta" | "cancelada";
type TaskBucket = "diario" | "urgente" | "semanal";
type TaskPriority = "alta" | "media" | "baja" | "critica";
type QuickAddType = "task" | "course" | "hackathon" | "company";

type BlocNote = {
  id: string;
  label: string;
  content: string;
  updated_at: string;
};

type BlocSettings = {
  fontSize: "sm" | "base" | "lg";
  defaultLabel: string;
};

type AppSettings = {
  displayName: string;
  defaultTaskBucket: TaskBucket;
  compactTaskView: boolean;
};

const blocKey = "techlife.bloc.D1OS.v1";
const blocSettingsKey = "techlife.bloc.settings.D1OS.v1";
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
  sourceTable?: "courses" | "tech_opportunities";
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
  sourceTable?: "hackathons" | "tech_opportunities";
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

async function loadGoogleCalendarRange(start: string, end: string) {
  const cacheKey = `${start}:${end}`;
  const cached = googleEventsCache.get(cacheKey);
  if (cached) return cached;

  const response = await fetch(`/api/google/calendar/events?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Google Calendar request failed");
  const data = await response.json();
  const events = data.connected ? data.events ?? [] : [];
  googleEventsCache.set(cacheKey, events);
  return events as GoogleCalendarEvent[];
}

function useGoogleCalendarEvents(month: Date) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);

  useEffect(() => {
    let alive = true;
    const start = startOfMonth(month).toISOString();
    const end = addMonths(startOfMonth(month), 1).toISOString();

    loadGoogleCalendarRange(start, end)
      .then((next) => {
        if (alive) setEvents(next);
      })
      .catch(() => {
        if (alive) setEvents([]);
      });

    return () => {
      alive = false;
    };
  }, [month]);

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
  links: [],
  reminders: [],
  companies: [],
};

const realisticJobTerms = [
  "Frontend Developer",
  "React Frontend Developer",
  "Software Developer",
  "Software Engineer",
  "Programador/a Java Junior",
  "Backend Developer",
  "Full Stack Developer",
  "QA Junior",
  "Soporte IT Junior",
  "Practicas DAW",
];

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
const dashboardJobPortals: JobPlatform[] = ["LinkedIn", "InfoJobs", "Tecnoempleo", "Indeed"];
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
      const category = toTaskBucket(data.category);
      const priority = normalizeTaskPriority(data.priority);
      setStore((current) => ({ ...current, tasks: [{ id: makeId(), created_at: nowIso(), progress_notes: [], ...data, category, priority }, ...current.tasks] }));
      await insertDb("tasks", {
        title: data.title,
        description: data.description,
        due_date: data.due_at || null,
        reminder_at: data.reminder_at || null,
        priority: toDbTaskPriority(priority),
        status: data.status,
        category,
      }, ["/tasks", "/calendar"]);
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
      await deleteDb("tasks", id, ["/tasks", "/calendar"]);
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
      setStore((current) => ({ ...current, courses: [{ id: makeId(), created_at: nowIso(), ...data }, ...current.courses] }));
      await insertDb("courses", { title: data.title, platform: data.platform, url: data.url, start_date: data.start_at, deadline: data.deadline_at, status: data.status, notes: data.notes }, ["/courses"]);
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
      setStore((current) => ({ ...current, hackathons: [{ id: makeId(), created_at: nowIso(), ...data }, ...current.hackathons] }));
      await insertDb("hackathons", { name: data.name, organizer: data.organizer, province: data.province, city: data.city, type: "hackathon", status: data.status || "revisar_futura_edicion", event_start_date: data.start_at, event_end_date: data.end_at, registration_deadline: data.registration_deadline_at, url: data.url, notes: data.notes, priority: data.priority }, ["/hackathons"]);
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
      await insertDb("opportunities", { title: data.name, company: data.name, source: data.web || "Manual", url: data.employment_url || data.web || "https://", status: "guardada", notes: data.notes, category: data.category, location: data.granada || "Granada" }, ["/work"]);
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
      setStore((current) => ({ ...current, links: [{ id: makeId(), created_at: nowIso(), ...data }, ...current.links] }));
      await insertDb("quick_links", data, ["/links"]);
    },
    reset: () => setStore({ ...emptyStore, hackathons: seedHackathons }),
  };

  return <StoreContext.Provider value={{ store, actions }}>{children}</StoreContext.Provider>;
}

export function GuestApp({ view }: { view: View }) {
  const router = useRouter();
  const { store, actions } = useStore();
  const { settings: appSettings } = useAppSettings();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {view !== "dashboard" && (
            <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Volver atrás" className="h-10 w-10 shrink-0 rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Panel personal</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              {(() => {
                const currentHour = new Date().getHours();
                let prefix = "Buenos días";
                if (currentHour >= 14 && currentHour < 21) prefix = "Buenas tardes";
                else if (currentHour >= 21 || currentHour < 6) prefix = "Buenas noches";
                return `${prefix}, ${appSettings.displayName || store.userName || "Al-Lio"}`;
              })()}
            </h1>
          </div>
        </div>
        <GoogleCalendarStatusControl />
      </div>

      {view === "dashboard" && <Dashboard store={store} actions={actions} />}
      {view === "work" && <Work store={store} actions={actions} />}
      {view === "tasks" && <Tasks store={store} actions={actions} />}
      {view === "courses" && <Courses store={store} actions={actions} />}
      {view === "hackathons" && <Hackathons store={store} actions={actions} />}
      {view === "calendar" && <CalendarView store={store} />}
      {view === "links" && <LinksView store={store} actions={actions} />}
      {view === "sources" && <Sources />}
      {view === "settings" && <Settings reset={actions.reset} />}
      {view === "bloc" && <BlocView />}

      <QuickAdd open={quickAddOpen} setOpen={setQuickAddOpen} actions={actions} />
    </div>
  );
}

function Dashboard({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  return (
    <>
      <TodoOverview store={store} actions={actions} />
      <WeeklyAlerts store={store} />
      <DashboardOperationalFeed store={store} actions={actions} />
      <TaskCalendar store={store} />
      <QuickLinksSection />
      <TechOpportunitiesSection initialItems={store.techOpportunities} />
    </>
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
      await fetch("/api/google/calendar/status", { method: "DELETE" });
      setConnected(false);
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
      <span className="truncate text-xs font-medium">{label}</span>
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
      <TaskBoard store={store} actions={actions} limit={4} variant="dashboard" compact={appSettings.compactTaskView} />
    </section>
  );
}

function WeeklyAlerts({ store }: { store: Store }) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const weekLimit = useMemo(() => addDays(today, 7), [today]);
  const alerts = useMemo(
    () =>
      getCalendarEvents(store)
        .filter((event) => {
          const date = parseDate(event.date_at);
          return Boolean(date) && date! >= today && date! <= weekLimit && event.status !== "completada" && event.status !== "cancelada";
        })
        .sort(sortEvents)
        .slice(0, 8),
    [store, today, weekLimit],
  );

  if (!alerts.length) return null;

  const counts = alerts.reduce<Record<CalendarEvent["type"], number>>(
    (acc, event) => {
      acc[event.type] += 1;
      return acc;
    },
    { task: 0, course: 0, hackathon: 0, event: 0, google: 0 },
  );

  return (
    <Card className="border-amber-500/25 bg-amber-500/5 p-3">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <AlarmClock className="h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Alertas de esta semana</h2>
            <p className="truncate text-xs text-muted-foreground">Tareas, cursos, hackathons y eventos con fecha cercana.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {counts.task ? <Badge>Tareas {counts.task}</Badge> : null}
          {counts.course ? <Badge>Cursos {counts.course}</Badge> : null}
          {counts.hackathon ? <Badge>Hackathons {counts.hackathon}</Badge> : null}
          {counts.event ? <Badge>Eventos {counts.event}</Badge> : null}
          {counts.google ? <Badge>Google {counts.google}</Badge> : null}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {alerts.slice(0, 4).map((event) => (
          <CalendarAgendaRow key={`${event.type}-${event.id}`} event={event} compact />
        ))}
      </div>
    </Card>
  );
}

function TaskBoard({ store, actions, limit, variant = "full", compact: compactProp }: { store: Store; actions: ReturnTypeActions; limit?: number; variant?: "dashboard" | "full"; compact?: boolean }) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const compact = compactProp ?? (variant === "dashboard");

  return (
    <>
      <div className={cn("overflow-x-auto", compact ? "pb-1" : "rounded-lg border bg-card/70 p-3")}>
        <div className={cn(compact ? "flex w-max gap-3" : "grid min-w-[840px] grid-cols-3 gap-4 xl:min-w-0")}>
          {taskBuckets.map((bucket) => {
            const tasks = tasksForBucket(store.tasks, bucket.id);
            const visibleTasks = limit ? tasks.slice(0, limit) : tasks;
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
      </div>
      <TaskDetailDialog task={selectedTask} actions={actions} onClose={() => setSelectedTask(null)} />
    </>
  );
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

  return (
    <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-lg border bg-muted/30 shadow-sm dark:bg-zinc-950/70", compact ? "w-[228px]" : "min-h-[430px]")}>
      <div className={cn("bg-gradient-to-br text-white", bucket.tone, compact ? "px-3 py-2.5" : "p-4")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
              <h3 className={cn("truncate font-semibold", compact ? "text-base" : "text-xl")}>{bucket.title}</h3>
            </div>
            {!compact && <p className="mt-2 max-w-xs text-sm text-white/85">{bucket.description}</p>}
          </div>
          <Badge className={cn("border-white/25 bg-white/15 text-white", compact && "px-1.5 py-0 text-[10px]")}>{tasks.length + hiddenCount}</Badge>
        </div>
      </div>
      <div className={cn("flex flex-1 flex-col gap-2 overflow-y-auto", compact ? "max-h-[260px] p-2" : "p-3")}>
        {tasks.length ? tasks.map((task) => (
          <TaskBoardCard key={task.id} task={task} actions={actions} compact={compact} onOpen={() => onOpenTask(task)} />
        )) : <EmptyText>No hay tareas en {bucket.title.toLowerCase()}.</EmptyText>}
        {hiddenCount > 0 && (
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/tasks">Ver {hiddenCount} mas</Link>
          </Button>
        )}
        <QuickTaskForm bucket={bucket.id} actions={actions} compact={compact} />
      </div>
    </section>
  );
}

function QuickTaskForm({ bucket, actions, compact }: { bucket: TaskBucket; actions: ReturnTypeActions; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [dueAt, setDueAt] = useState(bucket === "semanal" ? addDaysKeepingTime(toDatetimeLocalValue(new Date()), 3) : toDatetimeLocalValue(new Date()));

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
          <Input name="title" placeholder={compact ? "Nueva tarea" : "Titulo de la tarea"} required />
          {!compact && <Textarea name="description" placeholder="Descripcion breve" rows={3} />}
          <Select name="priority" defaultValue={bucket === "urgente" ? "alta" : "media"} className="h-8 text-xs">
            {taskPriorities.map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}
          </Select>
          {!compact && (
            <div className="grid grid-cols-2 gap-2">
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

  return (
    <article className="group relative overflow-hidden rounded-md border bg-card shadow-sm transition-colors hover:border-foreground/20">
      <button type="button" className={cn("block w-full text-left", compact ? "p-2.5 pr-8" : "p-3 pr-9")} onClick={onOpen}>
        <span className={cn("absolute left-0 top-0 h-full w-1", priorityBarClass(priority))} />
        <div className="flex items-start justify-between gap-3 pl-1">
          <div className="min-w-0">
            <h4 className={cn("font-medium leading-snug", compact ? "text-sm" : "text-base", task.status === "completada" && "line-through text-muted-foreground")}>{task.title}</h4>
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
      <Button type="button" size="icon" variant="ghost" className={cn("absolute right-1.5 top-1.5 h-7 w-7 text-muted-foreground hover:text-destructive", compact && "h-6 w-6")} onClick={(event) => { event.stopPropagation(); actions.deleteTask(task.id); }} aria-label="Eliminar tarea" title="Eliminar tarea">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
          <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => actions.updateTask(task.id, { status: "completada", completed_at: nowIso() })}>
            <CheckCircle2 className="h-4 w-4" />
            Hecho
          </Button>
          <Select value={toTaskBucket(task.category)} onChange={(event) => actions.updateTask(task.id, { category: event.target.value })} className="h-8 w-[112px] py-1" aria-label="Mover tarea">
            {taskBuckets.map((bucket) => <option key={bucket.id} value={bucket.id}>{bucket.shortTitle}</option>)}
          </Select>
          <Select value={priority} onChange={(event) => actions.updateTask(task.id, { priority: event.target.value as TaskPriority })} className="h-8 w-[112px] py-1" aria-label="Cambiar prioridad">
            {taskPriorities.map((item) => <option key={item} value={item}>{priorityLabel(item)}</option>)}
          </Select>
        </div>
      )}
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
] as const;

function DashboardOperationalFeed({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const [section, setSection] = useState(0);
  const [autoPaused, setAutoPaused] = useState(false);
  const [expandedPortal, setExpandedPortal] = useState<JobPlatform | null>(null);
  const [googleWeekEvents, setGoogleWeekEvents] = useState<GoogleCalendarEvent[]>([]);

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
          return Boolean(date) && date! >= today && date! <= weekLimit && event.status !== "completada" && event.status !== "cancelada";
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

  const current = dashboardFeedSections[section];
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
              {weekEvents.length ? weekEvents.map((event) => <DashboardEventMiniCard key={`${event.type}-${event.id}`} event={event} />) : <EmptyText>Sin eventos importantes esta semana.</EmptyText>}
            </div>
          )}
          {current.id === "hackathons" && (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {upcomingHackathons.length ? upcomingHackathons.map((hackathon) => <DashboardHackathonMiniCard key={hackathon.id} hackathon={hackathon} actions={actions} />) : <EmptyText>No hay hackathons proximos con fecha desde el 01/05/2026.</EmptyText>}
            </div>
          )}
          {current.id === "jobs" && (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {dashboardJobPortals.map((platform) => (
                <QuickJobSearchCard
                  key={platform}
                  platform={platform}
                  expanded={expandedPortal === platform}
                  onToggle={() => setExpandedPortal((value) => value === platform ? null : platform)}
                />
              ))}
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

const DashboardEventMiniCard = memo(function DashboardEventMiniCard({ event }: { event: CalendarEvent }) {
  return (
    <Link href={event.href} className="block rounded-md border bg-background/70 p-2.5 text-sm shadow-sm transition-colors hover:bg-muted/60">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-medium">{event.title}</p>
        <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", calendarDotClass(event.type, event.status))} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{formatShortDateTime(event.date_at)} - {calendarTypeLabel(event.type)}</p>
    </Link>
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
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => actions.updateHackathon(hackathon.id, { status: "realizado" })} aria-label="Marcar hackathon como realizado"><CheckCircle2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
});

function QuickJobSearchCard({ platform, expanded, onToggle }: { platform: JobPlatform; expanded: boolean; onToggle: () => void }) {
  const [query, setQuery] = useState("programador java");
  const [scope, setScope] = useState<"Granada" | "Teletrabajo">("Granada");
  const url = buildJobSearchUrl(platform, query, scope);

  return (
    <div className={cn("rounded-md border bg-background/70 p-2.5 shadow-sm transition-colors", expanded && "border-primary/50 bg-primary/5")}>
      <button type="button" className="flex w-full items-center gap-2 text-left" onClick={onToggle}>
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
}

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

function PortalMark({ platform }: { platform: JobPlatform }) {
  const colors: Partial<Record<JobPlatform, string>> = {
    LinkedIn: "bg-[#0A66C2] text-white",
    InfoJobs: "bg-[#167DB7] text-white",
    Tecnoempleo: "bg-[#F97316] text-white",
    Indeed: "bg-[#2557A7] text-white",
  };
  return <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold", colors[platform] ?? "bg-muted text-foreground")}>{platform.slice(0, 2)}</span>;
}

function TaskCalendar({ store }: { store: Store }) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const googleCalendarEvents = useGoogleCalendarEvents(month);
  const events = useMemo(() => [...getCalendarEvents(store), ...googleCalendarEvents].sort(sortEvents), [store, googleCalendarEvents]);
  const cells = buildMonthCells(month);
  const eventsByDay = groupEventsByDay(events);
  const selectedEvents = eventsByDay.get(selectedDay) ?? [];

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{monthTitle(month)}</h2>
          <p className="text-sm text-muted-foreground">Calendario y agenda del dia.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => { const now = startOfMonth(new Date()); setMonth(now); setSelectedDay(todayKey()); }}>Hoy</Button>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setMonth(addMonths(month, 1))} aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
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
        <div className="rounded-md border bg-background/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{formatDayTitle(selectedDay)}</h3>
              <p className="text-xs text-muted-foreground">Eventos seleccionados</p>
            </div>
            <Badge>{selectedEvents.length}</Badge>
          </div>
          <div className="space-y-2">
            {selectedEvents.length ? selectedEvents.map((event) => <CalendarAgendaRow key={`${event.type}-${event.id}`} event={event} compact />) : <EmptyText>Sin eventos este dia.</EmptyText>}
          </div>
        </div>
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
        <Card className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm p-4 shadow-xl">
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
                <div className="grid grid-cols-2 gap-2">
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
        className="fixed bottom-24 md:bottom-5 right-5 z-50 h-14 w-14 rounded-full shadow-xl"
        onClick={() => setOpen(!open)}
        aria-label="Añadir rápido"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}

function Work({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const [tab, setTab] = useState<"portals" | "companies">("portals");
  const [keyword, setKeyword] = useState(realisticJobTerms[0]);
  const [location, setLocation] = useState("Granada");
  const [companySearch, setCompanySearch] = useState("");
  const [companyType, setCompanyType] = useState("");

  const filteredCompanies = store.companies.filter((company) => {
    const haystack = `${company.name} ${company.category} ${company.granada} ${company.employment_type}`.toLowerCase();
    return (!companySearch || haystack.includes(companySearch.toLowerCase())) && (!companyType || company.employment_type === companyType);
  });
  const companyTypes = Array.from(new Set(store.companies.map((company) => company.employment_type).filter(Boolean))).sort();

  return (
    <Section title="Trabajo">
      <SegmentedTabs value={tab} setValue={setTab} tabs={[["portals", "Portales"], ["companies", "Empresas"]]} />

      {tab === "portals" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <Select value={keyword} onChange={(event) => setKeyword(event.target.value)}>
                {realisticJobTerms.map((term) => <option key={term}>{term}</option>)}
              </Select>
              <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Ubicacion" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {realisticJobTerms.map((term) => (
                <Button key={term} type="button" size="sm" variant={keyword === term ? "default" : "outline"} onClick={() => setKeyword(term)}>
                  {term}
                </Button>
              ))}
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {defaultPortals.map((portal) => {
              const url = buildJobSearchUrl(portal.name, keyword, location);
              return (
                <Card key={portal.name} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{portal.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{portal.note}</p>
                    </div>
                    <Badge>sin verificar</Badge>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button asChild size="sm">
                      <a href={url} target="_blank" rel="noreferrer">
                        Abrir busqueda
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === "companies" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Buscar empresa, stack o categoria" />
              </div>
              <Select value={companyType} onChange={(event) => setCompanyType(event.target.value)}>
                <option value="">Todos los enlaces</option>
                {companyTypes.map((type) => <option key={type}>{type}</option>)}
              </Select>
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
    </Section>
  );
}

function Tasks({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const completed = store.tasks.filter((item) => item.status === "completada").sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));

  return (
    <Section title="Tareas">
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
    </Section>
  );
}



function Courses({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const courses = useMemo(() => getDisplayCourses(store.courses, store.techOpportunities), [store.courses, store.techOpportunities]);

  return (
    <CrudGrid
      form={
        <FieldForm action={(form) => actions.addCourse({ title: val(form, "title"), platform: val(form, "platform"), url: val(form, "url"), start_at: val(form, "start_at"), deadline_at: val(form, "deadline_at"), status: "pendiente", notes: val(form, "notes") })}>
          <Input name="title" placeholder="Curso" required />
          <Input name="platform" placeholder="Plataforma" />
          <Input name="url" placeholder="URL" />
          <Input name="start_at" type="datetime-local" />
          <Input name="deadline_at" type="datetime-local" />
          <Textarea name="notes" placeholder="Notas" />
          <Button>Crear curso</Button>
        </FieldForm>
      }
    >
      {courses.length ? courses.map((item) => {
        const tags = splitTags(item.tags);
        const location = [item.modalidad, item.localidad || item.provincia].filter(Boolean).join(" - ");
        const dates = [
          item.fecha_inicio || item.start_at ? `Inicio ${formatDateLabel(item.fecha_inicio || item.start_at)}` : null,
          item.fecha_fin || item.deadline_at ? `Fin ${formatDateLabel(item.fecha_fin || item.deadline_at)}` : null,
        ].filter(Boolean).join(" - ");
        const readOnlyTechItem = item.sourceTable === "tech_opportunities";
        const url = item.fuente_url || item.url;

        return (
          <Row
            key={item.id}
            title={item.title}
            meta={[item.entidad || item.platform || "Sin entidad", location, dates || "Sin fecha limite"].filter(Boolean).join(" - ")}
            badge={item.status}
            note={item.notes}
            details={
              <div className="flex flex-wrap gap-2">
                {item.prioridad ? <Badge className={genericPriorityClass(item.prioridad)}>Prioridad {priorityText(item.prioridad)}</Badge> : null}
                {item.encaje_daw_1_5 ? <Badge>Encaje DAW {item.encaje_daw_1_5}/5</Badge> : null}
                {item.horas_totales ? <Badge>{item.horas_totales} h</Badge> : null}
                {item.certificacion_tipo ? <Badge>{item.certificacion_tipo}</Badge> : null}
                {item.practicas_empresa === true ? <Badge>Practicas</Badge> : null}
                {tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
              </div>
            }
            actions={
              <>
                {url && <Button asChild size="sm" variant="outline"><a href={url} target="_blank" rel="noreferrer">Abrir</a></Button>}
                {!readOnlyTechItem && <Button type="button" size="sm" variant="outline" onClick={() => actions.updateCourse(item.id, { status: "terminado" })}>Terminado</Button>}
              </>
            }
          />
        );
      }) : <EmptyText>No hay cursos guardados.</EmptyText>}
    </CrudGrid>
  );
}

function Hackathons({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const [province, setProvince] = useState("");
  const [status, setStatus] = useState("");
  const hackathons = useMemo(() => getDisplayHackathons(store.hackathons, store.techOpportunities), [store.hackathons, store.techOpportunities]);
  const list = hackathons.filter((item) => (!province || item.province === province) && (!status || item.status === status));

  return (
    <Section title="Hackathons">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={province} onChange={(event) => setProvince(event.target.value)}>
          <option value="">Todas las provincias</option>
          {Array.from(new Set(hackathons.map((item) => item.province).filter(Boolean))).sort().map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos los estados</option>
          {["inscripcion_abierta", "pendiente", "realizado", "revisar_futura_edicion", "descartado"].map((item) => <option key={item}>{item}</option>)}
        </Select>
      </div>
      <CrudGrid
        form={
          <FieldForm action={(form) => actions.addHackathon({ name: val(form, "name"), organizer: val(form, "organizer"), province: val(form, "province") || "Granada", city: val(form, "city"), status: "revisar_futura_edicion", priority: "media", start_at: val(form, "start_at"), end_at: val(form, "end_at"), registration_deadline_at: val(form, "registration_deadline_at"), url: val(form, "url"), notes: val(form, "notes") })}>
            <Input name="name" placeholder="Nombre" required />
            <Input name="organizer" placeholder="Organizador" />
            <div className="grid grid-cols-2 gap-2">
              <Input name="province" placeholder="Provincia" />
              <Input name="city" placeholder="Ciudad" />
            </div>
            <Input name="url" placeholder="Link" />
            <Input name="start_at" type="datetime-local" />
            <Input name="end_at" type="datetime-local" />
            <Input name="registration_deadline_at" type="datetime-local" />
            <Textarea name="notes" placeholder="Notas" />
            <Button>Crear hackathon</Button>
          </FieldForm>
        }
      >
        <div className="space-y-3">
          {list.length ? list.map((item) => {
            const tags = splitTags(item.tags);
            const place = [item.localidad || item.city, item.province].filter(Boolean).join(", ");
            const dates = [
              item.start_at ? `Inicio ${formatDateLabel(item.start_at)}` : null,
              item.end_at ? `Fin ${formatDateLabel(item.end_at)}` : null,
              item.inscripcion_hasta || item.registration_deadline_at ? `Inscripcion ${formatDateLabel(item.inscripcion_hasta || item.registration_deadline_at)}` : null,
            ].filter(Boolean).join(" - ");
            const readOnlyTechItem = item.sourceTable === "tech_opportunities";

            return (
              <Row
                key={item.id}
                title={item.name}
                meta={[item.organizer || "Sin organizador", place || "Sin provincia", dates].filter(Boolean).join(" - ")}
                badge={item.status}
                note={item.notes}
                details={
                  <div className="flex flex-wrap gap-2">
                    <Badge className={genericPriorityClass(item.priority)}>Prioridad {priorityText(item.priority)}</Badge>
                    {item.encaje_daw_1_5 ? <Badge>Encaje DAW {item.encaje_daw_1_5}/5</Badge> : null}
                    {item.modalidad ? <Badge>{item.modalidad}</Badge> : null}
                    {item.certificacion_o_premio ? <Badge>{item.certificacion_o_premio}</Badge> : null}
                    {item.practicas_empresa === true ? <Badge>Practicas</Badge> : null}
                    {tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
                  </div>
                }
                actions={
                  <>
                    {item.url && <Button asChild size="sm" variant="outline"><a href={item.url} target="_blank" rel="noreferrer">Abrir web</a></Button>}
                    <Button type="button" size="sm" variant="outline" onClick={() => actions.addTask({ title: `Revisar ${item.name}`, due_at: addDaysKeepingTime("", 1), status: "pendiente", priority: "media", description: "Hackathon" })}>Crear tarea</Button>
                    {!readOnlyTechItem && <Button type="button" size="sm" variant="ghost" onClick={() => actions.updateHackathon(item.id, { status: "pendiente" })}>Marcar revisado</Button>}
                  </>
                }
              />
            );
          }) : <EmptyText>No hay hackathons con esos filtros.</EmptyText>}
        </div>
      </CrudGrid>
    </Section>
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
  const [notes, setNotes] = useState<BlocNote[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [settings, setSettings] = useState<BlocSettings>({ fontSize: "base", defaultLabel: "Nota" });
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Ref always holds latest notes so the unmount flush has the current value
  const notesRef = useRef<BlocNote[]>([]);
  useEffect(() => { notesRef.current = notes; });

  // Flush to localStorage on unmount (bypasses debounce so no data is lost on navigation)
  useEffect(() => {
    return () => {
      if (notesRef.current.length > 0) {
        localStorage.setItem(blocKey, JSON.stringify(notesRef.current));
      }
    };
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(blocKey);
    const rawSettings = localStorage.getItem(blocSettingsKey);
    const savedNotes: BlocNote[] = raw ? (safeJson(raw) ?? []) : [];
    const loadedSettings: BlocSettings = rawSettings
      ? (safeJson(rawSettings) ?? { fontSize: "base", defaultLabel: "Nota" })
      : { fontSize: "base", defaultLabel: "Nota" };
    setSettings(loadedSettings);
    if (savedNotes.length === 0) {
      const first: BlocNote = { id: makeId(), label: "Nota 1", content: "", updated_at: nowIso() };
      setNotes([first]);
      setActiveId(first.id);
    } else {
      setNotes(savedNotes);
      setActiveId(savedNotes[0].id);
    }
    setLoaded(true);
  }, []);

  // Auto-save notes with debounce (400ms after last change)
  useEffect(() => {
    if (notes.length === 0) return;
    const tid = setTimeout(() => {
      localStorage.setItem(blocKey, JSON.stringify(notes));
    }, 400);
    return () => clearTimeout(tid);
  }, [notes]);

  function saveSettings(next: BlocSettings) {
    setSettings(next);
    localStorage.setItem(blocSettingsKey, JSON.stringify(next));
  }

  function handleContentChange(content: string) {
    setNotes((prev) => prev.map((n) => n.id === activeId ? { ...n, content, updated_at: nowIso() } : n));
  }

  function renameNote(id: string, label: string) {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, label } : n));
  }

  function addNote() {
    const note: BlocNote = { id: makeId(), label: settings.defaultLabel || "Nota", content: "", updated_at: nowIso() };
    setNotes((prev) => [...prev, note]);
    setActiveId(note.id);
  }

  function deleteNote(id: string) {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (next.length === 0) {
        const fresh: BlocNote = { id: makeId(), label: "Nota 1", content: "", updated_at: nowIso() };
        setActiveId(fresh.id);
        return [fresh];
      }
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
  }

  if (!loaded) {
    return (
      <Section title="Bloc">
        <div className="h-64 rounded-lg border border-dashed flex items-center justify-center text-sm text-muted-foreground">
          Cargando notas...
        </div>
      </Section>
    );
  }

  const activeNote = notes.find((n) => n.id === activeId) ?? null;
  const fontClass = { sm: "text-sm", base: "text-base", lg: "text-lg" }[settings.fontSize];

  return (
    <Section title="Bloc">
      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
        {/* Note list sidebar */}
        <Card className="p-3">
          <div className="space-y-1">
            {notes.map((note) => (
              <div key={note.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    "flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    note.id === activeId ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                  onClick={() => setActiveId(note.id)}
                >
                  {note.label || "Sin título"}
                </button>
                {notes.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteNote(note.id)}
                    aria-label="Eliminar nota"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start border border-dashed text-muted-foreground"
            onClick={addNote}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nueva nota
          </Button>
          <div className="mt-3 border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs text-muted-foreground"
              onClick={() => setShowSettings((v) => !v)}
            >
              {showSettings ? "Cerrar ajustes" : "Ajustes"}
            </Button>
          </div>
        </Card>

        {/* Editor */}
        <div className="space-y-2">
          {activeNote && (
            <>
              <Input
                value={activeNote.label}
                onChange={(e) => renameNote(activeNote.id, e.target.value)}
                placeholder="Nombre de la nota"
                className="font-medium"
              />
              <Textarea
                value={activeNote.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className={cn("min-h-[340px] resize-y font-mono", fontClass)}
                placeholder="Escribe aquí..."
              />
              <p className="text-xs text-muted-foreground">
                Guardado automáticamente · Última edición: {new Date(activeNote.updated_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </>
          )}

          {showSettings && (
            <Card className="p-4 space-y-4">
              <h3 className="text-sm font-medium">Ajustes del bloc</h3>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Tamaño de fuente</p>
                <SegmentedTabs<BlocSettings["fontSize"]>
                  value={settings.fontSize}
                  setValue={(v) => saveSettings({ ...settings, fontSize: v })}
                  tabs={[["sm", "Pequeño"], ["base", "Normal"], ["lg", "Grande"]]}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Nombre por defecto de nuevas notas</p>
                <Input
                  value={settings.defaultLabel}
                  onChange={(e) => saveSettings({ ...settings, defaultLabel: e.target.value })}
                  placeholder="Nota"
                  className="h-8 text-sm"
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </Section>
  );
}

function Settings({ reset }: { reset: () => void }) {
  const { settings, updateSettings } = useAppSettings();

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
          <p className="text-xs text-muted-foreground">Aparece en el saludo del panel principal.</p>
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

function getDisplayCourses(courses: Course[], items: TechOpportunity[]) {
  const seen = new Set(courses.map(courseIdentityKey));
  const fromTech = items
    .filter(isTechCourse)
    .map(techOpportunityToCourse)
    .filter((course) => !seen.has(courseIdentityKey(course)));

  return [...fromTech, ...courses].sort(sortCoursesForDisplay);
}

function getDisplayHackathons(hackathons: Hackathon[], items: TechOpportunity[]) {
  const seen = new Set(hackathons.map(hackathonIdentityKey));
  const fromTech = items
    .filter(isTechHackathonOrEvent)
    .map(techOpportunityToHackathon)
    .filter((hackathon) => !seen.has(hackathonIdentityKey(hackathon)));

  return [...fromTech, ...hackathons].sort(sortHackathonsForDisplay);
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
  if (isTechHackathon(item)) return "hackathon";
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
  return normalizedIdentity(course.id_slug, course.fuente_url, course.url, course.title);
}

function hackathonIdentityKey(hackathon: Hackathon) {
  return normalizedIdentity(hackathon.id_slug, hackathon.url, hackathon.name);
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

function splitTags(value?: string | string[]) {
  const raw = Array.isArray(value) ? value : String(value || "").split("|");
  return raw.map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
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

function genericPriorityClass(value?: string) {
  const priority = normalizePriorityText(value);
  if (priority.includes("alta")) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (priority.includes("baja")) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
}


function toTaskBucket(value?: string): TaskBucket {
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
  return Boolean(date) && date! >= dashboardHackathonCutoff && hackathon.status !== "realizado" && hackathon.status !== "descartado";
}

function sortTasks(a: Task, b: Task) {
  return String(a.due_at || "9999").localeCompare(String(b.due_at || "9999"));
}

function sortEvents(a: CalendarEvent, b: CalendarEvent) {
  return a.date_at.localeCompare(b.date_at);
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
  if (type === "task" && status === "completada") return "bg-slate-100 text-slate-700 line-through";
  if (type === "task") return "bg-blue-100 text-blue-800";
  if (type === "course") return "bg-emerald-100 text-emerald-800";
  if (type === "event") return "bg-violet-100 text-violet-800";
  if (type === "google") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-900";
}

function calendarDotClass(type: CalendarEvent["type"], status?: string) {
  if (type === "task" && status === "completada") return "bg-slate-400";
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
