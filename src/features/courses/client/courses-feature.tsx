"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Flame, Heart, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNextCatalogItem } from "@/lib/catalog/next-item";
import { Badge } from "@/components/ui/badge";
import { isSafeHttpUrl } from "@/lib/fp/event-cta";
import { getCoursePresentation, getDisplayCourses } from "@/features/courses/presentation";
import { useCourseActions, type CourseActions } from "@/features/courses/client";
import { useLearningActions, type LearningActions } from "@/features/learning/client";
import { useApplicationStore } from "@/shared/store/application-store";
import { StudentHeaderActions } from "@/components/student-header-actions";
import { PageHeader } from "@/components/page-header";
import { CatalogCard, CatalogFact, CatalogFavoriteButton, CatalogFeaturedCard, CatalogInfoGrid, CatalogNextLink, CatalogPanel } from "@/components/catalog/catalog-card";
import { CollectionControls, FilterChips, FilterPanelCompact } from "@/components/catalog/collection-controls";
import type { Course, Store } from "@/components/store/types";
import { FeaturePage } from "@/shared/ui/feature-page";

function courseStatusClass(status: string) {
  if (status === "empezado") return "al-course-chip-terracotta";
  if (status === "terminado") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  if (status === "pausado") return "al-course-chip-amber";
  if (status === "descartado") return "border-red-500/30 bg-red-500/10 text-red-700";
  return "";
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

function FilterDateRow({
  dayFilter,
  datesWithItems,
  onDaySelect,
}: {
  dayFilter: string;
  datesWithItems: Set<string>;
  onDaySelect: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center">
        <button type="button" className="al-fp-date-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <CalendarDays />
          {dayFilter ? formatDateLabel(dayFilter) : "Cualquier fecha"}
          <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
        {dayFilter && (
          <button type="button" className="al-fp-date-clear" onClick={() => onDaySelect("")}>
            Quitar
          </button>
        )}
      </div>
      {open && (
        <div className="al-fp-date-cal">
          <FilterCalendar datesWithItems={datesWithItems} dayFilter={dayFilter} onDaySelect={onDaySelect} />
        </div>
      )}
    </div>
  );
}

type CoursesActions = CourseActions & LearningActions;

function Courses({ store, actions }: { store: Store; actions: CoursesActions }) {
  const allCourses = useMemo(
    () => getDisplayCourses(store.courses, store.techOpportunities, store.fpContent),
    [store.courses, store.techOpportunities, store.fpContent]
  );

  const [viewTab, setViewTab] = useState<"total" | "empezados" | "proximos" | "guardados">("total");
  const [showFilters, setShowFilters] = useState(false);
  const [monthFilter, setMonthFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [modalidadFilter, setModalidadFilter] = useState("");
  const [soloGratuitos, setSoloGratuitos] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

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

  // The four control-row entries double as the KPI counts and the filter
  // tabs: Total (current courses - not finished, not past), Empezados and
  // Próx. inicio (starts within 30 days) as subsets of it, plus the
  // heart-driven Guardados. "Terminado" is no longer its own tab - it
  // stays reachable through the Estado filter.
  const total = useMemo(() => sorted.filter((c) => !isCourseArchived(c) && !isCoursePast(c)), [sorted]);
  const guardados = useMemo(() => sorted.filter((c) => c.is_favorite), [sorted]);
  const empezados = useMemo(() => total.filter((c) => c.status === "empezado"), [total]);
  const proximos = useMemo(() => {
    const t = todayKey();
    const i30 = dateKey(addDays(new Date(), 30).toISOString());
    return total.filter((c) => {
      const d = (c.fecha_inicio || c.start_at || "").slice(0, 10);
      return d >= t && d <= i30;
    });
  }, [total]);
  const tabBase = useMemo(
    () => viewTab === "empezados" ? empezados : viewTab === "proximos" ? proximos : viewTab === "guardados" ? guardados : total,
    [viewTab, empezados, proximos, guardados, total]
  );

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
      if (soloGratuitos) {
        const coste = (c.coste || "").toLowerCase().trim();
        if (coste && coste !== "gratis" && coste !== "0" && coste !== "gratuito" && coste !== "free") return false;
      }
      return true;
    });
  }, [tabBase, search, monthFilter, dayFilter, estadoFilter, modalidadFilter, soloGratuitos]);

  const activeFilterCount = [monthFilter, dayFilter, estadoFilter, modalidadFilter, soloGratuitos].filter(Boolean).length;

  // One featured course above the grid: the next one due to start, breaking
  // ties by priority. Only on the untouched Total view - once the student
  // picks another tab, searches or filters, every result is shown flat.
  const showFeatured = viewTab === "total" && !search && activeFilterCount === 0;
  const featuredCourse = useMemo(() => {
    if (!showFeatured) return null;
    const pool = filtered.filter((c) => !isCourseArchived(c) && c.status !== "terminado");
    if (!pool.length) return null;
    const rank = (c: Course) => {
      const p = normalizePriorityText(c.prioridad);
      return p.includes("alta") ? 0 : p.includes("baja") ? 2 : 1;
    };
    const startKey = (c: Course) => (c.fecha_inicio || c.start_at || "").slice(0, 10);
    const today = todayKey();
    // The course that is actually about to happen: the soonest one that has
    // not started yet, ties broken by priority. This is cycle-specific, so
    // every grade features its own next course instead of a shared, already
    // running one winning on an old start date.
    const upcoming = pool
      .filter((c) => startKey(c) >= today)
      .sort((a, b) => (startKey(a) || "9999-12-31").localeCompare(startKey(b) || "9999-12-31") || rank(a) - rank(b));
    if (upcoming.length) return upcoming[0];
    // Nothing on the horizon: the highest-priority active course, most
    // recently started first - still specific to this cycle.
    return [...pool].sort((a, b) => rank(a) - rank(b) || startKey(b).localeCompare(startKey(a)))[0] ?? null;
  }, [showFeatured, filtered]);
  const gridCourses = useMemo(
    () => (featuredCourse ? filtered.filter((c) => c.id !== featuredCourse.id) : filtered),
    [filtered, featuredCourse]
  );

  function clearAll() {
    setMonthFilter(""); setDayFilter(""); setEstadoFilter(""); setModalidadFilter(""); setSoloGratuitos(false); setSearchInput(""); setSearch("");
  }

  return (
    <>
      <style>{`
        .al-course-empty { min-height: 320px; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
        .al-course-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
        .al-course-empty-illustration { width: 100%; max-width: 280px; height: auto; }
        .al-course-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
        .al-course-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
        .al-course-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; border: 1px solid var(--al-action-soft-border); cursor: pointer; }
      `}</style>
      <div className="al-catalog-view space-y-4">
        <div className="al-cc-shell">
          <CollectionControls
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Buscar título, entidad, tag..."
            tabs={[
              { id: "total", label: "Total", count: total.length },
              { id: "empezados", label: "Empezados", count: empezados.length },
              { id: "proximos", label: "Próx. inicio", count: proximos.length },
              { id: "guardados", label: "Guardados", count: guardados.length },
            ]}
            activeTab={viewTab}
            onTabChange={(id) => { setViewTab(id as typeof viewTab); clearAll(); }}
            filterCount={activeFilterCount}
            filtersOpen={showFilters}
            onToggleFilters={() => setShowFilters((v) => !v)}
          />

          {showFilters && (
            <FilterPanelCompact activeCount={activeFilterCount} onClear={clearAll} onClose={() => setShowFilters(false)}>
              <div>
                <p className="al-fp-row-label">Estado</p>
                <FilterChips
                  options={[["", "Todos"], ["pendiente", "Pendiente"], ["empezado", "Activo"], ["terminado", "Terminado"], ["pausado", "Pausado"]]}
                  value={estadoFilter}
                  onChange={setEstadoFilter}
                />
              </div>
              {modalidades.length > 0 && (
                <div>
                  <p className="al-fp-row-label">Modalidad</p>
                  <FilterChips
                    options={[["", "Todas"], ...modalidades.map((m): [string, string] => [m, m])]}
                    value={modalidadFilter}
                    onChange={setModalidadFilter}
                  />
                </div>
              )}
              <div>
                <p className="al-fp-row-label">Fecha de inicio</p>
                <FilterDateRow
                  dayFilter={dayFilter}
                  datesWithItems={datesWithItems}
                  onDaySelect={(d) => { setDayFilter(d); if (d) setMonthFilter(""); }}
                />
              </div>
              <div>
                <p className="al-fp-row-label">Solo</p>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input type="checkbox" checked={soloGratuitos} onChange={(e) => setSoloGratuitos(e.target.checked)} className="rounded" />
                  Gratuitos
                </label>
              </div>
            </FilterPanelCompact>
          )}
        </div>

        <div className="min-w-0 space-y-4">
            {featuredCourse && (() => {
              const fp = getCoursePresentation(featuredCourse);
              return (
                <CatalogFeaturedCard
                  imageSrc={courseHeroImage(featuredCourse)}
                  tag={<><Flame className="h-3 w-3" />Destacado</>}
                  title={fp.title}
                  subtitle={fp.provider}
                  status={<span className={cn("al-catalog-status", courseStatusPillClass(featuredCourse.status))}>{capitalizeFirst(featuredCourse.status)}</span>}
                  favorite={canToggleCourseFavorite(featuredCourse) ? (
                    <CatalogFavoriteButton
                      active={!!featuredCourse.is_favorite}
                      featured
                      onClick={() => toggleCourseFavoriteFor(featuredCourse, actions)}
                    />
                  ) : undefined}
                  description={fp.description}
                  facts={(
                    <>
                      {fp.startDate && <CatalogFact icon={<CalendarDays />}>{formatDateLabel(fp.startDate)}</CatalogFact>}
                      {fp.modality && <CatalogFact icon={<Building2 />}>{fp.modality}</CatalogFact>}
                      {fp.courseDifficulty && <CatalogFact icon={<Target />}>{fp.courseDifficulty}</CatalogFact>}
                    </>
                  )}
                  detailHref={`/courses/${encodeURIComponent(featuredCourse.id)}`}
                />
              );
            })()}

            {(featuredCourse || gridCourses.length) ? (
              <div className="al-catalog-grid al-catalog-grid-cards">
                {gridCourses.map((item) => {
                  const presentation = getCoursePresentation(item);
                  return (
                    <CatalogCard
                      key={item.id}
                      title={presentation.title}
                      subtitle={presentation.provider}
                      badges={(
                        <>
                          <span className={cn("al-catalog-status", courseStatusPillClass(item.status))}>{capitalizeFirst(item.status)}</span>
                          {canToggleCourseFavorite(item) && (
                            <CatalogFavoriteButton
                              active={!!item.is_favorite}
                              onClick={() => toggleCourseFavoriteFor(item, actions)}
                            />
                          )}
                        </>
                      )}
                      facts={(
                        <>
                          {presentation.startDate && <CatalogFact icon={<CalendarDays />}>{formatDateLabel(presentation.startDate)}</CatalogFact>}
                          {presentation.modality && <CatalogFact icon={<Building2 />}>{presentation.modality}</CatalogFact>}
                          {presentation.courseDifficulty && <CatalogFact icon={<Target />}>{presentation.courseDifficulty}</CatalogFact>}
                        </>
                      )}
                      detailHref={`/courses/${encodeURIComponent(item.id)}`}
                    />
                  );
                })}
              </div>
            ) : viewTab === "guardados" && !search && activeFilterCount === 0 ? (
              <div className="al-course-empty">
                <span className="al-course-empty-icon"><Heart className="h-6 w-6" /></span>
                <p className="al-course-empty-title">No tienes cursos guardados</p>
                <p className="al-course-empty-desc">Toca el corazón de un curso para guardarlo aquí, sin importar su estado o progreso.</p>
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
      </div>
    </>
  );
}

function courseStatusPillClass(status: Course["status"]): string {
  const classes: Record<Course["status"], string> = {
    pendiente: "al-catalog-status-pending",
    empezado: "al-catalog-status-active",
    terminado: "al-catalog-status-complete",
    pausado: "al-catalog-status-muted",
    descartado: "al-catalog-status-dismissed",
  };
  return classes[status];
}

function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function opportunityLifecycleLabel(value?: string): string | undefined {
  const labels: Record<string, string> = {
    announced: "Anunciado",
    registration_open: "Inscripción abierta",
    registration_closed: "Inscripción cerrada",
    ongoing: "En curso",
    completed: "Finalizado",
    cancelled: "Cancelado",
    postponed: "Aplazado",
    evergreen: "Disponible sin convocatoria",
  };
  return value ? labels[value] : undefined;
}

const COURSE_HERO_POOL = { desarrollo: 5, administracion: 5, marketing: 6, deporte: 7, generico: 6 } as const;

function courseHeroFamily(course: Course): keyof typeof COURSE_HERO_POOL {
  const hay = `${course.area ?? ""} ${course.category ?? ""} ${course.title ?? ""} ${Array.isArray(course.tags) ? course.tags.join(" ") : course.tags ?? ""}`
    .toLowerCase().normalize("NFD").replace(new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g"), "");
  if (/desarroll|program|web|software|java|kotlin|frontend|backend|\bapp\b|\bdev\b|\bdam\b|\bdaw\b/.test(hay)) return "desarrollo";
  if (/administr|finan|contab|excel|gestion|factur|\baf\b/.test(hay)) return "administracion";
  if (/marketing|publicidad|redes sociales|campan|\bmp\b/.test(hay)) return "marketing";
  if (/deport|fitness|entrenam|fisic|gimnas|salud|tsaf/.test(hay)) return "deporte";
  return "generico";
}

function courseHeroImage(course: Course): string {
  const family = courseHeroFamily(course);
  const key = course.id_slug || course.id || course.title || "x";
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const index = (Math.abs(hash) % COURSE_HERO_POOL[family]) + 1;
  return `/assets/cursos/curso-hero-${family}-${index}.jpg`;
}

export function canToggleCourseFavorite(item: Course): boolean {
  if (item.sourceTable === "tech_opportunities") return false;
  if (item.sourceTable === "fp_content_items") return !!item.id_slug;
  return true;
}

export function toggleCourseFavoriteFor(item: Course, actions: CoursesActions) {
  if (item.sourceTable === "fp_content_items") {
    actions.toggleFpFavorite(item.id_slug!, !item.is_favorite);
  } else {
    actions.toggleCourseFavorite(item.id);
  }
}

export function CourseDetailView({ id }: { id: string }) {
  const { store } = useApplicationStore();
  const actions = { ...useCourseActions(), ...useLearningActions() };
  const allCourses = useMemo(
    () => getDisplayCourses(store.courses, store.techOpportunities, store.fpContent),
    [store.courses, store.techOpportunities, store.fpContent]
  );
  const item = useMemo(() => allCourses.find((c) => c.id === id) ?? null, [allCourses, id]);

  if (!item) {
    return (
      <div className="space-y-4">
        <style>{`
          .al-course-empty { min-height: 320px; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
          .al-course-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
          .al-course-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
          .al-course-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
          .al-course-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; border: 1px solid var(--al-action-soft-border); cursor: pointer; text-decoration: none; }
        `}</style>
        <PageHeader
          eyebrow="Cursos"
          title="Curso no disponible"
          actions={
            <div className="hidden md:flex md:items-center md:gap-2">
              <StudentHeaderActions />
            </div>
          }
        />
        <div className="al-course-empty">
          <span className="al-course-empty-icon"><BookOpen className="h-6 w-6" /></span>
          <p className="al-course-empty-title">Ya no podemos mostrar este curso</p>
          <p className="al-course-empty-desc">Puede haberse retirado del catálogo o no estar disponible para tu ciclo. Vuelve al listado para ver los cursos activos.</p>
          <Link href="/courses" className="al-course-empty-btn">Volver a Cursos</Link>
        </div>
      </div>
    );
  }

  const presentation = getCoursePresentation(item);
  const canFavorite = canToggleCourseFavorite(item);
  const archived = isCourseArchived(item);
  const aptitudes = item.aptitudes ?? [];

  const learnings = [...new Set([
    ...presentation.learningOutcomes,
    ...aptitudes.filter((a) => a.relation === "ensena").map((a) => a.titulo),
  ].filter(Boolean))];
  const requirements = [...new Set([
    ...(presentation.minimumEducation ? [`Formación mínima: ${presentation.minimumEducation}`] : []),
    ...presentation.otherEligibility,
    ...presentation.requirements,
  ].filter(Boolean))];
  const startKey = (presentation.startDate ?? "").slice(0, 10);
  const daysUntil = startKey ? Math.ceil((new Date(`${startKey}T00:00:00`).getTime() - Date.now()) / 86_400_000) : null;
  const nextCourse = getNextCatalogItem(allCourses, item.id);
  const infoRows: Array<[string, string | undefined]> = [
    ["Certificación", presentation.certification],
    ["Nivel de la acreditación", presentation.credentialLevel],
    ["Modalidad", presentation.modality],
    ["Entidad", presentation.provider],
    ["Duración", presentation.duration],
    ["Precio", presentation.price],
    ["Disponibilidad", opportunityLifecycleLabel(presentation.lifecycle)],
  ];
  const overviewRows = [
    presentation.startDate ? { label: "Fechas", value: `${formatDateLabel(presentation.startDate)}${presentation.endDate ? ` → ${formatDateLabel(presentation.endDate)}` : ""}` } : null,
    presentation.location ? { label: "Ubicación", value: presentation.location } : null,
    presentation.modality ? { label: "Modalidad", value: presentation.modality } : null,
    presentation.courseDifficulty ? { label: "Dificultad", value: presentation.courseDifficulty } : null,
    presentation.minimumEducation ? { label: "Formación mínima", value: presentation.minimumEducation } : null,
    presentation.duration ? { label: "Duración", value: presentation.duration } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <div className="space-y-5">
      <Link href="/courses" className="inline-flex items-center gap-1 text-xs font-semibold text-[#6b6f72] transition hover:text-[#c94f21]">
        <ChevronLeft className="h-3.5 w-3.5" />Cursos
      </Link>
      <PageHeader
        eyebrow="Curso"
        title={presentation.title}
        subtitle={presentation.provider}
        actions={
          <div className="hidden md:flex md:items-center md:gap-2">
            <StudentHeaderActions />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <CatalogPanel>
            <div className="al-catalog-hero-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={courseHeroImage(item)} alt="" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn(courseStatusClass(item.status))}>{item.status}</Badge>
            </div>
            {overviewRows.length > 0 && <CatalogInfoGrid items={overviewRows} />}
          </CatalogPanel>

          {(presentation.description || learnings.length > 0 || requirements.length > 0) && (
            <div className="al-catalog-detail-cols">
            {presentation.description && <CatalogPanel title="Sobre el curso">
              <p className="whitespace-pre-wrap text-[12.5px] leading-6 text-[#4b4740]">{presentation.description}</p>
            </CatalogPanel>}
            {learnings.length > 0 && <CatalogPanel title="Qué aprenderás">
                <ul className="space-y-2">
                  {learnings.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1f7a4d]" />{t}</li>
                  ))}
                </ul>
            </CatalogPanel>}
            {requirements.length > 0 && <CatalogPanel title="Requisitos de acceso">
                <ul className="space-y-2">
                  {requirements.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9a958a]" />{t}</li>
                  ))}
                </ul>
            </CatalogPanel>}
            </div>
          )}

          {aptitudes.length > 0 && (
            <CatalogPanel title="Estructura del curso">
              <ol className="space-y-2.5">
                {aptitudes.map((a, i) => (
                  <li key={`${a.id}-${a.relation}`} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fbe7dd] text-[11px] font-bold text-[#c94f21]">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-[#111111]">{a.titulo}</p>
                      {a.descripcion && <p className="mt-0.5 text-[11.5px] leading-5 text-[#6b6f72]">{a.descripcion}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </CatalogPanel>
          )}

          {infoRows.some(([, value]) => value) && <CatalogPanel title="Información adicional">
            <CatalogInfoGrid items={infoRows.filter(([, value]) => value).map(([label, value]) => ({ label, value }))} />
          </CatalogPanel>}

        </div>

        <div className="space-y-4">
          <CatalogPanel>
            <p className="al-catalog-side-title">Estado del curso</p>
            <Badge className={cn(courseStatusClass(item.status))}>{item.status}</Badge>
            {presentation.startDate && <div>
              <p className="al-catalog-info-k">Próximo hito</p>
              <p className="al-catalog-info-v">Inicio · {formatDateLabel(presentation.startDate)}</p>
            </div>}
            {typeof daysUntil === "number" && daysUntil >= 0 && (
              <div className="rounded-xl bg-[#e7f5ee] px-3 py-2 text-[12px] font-semibold text-[#1f7a4d]">
                {daysUntil === 0 ? "Empieza hoy" : `Faltan ${daysUntil} ${daysUntil === 1 ? "día" : "días"}`}
              </div>
            )}
            <div className="flex flex-col gap-2 pt-1">
              {isSafeHttpUrl(presentation.sourceUrl) && (
                <a href={presentation.sourceUrl} target="_blank" rel="noopener noreferrer" className="al-catalog-action al-catalog-action-solid">
                  <ExternalLink className="h-3.5 w-3.5" />Abrir curso
                </a>
              )}
              {canFavorite && (
                <button
                  type="button"
                  className={cn("al-catalog-action", item.is_favorite && "al-catalog-action-soft")}
                  aria-pressed={!!item.is_favorite}
                  onClick={() => toggleCourseFavoriteFor(item, actions)}
                >
                  <Heart className="h-3.5 w-3.5" fill={item.is_favorite ? "currentColor" : "none"} />
                  {item.is_favorite ? "Guardado en favoritos" : "Guardar en favoritos"}
                </button>
              )}
              {!archived && (
                <button type="button" className="al-catalog-action" onClick={() => actions.completeCourse(item).catch(() => {})}>
                  <CheckCircle2 className="h-3.5 w-3.5" />Marcar como terminado
                </button>
              )}
            </div>
          </CatalogPanel>

          {nextCourse && (
            <CatalogPanel>
              <p className="al-catalog-side-title">Siguiente curso</p>
              <CatalogNextLink
                href={`/courses/${encodeURIComponent(nextCourse.id)}`}
                title={nextCourse.title}
                meta={(nextCourse.fecha_inicio || nextCourse.start_at)
                  ? `Inicio · ${formatDateLabel((nextCourse.fecha_inicio || nextCourse.start_at)!)}`
                  : nextCourse.entidad || "Ver curso"}
                actionLabel="Ver curso"
              />
            </CatalogPanel>
          )}
        </div>
      </div>
    </div>
  );
}

function nowIso() {
  return new Date().toISOString();
}

function normalizePriorityText(value?: string) {
  return String(value || "media").trim().toLowerCase();
}

function isCourseArchived(course: Pick<Course, "status">) {
  return course.status === "terminado" || course.status === "descartado";
}

function isCoursePast(course: Pick<Course, "fecha_fin" | "deadline_at" | "fecha_inicio" | "start_at">) {
  return isPastActionDate(course.fecha_fin || course.deadline_at || course.fecha_inicio || course.start_at);
}

function isPastActionDate(value?: string | null) {
  const date = parseDate(value ?? undefined);
  return Boolean(date) && startOfDay(date!) < startOfDay(new Date());
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(value?: string) {
  const date = parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayKey() {
  return dateKey(nowIso());
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

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function CoursesFeature() {
  const { store } = useApplicationStore();
  const actions = { ...useCourseActions(), ...useLearningActions() };
  return (
    <FeaturePage eyebrow="Formación" title="Cursos" subtitle="Formación complementaria y recursos para avanzar en tu ciclo." catalogue>
      <Courses store={store} actions={actions} />
    </FeaturePage>
  );
}
