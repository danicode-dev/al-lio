"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarClock, ChevronLeft, ChevronRight, Compass, Sparkles, Trophy } from "lucide-react";
import type { Store } from "@/components/store/types";
import { buildFeaturedHackathonCards, buildUpcomingFeed, selectDashboardTodoTasks, type FeedItem } from "@/lib/dashboard/upcoming-feed";

type CarouselSection = "upcoming" | "opportunities" | "work" | "hackathons";

type FocusCard = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
};

const sections: Array<{ id: CarouselSection; label: string; description: string; href: string; cta: string; Icon: typeof CalendarClock }> = [
  { id: "upcoming", label: "Próximos", description: "Fechas y tareas que merece la pena atender ahora.", href: "/calendar", cta: "Ver calendario", Icon: CalendarClock },
  { id: "opportunities", label: "Oportunidades", description: "Recursos que encajan con tu itinerario formativo.", href: "/courses", cta: "Explorar oportunidades", Icon: Sparkles },
  { id: "work", label: "Trabajo", description: "Empresas para orientar tu próxima búsqueda.", href: "/work", cta: "Abrir Trabajo", Icon: BriefcaseBusiness },
  { id: "hackathons", label: "Eventos y retos", description: "Retos y eventos para aprender haciendo y ganar visibilidad.", href: "/hackathons", cta: "Ver eventos y retos", Icon: Trophy },
];

function dayValue(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shortDate(value?: string | null) {
  const date = dayValue(value);
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(date);
}

function feedKindLabel(kind: FeedItem["kind"]) {
  if (kind === "task") return "Tarea";
  if (kind === "course") return "Curso";
  return "Evento o reto";
}

function feedKindFallbackDetail(kind: FeedItem["kind"]) {
  if (kind === "task") return "Organización";
  if (kind === "course") return "Formación";
  return "Reto tecnológico";
}

// Shared between the Upcoming and Events/challenges sections - both draw
// from src/lib/dashboard/upcoming-feed.ts, which returns source-agnostic
// data (never presentation strings), so the eyebrow/detail formatting lives
// here rather than duplicated per section.
function toFocusCard(item: FeedItem): FocusCard {
  return {
    id: item.id,
    eyebrow: `${feedKindLabel(item.kind)} · ${item.date ? shortDate(item.date) : "Guardado"}`,
    title: item.title,
    detail: item.detail || feedKindFallbackDetail(item.kind),
    href: item.href,
  };
}

function contentTypeLabel(value: string | null | undefined) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("curso")) return "Curso";
  if (normalized.includes("beca")) return "Beca";
  if (normalized.includes("evento")) return "Evento";
  if (normalized.includes("práctica") || normalized.includes("practica")) return "Prácticas";
  return value || "Oportunidad";
}

function dateSort(a?: string | null, b?: string | null) {
  return (dayValue(a)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (dayValue(b)?.getTime() ?? Number.MAX_SAFE_INTEGER);
}

function buildCards(store: Store): Record<CarouselSection, FocusCard[]> {
  const today = new Date();

  const todoTaskIds = new Set(selectDashboardTodoTasks(store.tasks).map((task) => task.id));
  const upcoming = buildUpcomingFeed({
    tasks: store.tasks,
    courses: store.courses,
    hackathons: store.hackathons,
    fpContent: store.fpContent,
    todoTaskIds,
    today,
  }).slice(0, 3).map(toFocusCard);

  const opportunities = store.fpContent
    .filter((item) => item.user_status !== "completed" && item.user_status !== "dismissed")
    .filter((item) => {
      const end = dayValue(item.end_date);
      return !end || end >= today;
    })
    .sort((a, b) => {
      const priority = { Alta: 0, Media: 1, Baja: 2 } as const;
      return (priority[a.priority] ?? 3) - (priority[b.priority] ?? 3) || dateSort(a.start_date, b.start_date);
    })
    .slice(0, 3)
    .map((item) => ({
      id: `opportunity-${item.id}`,
      eyebrow: contentTypeLabel(item.type),
      title: item.title,
      detail: [item.entity, item.location].filter(Boolean).join(" · ") || "Recomendado para tu perfil",
      href: "/courses",
    }));

  const work = [...store.companies]
    .sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.nombre.localeCompare(b.nombre))
    .slice(0, 3)
    .map((company) => ({
      id: `company-${company.id}`,
      eyebrow: company.is_favorite ? "Empresa guardada" : "Empresa",
      title: company.nombre,
      detail: company.categoria || company.granada_note || "Explora su equipo y vacantes",
      href: "/work",
    }));

  const hackathons = buildFeaturedHackathonCards({
    hackathons: store.hackathons,
    fpContent: store.fpContent,
    today,
  }).map(toFocusCard);

  return { upcoming, opportunities, work, hackathons };
}

