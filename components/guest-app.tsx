"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FolderKanban,
  GraduationCap,
  LinkIcon,
  ListTodo,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  StickyNote,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildJobSearchUrl, type JobPlatform } from "@/lib/deeplinks/job-search-urls";
import { insertDb, updateDb, deleteDb } from "@/lib/db";

type View = "dashboard" | "work" | "courses" | "hackathons" | "tasks" | "calendar" | "links" | "sources" | "settings";
type TaskStatus = "pendiente" | "en_progreso" | "completada" | "pospuesta" | "cancelada";
type QuickAddType = "task" | "course" | "hackathon" | "company";
type LegacyRecord = Record<string, unknown>;

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
  priority: "alta" | "media" | "baja";
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
  title: string;
  platform?: string;
  url?: string;
  start_at?: string;
  deadline_at?: string;
  status: "pendiente" | "empezado" | "terminado" | "pausado" | "descartado";
  notes?: string;
  created_at: string;
};

type Hackathon = {
  id: string;
  name: string;
  organizer?: string;
  province?: string;
  city?: string;
  status: "inscripcion_abierta" | "pendiente" | "realizado" | "revisar_futura_edicion" | "descartado";
  priority: "alta" | "media" | "baja";
  start_at?: string;
  end_at?: string;
  registration_deadline_at?: string;
  url?: string;
  notes?: string;
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

type Store = {
  version: 2;
  userName?: string;
  tasks: Task[];
  opportunities: Opportunity[];
  courses: Course[];
  hackathons: Hackathon[];
  links: QuickLink[];
  reminders: unknown[];
  companies: Company[];
};

type CalendarEvent = {
  id: string;
  type: "task" | "course" | "hackathon";
  title: string;
  date_at: string;
  status?: string;
  href: string;
};

const storeKeyV2 = "techlife.store.D1OS.v2";
const legacyKeys = ["techlife.store.D1OS", "techlife.store.Dani"];
const companiesMdPath = "/data/empresas_tech_granada.md";

const emptyStore: Store = {
  version: 2,
  tasks: [],
  opportunities: [],
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

export type ReturnTypeActions = {
  addTask: (data: Omit<Task, "id" | "created_at" | "progress_notes"> & { progress_notes?: ProgressNote[] }) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
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

  useEffect(() => {
    if (initialStore) {
      setStore(initialStore);
    }
  }, [initialStore]);

  const actions = {
    addTask: async (data: Omit<Task, "id" | "created_at" | "progress_notes"> & { progress_notes?: ProgressNote[] }) => {
      setStore((current) => ({ ...current, tasks: [{ id: makeId(), created_at: nowIso(), progress_notes: [], ...data }, ...current.tasks] }));
      await insertDb("tasks", { title: data.title, description: data.description, due_date: data.due_at, priority: data.priority, status: data.status, category: "personal" }, ["/tasks", "/dashboard", "/calendar"]);
    },
    updateTask: async (id: string, data: Partial<Task>) => {
      setStore((current) => ({ ...current, tasks: patchById(current.tasks, id, data) }));
      const dbData: any = { ...data };
      if (data.due_at !== undefined) dbData.due_date = data.due_at;
      await updateDb("tasks", id, dbData, ["/tasks", "/dashboard", "/calendar"]);
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
      await updateDb("tasks", id, { description: newDesc }, ["/tasks", "/dashboard"]);
    },
    addCourse: async (data: Omit<Course, "id" | "created_at">) => {
      setStore((current) => ({ ...current, courses: [{ id: makeId(), created_at: nowIso(), ...data }, ...current.courses] }));
      await insertDb("courses", { title: data.title, platform: data.platform, url: data.url, deadline: data.deadline_at, status: data.status, notes: data.notes }, ["/courses", "/dashboard"]);
    },
    updateCourse: async (id: string, data: Partial<Course>) => {
      setStore((current) => ({ ...current, courses: patchById(current.courses, id, data) }));
      const dbData: any = { ...data };
      if (data.deadline_at !== undefined) dbData.deadline = data.deadline_at;
      await updateDb("courses", id, dbData, ["/courses", "/dashboard"]);
    },
    addHackathon: async (data: Omit<Hackathon, "id" | "created_at">) => {
      setStore((current) => ({ ...current, hackathons: [{ id: makeId(), created_at: nowIso(), ...data }, ...current.hackathons] }));
      await insertDb("hackathons", { name: data.name, organizer: data.organizer, province: data.province, city: data.city, type: "hackathon", status: data.status || "revisar_futura_edicion", event_start_date: data.start_at, event_end_date: data.end_at, registration_deadline: data.registration_deadline_at, url: data.url, notes: data.notes, priority: data.priority }, ["/hackathons", "/dashboard"]);
    },
    updateHackathon: async (id: string, data: Partial<Hackathon>) => {
      setStore((current) => ({ ...current, hackathons: patchById(current.hackathons, id, data) }));
      const dbData: any = { ...data };
      if (data.start_at !== undefined) dbData.event_start_date = data.start_at;
      if (data.end_at !== undefined) dbData.event_end_date = data.end_at;
      if (data.registration_deadline_at !== undefined) dbData.registration_deadline = data.registration_deadline_at;
      await updateDb("hackathons", id, dbData, ["/hackathons", "/dashboard"]);
    },
    addCompany: async (data: Omit<Company, "id" | "created_at" | "link_status"> & { link_status?: Company["link_status"] }) => {
      setStore((current) => ({ ...current, companies: [{ id: makeId(), created_at: nowIso(), link_status: "sin_verificar", ...data }, ...current.companies] }));
      await insertDb("opportunities", { title: data.name, company: data.name, source: data.web || "Manual", url: data.employment_url || data.web || "https://", status: "guardada", notes: data.notes, category: data.category, location: data.granada || "Granada" }, ["/work", "/dashboard"]);
    },
    updateCompany: async (id: string, data: Partial<Company>) => {
      setStore((current) => ({ ...current, companies: patchById(current.companies, id, data) }));
      const dbData: any = {};
      if (data.name) { dbData.title = data.name; dbData.company = data.name; }
      if (data.web) dbData.source = data.web;
      if (data.employment_url) dbData.url = data.employment_url;
      if (data.notes) dbData.notes = data.notes;
      if (data.category) dbData.category = data.category;
      await updateDb("opportunities", id, dbData, ["/work", "/dashboard"]);
    },
    addLink: async (data: Omit<QuickLink, "id" | "created_at">) => {
      setStore((current) => ({ ...current, links: [{ id: makeId(), created_at: nowIso(), ...data }, ...current.links] }));
      await insertDb("quick_links", data, ["/links", "/dashboard"]);
    },
    reset: () => setStore({ ...emptyStore, hackathons: seedHackathons }),
  };

  return <StoreContext.Provider value={{ store, actions }}>{children}</StoreContext.Provider>;
}

export function GuestApp({ view }: { view: View }) {
  const router = useRouter();
  const { store, actions } = useStore();
  const [hydrated, setHydrated] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const counts = useMemo(
    () => ({
      tasks: store.tasks.filter((item) => item.status !== "completada" && item.status !== "cancelada").length,
      opportunities: store.opportunities.length,
      courses: store.courses.filter((item) => item.status !== "terminado").length,
      hackathons: store.hackathons.filter((item) => item.status !== "descartado").length,
      companies: store.companies.length,
      completedToday: store.tasks.filter((item) => item.status === "completada" && isSameDay(item.completed_at, todayKey())).length,
    }),
    [store],
  );

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
                return `${prefix}, ${store.userName || "Al-Lio"}`;
              })()}
            </h1>
          </div>
        </div>
      </div>

      {view === "dashboard" && <Dashboard counts={counts} store={store} actions={actions} />}
      {view === "work" && <Work store={store} actions={actions} />}
      {view === "tasks" && <Tasks store={store} actions={actions} />}
      {view === "courses" && <Courses store={store} actions={actions} />}
      {view === "hackathons" && <Hackathons store={store} actions={actions} />}
      {view === "calendar" && <CalendarView store={store} />}
      {view === "links" && <LinksView store={store} actions={actions} />}
      {view === "sources" && <Sources />}
      {view === "settings" && <Settings reset={actions.reset} />}

      <QuickAdd open={quickAddOpen} setOpen={setQuickAddOpen} actions={actions} />
    </div>
  );
}

