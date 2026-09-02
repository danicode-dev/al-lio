"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Building2, CalendarDays, Flame, Heart, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateKey, formatDateLabel, isPastActionDate, isWithinUpcomingWindow, todayKey } from "@/lib/catalog/date-filters";
import { getCoursePresentation, getDisplayCourses } from "@/features/courses/presentation";
import { CatalogCard, CatalogFact, CatalogFavoriteButton, CatalogFeaturedCard } from "@/components/catalog/catalog-card";
import { CollectionControls, FilterChips, FilterPanelCompact } from "@/components/catalog/collection-controls";
import type { Course, Store } from "@/components/store/types";
import {
  canToggleCourseFavorite,
  capitalizeFirst,
  COURSE_EMPTY_STYLES,
  courseHeroImage,
  isCourseArchived,
  selectFeaturedCourse,
  sortCoursesByStart,
  toggleCourseFavoriteFor,
  type CoursesActions,
} from "./course-catalogue-model";

function isCoursePast(course: Pick<Course, "fecha_fin" | "deadline_at" | "fecha_inicio" | "start_at">) {
  return isPastActionDate(course.fecha_fin || course.deadline_at || course.fecha_inicio || course.start_at);
}
import { FilterDateRow } from "./courses-filter-controls";

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

  const sorted = useMemo(() => sortCoursesByStart(allCourses), [allCourses]);

  // The four control-row entries double as the KPI counts and the filter
  // tabs: Total (current courses - not finished, not past), Empezados and
  // Próx. inicio (starts within 30 days) as subsets of it, plus the
  // heart-driven Guardados. "Terminado" is no longer its own tab - it
  // stays reachable through the Estado filter.
  const total = useMemo(() => sorted.filter((c) => !isCourseArchived(c) && !isCoursePast(c)), [sorted]);
  const guardados = useMemo(() => sorted.filter((c) => c.is_favorite), [sorted]);
  const empezados = useMemo(() => total.filter((c) => c.status === "empezado"), [total]);
  const proximos = useMemo(() => {
    const now = new Date();
    return total.filter((c) => isWithinUpcomingWindow(c.fecha_inicio || c.start_at, now));
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
  const featuredCourse = useMemo(
    () => (showFeatured ? selectFeaturedCourse(filtered, todayKey()) : null),
    [showFeatured, filtered]
  );
  const gridCourses = useMemo(
    () => (featuredCourse ? filtered.filter((c) => c.id !== featuredCourse.id) : filtered),
    [filtered, featuredCourse]
  );

  function clearAll() {
    setMonthFilter(""); setDayFilter(""); setEstadoFilter(""); setModalidadFilter(""); setSoloGratuitos(false); setSearchInput(""); setSearch("");
  }

  return (
    <>
      <style>{COURSE_EMPTY_STYLES}</style>
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

export { Courses };