export function DashboardFocusCarousel({ store }: { store: Store }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const cards = useMemo(() => buildCards(store), [store]);
  const active = sections[activeIndex];
  const activeCards = cards[active.id];
  const loadFailed = active.id === "upcoming"
    ? store.loadIssues?.some((issue) => issue === "tasks" || issue === "courses" || issue === "opportunities")
    : active.id === "opportunities"
      ? store.loadIssues?.includes("opportunities")
      : active.id === "work"
        ? store.loadIssues?.includes("companies")
        : store.loadIssues?.some((issue) => issue === "hackathons" || issue === "opportunities");
  const emptyCopy = {
    upcoming: {
      title: "No tienes próximos pasos con fecha",
      detail: "Añade una tarea o revisa el calendario para organizar lo siguiente.",
    },
    opportunities: {
      title: "Aún no hay oportunidades guardadas",
      detail: "Explora recursos alineados con tu itinerario y guarda los que te interesen.",
    },
    work: {
      title: "Aún no tienes empresas para seguir",
      detail: "Empieza por guardar las que te gustaría conocer mejor.",
    },
    hackathons: {
      title: "Aún no tienes eventos o retos guardados",
      detail: "Explora retos y eventos para preparar tu próxima participación.",
    },
  }[active.id];
  const visibleEmptyCopy = loadFailed
    ? { title: "No se pudo cargar esta sección", detail: "La información guardada no se ha modificado. Reintenta desde el aviso superior." }
    : emptyCopy;

  const move = useCallback((direction: -1 | 1) => {
    setActiveIndex((index) => (index + direction + sections.length) % sections.length);
  }, []);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => move(1), 8000);
    return () => window.clearInterval(interval);
  }, [move, paused]);

  const Icon = active.Icon;
  return (
    <section
      className="flex h-full min-h-[352px] flex-col rounded-[20px] border border-[#ece7dc] bg-white p-5 shadow-[0_10px_26px_rgba(17,17,17,0.045)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      aria-label="Explora tus próximos pasos"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef6f0] text-[#1f7a4d]">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#111111]">{active.label}</p>
            <p className="mt-1 text-xs leading-5 text-[#6b6f72]">{active.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => move(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#ece7dc] text-[#6b6f72] transition hover:border-[#d7cfc2] hover:text-[#111111]" aria-label="Categoría anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => move(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#ece7dc] text-[#6b6f72] transition hover:border-[#d7cfc2] hover:text-[#111111]" aria-label="Categoría siguiente">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid flex-1 gap-2.5 sm:grid-cols-3">
        {activeCards.length ? activeCards.map((card) => (
          <Link key={card.id} href={card.href} className="group flex h-full flex-col rounded-xl border border-[#eee9df] bg-[#fcfbf8] p-3 transition hover:-translate-y-0.5 hover:border-[#f1c7b5] hover:bg-white hover:shadow-[0_8px_18px_rgba(37,30,20,0.06)]">
            <p className="truncate text-[11px] font-bold text-[#e15d2d]">{card.eyebrow}</p>
            <p className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-[#25221d]">{card.title}</p>
            <p className="mt-1.5 line-clamp-2 text-xs leading-4 text-[#777269]">{card.detail}</p>
          </Link>
        )) : (
          <div className="sm:col-span-3 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#e4dfd5] bg-[#fcfbf8] px-6 text-center">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#b1aba0] shadow-[0_4px_12px_rgba(37,30,20,0.04)]">
              <Compass className="h-4 w-4" />
            </span>
            <p className="mt-3 text-sm font-bold text-[#333029]">{visibleEmptyCopy.title}</p>
            <p className="mt-1 max-w-md text-xs leading-5 text-[#777269]">{visibleEmptyCopy.detail}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#f0ece2] pt-4">
        <div className="flex items-center gap-1.5" aria-label={`Categoría ${activeIndex + 1} de ${sections.length}`}>
          {sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={index === activeIndex ? "h-1.5 w-5 rounded-full bg-[#f06a37] transition-all" : "h-1.5 w-1.5 rounded-full bg-[#d6d0c4] transition-all hover:bg-[#a49d90]"}
              aria-label={`Mostrar ${section.label}`}
              aria-current={index === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
        <Link href={active.href} className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#e15d2d] transition hover:text-[#c6491d]">
          {active.cta} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