function Dashboard({ counts, store, actions }: { counts: Record<string, number>; store: Store; actions: ReturnTypeActions }) {
  const folders = [
    ["/work", "Trabajo", "Portales y empresas", counts.companies, Briefcase],
    ["/courses", "Cursos", "Formación pendiente", counts.courses, GraduationCap],
    ["/hackathons", "Hackathons", "Retos y eventos", counts.hackathons, FolderKanban],
    ["/tasks", "Tareas", "Pendientes y recordatorios", counts.tasks, ListTodo],
    ["/calendar", "Calendario", "Vista mensual", 0, CalendarDays],
  ] as const;

  return (
    <>
      <div className="flex flex-col mb-4">
        <p className="text-muted-foreground">Aquí tienes tu resumen operativo de hoy.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {folders.map(([href, title, text, count, Icon]) => (
          <Link 
            key={href} 
            href={href} 
            className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm hover:bg-accent/50 p-3 shadow-sm transition-colors group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                <Icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm font-medium text-foreground">{title}</span>
                <span className="truncate text-[11px] text-muted-foreground">{text} • {count ? count : "Ver"}</span>
              </div>
            </div>
            <MoreVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Tareas pendientes" value={counts.tasks} />
        <Summary label="Hecho hoy" value={counts.completedToday} />
        <Summary label="Cursos pendientes" value={counts.courses} />
        <Summary label="Empresas guardadas" value={counts.companies} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <WeeklyTodo store={store} actions={actions} />
        <MonthPanel store={store} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <DoneToday store={store} />
        <MonthlyProgress store={store} />
      </div>
    </>
  );
}

function WeeklyTodo({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const tasks = getUpcomingTasks(store.tasks, 7).slice(0, 8);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">To-do pendiente esta semana</h2>
          <p className="text-sm text-muted-foreground">Acciones rapidas sin salir del panel.</p>
        </div>
        <Badge>{tasks.length}</Badge>
      </div>
      <div className="space-y-3">
        {tasks.length ? tasks.map((task) => <TaskActionCard key={task.id} task={task} actions={actions} compact />) : <EmptyText>No hay tareas fechadas para esta semana.</EmptyText>}
      </div>
    </Card>
  );
}

function MonthPanel({ store }: { store: Store }) {
  const month = startOfMonth(new Date());
  const events = getCalendarEvents(store).filter((event) => isSameMonth(event.date_at, month)).sort(sortEvents).slice(0, 5);
  const eventDays = new Set(events.map((item) => dateKey(item.date_at)));

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h2 className="text-base font-semibold">{monthTitle(month)}</h2>
        <p className="text-sm text-muted-foreground">Fechas clave del mes.</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["L", "M", "X", "J", "V", "S", "D"].map((day) => <span key={day}>{day}</span>)}
        {buildMonthCells(month).map((day) => (
          <span key={day.key} className={`flex h-8 items-center justify-center rounded-md text-sm ${day.inMonth ? "bg-muted/60 text-foreground" : "text-muted-foreground/40"} ${eventDays.has(day.key) ? "bg-primary text-primary-foreground" : ""}`}>
            {day.date.getDate()}
          </span>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {events.length ? events.map((item) => <CalendarEventLink key={`${item.type}-${item.id}`} event={item} />) : <EmptyText>Sin fechas este mes.</EmptyText>}
      </div>
    </Card>
  );
}

function DoneToday({ store }: { store: Store }) {
  const completed = store.tasks.filter((item) => item.status === "completada" && isSameDay(item.completed_at, todayKey())).slice(0, 6);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Realizado hoy</h2>
          <p className="text-sm text-muted-foreground">Registro automatico al marcar una tarea como hecha.</p>
        </div>
        <Badge>{completed.length}</Badge>
      </div>
      <div className="space-y-2">
        {completed.length ? completed.map((item) => (
          <Link key={item.id} href="/calendar" className="flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 truncate font-medium">{item.title}</span>
          </Link>
        )) : <EmptyText>Aun no hay tareas completadas hoy.</EmptyText>}
      </div>
    </Card>
  );
}

function MonthlyProgress({ store }: { store: Store }) {
  const completed = store.tasks.filter((item) => item.status === "completada" && item.completed_at && isSameMonth(item.completed_at, new Date()));
  const activeDays = new Set(completed.map((item) => dateKey(item.completed_at))).size;

  return (
    <Card className="p-4">
      <h2 className="text-base font-semibold">Evolucion del mes</h2>
      <p className="text-sm text-muted-foreground">Tareas cerradas y dias con actividad.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Completadas" value={completed.length} />
        <Metric label="Dias activos" value={activeDays} />
      </div>
      <Button asChild className="mt-4 w-full" variant="outline">
        <Link href="/calendar">Ver calendario</Link>
      </Button>
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
  const pending = store.tasks.filter((item) => item.status !== "completada" && item.status !== "cancelada").sort(sortTasks);
  const completed = store.tasks.filter((item) => item.status === "completada").sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));

  return (
    <CrudGrid
      form={
        <TaskForm onCreate={(task) => actions.addTask(task)} />
      }
    >
      <div className="space-y-6">
        <div className="space-y-3">
          {pending.length ? pending.map((task) => <TaskActionCard key={task.id} task={task} actions={actions} />) : <EmptyText>No hay tareas pendientes.</EmptyText>}
        </div>
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
    </CrudGrid>
  );
}

function TaskForm({ onCreate }: { onCreate: (task: Omit<Task, "id" | "created_at" | "progress_notes">) => void }) {
  const [dueAt, setDueAt] = useState(toDatetimeLocalValue(new Date()));

  return (
    <FieldForm action={(form) => onCreate({ title: val(form, "title"), description: val(form, "description"), due_at: val(form, "due_at"), status: "pendiente", priority: (val(form, "priority") || "media") as Task["priority"] })}>
      <Input name="title" placeholder="Titulo" required />
      <div className="grid grid-cols-2 gap-2">
        <QuickDateButton label="Hoy" onClick={() => setDueAt(toDatetimeLocalValue(new Date()))} />
        <QuickDateButton label="Manana misma hora" onClick={() => setDueAt(addDaysKeepingTime(dueAt, 1))} />
        <QuickDateButton label="Manana manana" onClick={() => setDueAt(nextDayAt(9, 0))} />
        <QuickDateButton label="Manana tarde" onClick={() => setDueAt(nextDayAt(17, 0))} />
      </div>
      <Input name="due_at" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
      <Select name="priority" defaultValue="media">
        <option>alta</option>
        <option>media</option>
        <option>baja</option>
      </Select>
      <Textarea name="description" placeholder="Descripcion / notas" />
      <Button>Crear tarea</Button>
    </FieldForm>
  );
}

function TaskActionCard({ task, actions, compact }: { task: Task; actions: ReturnTypeActions; compact?: boolean }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [note, setNote] = useState("");
  const [nextDueAt, setNextDueAt] = useState(task.due_at || toDatetimeLocalValue(new Date()));

  function complete() {
    actions.updateTask(task.id, { status: "completada", completed_at: nowIso() });
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{task.title}</p>
            <Badge>{task.status}</Badge>
            {task.due_at && <Badge className="gap-1"><Clock className="h-3 w-3" />{formatShortDateTime(task.due_at)}</Badge>}
          </div>
          {task.description ? <p className="mt-1 text-sm text-muted-foreground">{task.description}</p> : null}
          {task.progress_notes?.length ? <p className="mt-2 text-xs text-muted-foreground">{task.progress_notes.length} notas de avance</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={complete}><CheckCircle2 className="h-4 w-4" />Hecho</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => actions.updateTask(task.id, { status: "pospuesta", due_at: addDaysKeepingTime(task.due_at, 1) })}><RotateCcw className="h-4 w-4" />Manana misma hora</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setRescheduleOpen((value) => !value)}>Otro dia</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setNoteOpen((value) => !value)}><StickyNote className="h-4 w-4" />Nota</Button>
        </div>
      </div>

      {rescheduleOpen && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input type="datetime-local" value={nextDueAt} onChange={(event) => setNextDueAt(event.target.value)} />
          <Button type="button" variant="outline" onClick={() => { actions.updateTask(task.id, { status: "pospuesta", due_at: nextDueAt }); setRescheduleOpen(false); }}>Guardar fecha</Button>
        </div>
      )}

      {noteOpen && (
        <div className="mt-3 space-y-2">
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Que has avanzado o que queda pendiente" />
          <Button type="button" size="sm" onClick={() => { if (note.trim()) actions.addTaskNote(task.id, note.trim()); setNote(""); setNoteOpen(false); }}>Guardar nota</Button>
        </div>
      )}

      {!compact && task.progress_notes.length ? (
        <div className="mt-3 space-y-2 border-t pt-3">
          {task.progress_notes.slice(0, 3).map((item) => (
            <p key={item.id} className="text-sm text-muted-foreground">{formatShortDateTime(item.created_at)} - {item.text}</p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function Courses({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
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
      {store.courses.length ? store.courses.map((item) => (
        <Row
          key={item.id}
          title={item.title}
          meta={`${item.platform || "Sin plataforma"} - ${item.deadline_at ? formatShortDateTime(item.deadline_at) : "Sin fecha limite"}`}
          badge={item.status}
          note={item.notes}
          actions={
            <>
              {item.url && <Button asChild size="sm" variant="outline"><a href={item.url} target="_blank" rel="noreferrer">Abrir</a></Button>}
              <Button type="button" size="sm" variant="outline" onClick={() => actions.updateCourse(item.id, { status: "terminado" })}>Terminado</Button>
            </>
          }
        />
      )) : <EmptyText>No hay cursos guardados.</EmptyText>}
    </CrudGrid>
  );
}

function Hackathons({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const [province, setProvince] = useState("");
  const [status, setStatus] = useState("");
  const list = store.hackathons.filter((item) => (!province || item.province === province) && (!status || item.status === status));

  return (
    <Section title="Hackathons">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={province} onChange={(event) => setProvince(event.target.value)}>
          <option value="">Todas las provincias</option>
          {Array.from(new Set(store.hackathons.map((item) => item.province).filter(Boolean))).sort().map((item) => <option key={item}>{item}</option>)}
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
          {list.map((item) => (
            <Row
              key={item.id}
              title={item.name}
              meta={`${item.organizer || "Sin organizador"} - ${item.province || "Sin provincia"}${item.start_at ? ` - ${formatShortDateTime(item.start_at)}` : ""}`}
              badge={item.status}
              note={item.notes}
              actions={
                <>
                  {item.url && <Button asChild size="sm" variant="outline"><a href={item.url} target="_blank" rel="noreferrer">Abrir web</a></Button>}
                  <Button type="button" size="sm" variant="outline" onClick={() => actions.addTask({ title: `Revisar ${item.name}`, due_at: addDaysKeepingTime("", 1), status: "pendiente", priority: "media", description: "Hackathon" })}>Crear tarea</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => actions.updateHackathon(item.id, { status: "pendiente" })}>Marcar revisado</Button>
                </>
              }
            />
          ))}
        </div>
      </CrudGrid>
    </Section>
  );
}

function CalendarView({ store }: { store: Store }) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const events = getCalendarEvents(store);
  const cells = buildMonthCells(month);
  const eventsByDay = groupEventsByDay(events);
  const completed = store.tasks.filter((item) => item.status === "completada" && item.completed_at && isSameMonth(item.completed_at, month));

  return (
    <Section title="Calendario">
      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">{monthTitle(month)}</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="default" onClick={async () => { await fetch("/api/seed"); window.location.reload(); }}>Añadir datos de prueba</Button>
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

function Settings({ reset }: { reset: () => void }) {
  return (
    <Section title="Configuracion">
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">Perfil activo</p>
        <p className="mt-1 font-medium">Al-Lio</p>
        <Button className="mt-4" variant="outline" onClick={reset}>Resetear datos locales</Button>
      </Card>
    </Section>
  );
}

// ReturnTypeActions hoisted up

function Summary({ label, value }: { label: string; value: number }) {
  return <Card className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md bg-muted p-3"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}

function FieldForm({ children, action }: { children: React.ReactNode; action: (data: FormData) => void }) {
  return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); action(new FormData(event.currentTarget)); event.currentTarget.reset(); }}>{children}</form>;
}

function CrudGrid({ form, children }: { form: React.ReactNode; children: React.ReactNode }) {
  return <div className="grid gap-6 lg:grid-cols-[340px_1fr]"><Card className="p-4">{form}</Card><div className="min-w-0 space-y-3">{children}</div></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-5"><h2 className="text-2xl font-semibold tracking-normal">{title}</h2>{children}</div>;
}

function Row({ title, meta, badge, note, actions }: { title: string; meta: string; badge: string; note?: string; actions?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{title}</p><Badge>{badge}</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
          {note ? <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{note}</p> : null}
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

function CalendarEventLink({ event }: { event: CalendarEvent }) {
  return (
    <Link href={event.href} className="block rounded-md border p-3 text-sm hover:bg-muted">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium">{event.title}</span>
        <Badge className="shrink-0 text-[11px]">{event.type}</Badge>
      </div>
      <p className="mt-1 text-muted-foreground">{formatShortDateTime(event.date_at)}</p>
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

function readStore(): Store {
  if (typeof window === "undefined") return { ...emptyStore, hackathons: seedHackathons };
  const current = window.localStorage.getItem(storeKeyV2);
  if (current) return normalizeStore(safeJson(current));

  for (const key of legacyKeys) {
    const raw = window.localStorage.getItem(key);
    if (raw) return migrateLegacyStore(safeJson(raw));
  }

  return { ...emptyStore, hackathons: seedHackathons };
}

function normalizeStore(value: unknown): Store {
  const raw = value as Partial<Store> | null;
  return {
    ...emptyStore,
    ...raw,
    version: 2,
    tasks: (raw?.tasks ?? []).map(normalizeTask),
    opportunities: (raw?.opportunities ?? []).map(normalizeOpportunity),
    courses: (raw?.courses ?? []).map(normalizeCourse),
    hackathons: (raw?.hackathons?.length ? raw.hackathons : seedHackathons).map(normalizeHackathon),
    links: (raw?.links ?? []).map(normalizeLink),
    companies: (raw?.companies ?? []).map(normalizeCompany),
  };
}

function migrateLegacyStore(value: unknown): Store {
  const raw = asLegacyRecord(value);
  return normalizeStore({
    version: 2,
    tasks: legacyArray(raw.tasks),
    opportunities: legacyArray(raw.opportunities),
    courses: legacyArray(raw.courses),
    hackathons: legacyArray(raw.hackathons).length ? legacyArray(raw.hackathons) : seedHackathons,
    links: legacyArray(raw.links),
    reminders: legacyArray(raw.reminders),
    companies: legacyArray(raw.companies),
  });
}

function normalizeTask(value: unknown): Task {
  const item = asLegacyRecord(value);
  const dueAt = textOr(item.due_at, dateToDefaultDateTime(item.due_date));
  return {
    id: textOr(item.id, makeId()),
    title: textOr(item.title, "Tarea"),
    description: textOr(item.description),
    due_at: dueAt,
    status: taskStatus(item.status),
    priority: priority(item.priority),
    progress_notes: legacyArray(item.progress_notes).map(normalizeProgressNote),
    created_at: textOr(item.created_at, nowIso()),
    completed_at: textOr(item.completed_at),
  };
}

function normalizeProgressNote(value: unknown): ProgressNote {
  const item = asLegacyRecord(value);
  return { id: textOr(item.id, makeId()), text: textOr(item.text), created_at: textOr(item.created_at, nowIso()) };
}

function normalizeOpportunity(value: unknown): Opportunity {
  const item = asLegacyRecord(value);
  return { id: textOr(item.id, makeId()), title: textOr(item.title, "Oferta"), company: textOr(item.company), url: textOr(item.url), status: textOr(item.status, "guardada"), location: textOr(item.location), created_at: textOr(item.created_at, nowIso()) };
}

function normalizeCourse(value: unknown): Course {
  const item = asLegacyRecord(value);
  return { id: textOr(item.id, makeId()), title: textOr(item.title, "Curso"), platform: textOr(item.platform), url: textOr(item.url), start_at: textOr(item.start_at), deadline_at: textOr(item.deadline_at, dateToDefaultDateTime(item.deadline)), status: courseStatus(item.status), notes: textOr(item.notes), created_at: textOr(item.created_at, nowIso()) };
}

function normalizeHackathon(value: unknown): Hackathon {
  const item = asLegacyRecord(value);
  return {
    id: textOr(item.id, makeId()),
    name: textOr(item.name, "Hackathon"),
    organizer: textOr(item.organizer),
    province: textOr(item.province, "Granada"),
    city: textOr(item.city),
    status: hackathonStatus(item.status),
    priority: priority(item.priority),
    start_at: textOr(item.start_at, dateToDefaultDateTime(item.event_start_date)),
    end_at: textOr(item.end_at, dateToDefaultDateTime(item.event_end_date)),
    registration_deadline_at: textOr(item.registration_deadline_at, dateToDefaultDateTime(item.registration_deadline)),
    url: textOr(item.url),
    notes: textOr(item.notes),
    created_at: textOr(item.created_at, nowIso()),
  };
}

function normalizeCompany(value: unknown): Company {
  const item = asLegacyRecord(value);
  return {
    id: textOr(item.id, stableCompanyId(textOr(item.name, textOr(item.nombre, makeId())))),
    name: textOr(item.name, textOr(item.nombre, "Empresa")),
    web: textOr(item.web),
    employment_url: textOr(item.employment_url, textOr(item.empleo)),
    employment_type: textOr(item.employment_type, textOr(item.tipo_empleo, "sin verificar")),
    category: textOr(item.category, textOr(item.categoria)),
    granada: textOr(item.granada),
    source: textOr(item.source, textOr(item.fuente)),
    notes: textOr(item.notes),
    link_status: item.link_status === "ok" || item.link_status === "revisar" ? item.link_status : "sin_verificar",
    created_at: textOr(item.created_at, nowIso()),
  };
}

function normalizeLink(value: unknown): QuickLink {
  const item = asLegacyRecord(value);
  return { id: textOr(item.id, makeId()), name: textOr(item.name, "Enlace"), url: textOr(item.url), category: textOr(item.category), created_at: textOr(item.created_at, nowIso()) };
}

async function loadCompaniesFromMarkdown(): Promise<Company[]> {
  try {
    const response = await fetch(companiesMdPath);
    if (!response.ok) return [];
    const text = await response.text();
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match) return [];
    const data = JSON.parse(match[1]) as unknown[];
    return data.map(normalizeCompany);
  } catch {
    return [];
  }
}

function getUpcomingTasks(tasks: Task[], days: number) {
  const today = startOfDay(new Date());
  const limit = addDays(today, days);
  return tasks
    .filter((task) => task.status !== "completada" && task.status !== "cancelada")
    .filter((task) => {
      const date = parseDate(task.due_at);
      return date ? date >= today && date <= limit : false;
    })
    .sort(sortTasks);
}

function getCalendarEvents(store: Store): CalendarEvent[] {
  return [
    ...store.tasks.filter((task) => task.due_at).map((task) => ({ id: task.id, type: "task" as const, title: task.status === "completada" ? `OK ${task.title}` : task.title, date_at: task.due_at || "", status: task.status, href: "/tasks" })),
    ...store.courses.flatMap((course) => [
      ...(course.start_at ? [{ id: `${course.id}-start`, type: "course" as const, title: course.title, date_at: course.start_at, status: course.status, href: "/courses" }] : []),
      ...(course.deadline_at ? [{ id: `${course.id}-deadline`, type: "course" as const, title: `Limite ${course.title}`, date_at: course.deadline_at, status: course.status, href: "/courses" }] : []),
    ]),
    ...store.hackathons.flatMap((hackathon) => [
      ...(hackathon.start_at ? [{ id: `${hackathon.id}-start`, type: "hackathon" as const, title: hackathon.name, date_at: hackathon.start_at, status: hackathon.status, href: "/hackathons" }] : []),
      ...(hackathon.registration_deadline_at ? [{ id: `${hackathon.id}-deadline`, type: "hackathon" as const, title: `Inscripcion ${hackathon.name}`, date_at: hackathon.registration_deadline_at, status: hackathon.status, href: "/hackathons" }] : []),
    ]),
  ].sort(sortEvents);
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

function asLegacyRecord(value: unknown): LegacyRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as LegacyRecord : {};
}

function legacyArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textOr(value: unknown, fallback = ""): string {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 14) return "Buenos dias, Al-Lio";
  if (hour < 21) return "Buenas tardes, Al-Lio";
  return "Buenas noches, Al-Lio";
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

function taskStatus(value: unknown): TaskStatus {
  const normalized = textOr(value);
  return ["pendiente", "en_progreso", "completada", "pospuesta", "cancelada"].includes(normalized) ? normalized as TaskStatus : "pendiente";
}

function courseStatus(value: unknown): Course["status"] {
  const normalized = textOr(value);
  return ["pendiente", "empezado", "terminado", "pausado", "descartado"].includes(normalized) ? normalized as Course["status"] : "pendiente";
}

function hackathonStatus(value: unknown): Hackathon["status"] {
  const normalized = textOr(value);
  return ["inscripcion_abierta", "pendiente", "realizado", "revisar_futura_edicion", "descartado"].includes(normalized) ? normalized as Hackathon["status"] : "revisar_futura_edicion";
}

function priority(value: unknown): Task["priority"] {
  const normalized = textOr(value);
  return ["alta", "media", "baja"].includes(normalized) ? normalized as Task["priority"] : "media";
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

function dateToDefaultDateTime(value?: unknown) {
  if (!value) return "";
  if (String(value).includes("T")) return String(value).slice(0, 16);
  return `${String(value).slice(0, 10)}T09:00`;
}

function dateKey(value?: string) {
  const date = parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayKey() {
  return dateKey(nowIso());
}

function isSameDay(value: string | undefined, key: string) {
  return Boolean(value) && dateKey(value) === key;
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

function formatLongDate(value?: string) {
  const date = parseDate(value);
  if (!date) return "sin fecha";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function calendarEventClass(type: CalendarEvent["type"], status?: string) {
  if (type === "task" && status === "completada") return "bg-slate-100 text-slate-700 line-through";
  if (type === "task") return "bg-blue-100 text-blue-800";
  if (type === "course") return "bg-emerald-100 text-emerald-800";
  return "bg-amber-100 text-amber-900";
}

function stableCompanyId(value: string) {
  return `company-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || makeId()}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
