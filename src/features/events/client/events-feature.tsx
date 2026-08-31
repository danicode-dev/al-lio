"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Flame, Heart, MapPin, Plus, Search, Trophy, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { isPreparationComplete, selectFeaturedHackathon } from "@/lib/fp/event-lifecycle";
import { isSafeHttpUrl } from "@/lib/fp/event-cta";
import { canToggleHackathonFavorite, getDisplayHackathons, getHackathonPresentation, toggleHackathonFavoriteFor } from "@/features/events/presentation";
import { useEventActions, type EventActions } from "@/features/events/client";
import { useLearningActions, type LearningActions } from "@/features/learning/client";
import { useTaskActions, type TaskActions } from "@/features/tasks/client";
import { useApplicationStore } from "@/shared/store/application-store";
import { StudentHeaderActions } from "@/components/student-header-actions";
import { PageHeader } from "@/components/page-header";
import { CatalogCard, CatalogFact, CatalogFavoriteButton, CatalogFeaturedCard, CatalogInfoGrid, CatalogNextLink, CatalogPanel } from "@/components/catalog/catalog-card";
import { CollectionControls, FilterChips, FilterPanelCompact } from "@/components/catalog/collection-controls";
import type { Hackathon, RequiredCompetency, Store } from "@/components/store/types";
import { FeaturePage } from "@/shared/ui/feature-page";

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

type EventsActions = EventActions & LearningActions & Pick<TaskActions, "addTask">;

function Hackathons({ store, actions }: { store: Store; actions: EventsActions }) {
  const allHackathons = useMemo(
    () => getDisplayHackathons(store.hackathons, store.techOpportunities, store.fpContent),
    [store.hackathons, store.techOpportunities, store.fpContent]
  );

  const [viewTab, setViewTab] = useState<"total" | "abiertos" | "proximos" | "guardados">("total");
  const [showFilters, setShowFilters] = useState(false);
  const [monthFilter, setMonthFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [provinciaFilter, setProvinciaFilter] = useState("");
  const [modalidadFilter, setModalidadFilter] = useState("");
  const [soloInscripcionAbierta, setSoloInscripcionAbierta] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

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

  // Mirrors Cursos: the four control-row entries are both the KPI counts
  // and the filter tabs. Total is the current events (not finished, not
  // past); Inscripción abierta and Próx. inicio are subsets of it.
  // "Realizado" is no longer its own tab - it moves to the Estado filter.
  const total = useMemo(() => sorted.filter((h) => !isHackathonArchived(h) && !isHackathonPast(h)), [sorted]);
  // Guardados (issue #131): a heart-driven filter, independent of the
  // lifecycle split above - saving an event never moves it between tabs,
  // so the same event can appear in both Guardados and Total.
  const guardados = useMemo(() => sorted.filter((h) => h.is_favorite), [sorted]);
  const abiertos = useMemo(() => total.filter((h) => h.status === "inscripcion_abierta"), [total]);
  const proximos = useMemo(() => {
    const t = todayKey();
    const i30 = dateKey(addDays(new Date(), 30).toISOString());
    return total.filter((h) => {
      const d = (h.start_at || "").slice(0, 10);
      return d >= t && d <= i30;
    });
  }, [total]);
  const tabBase = useMemo(
    () => viewTab === "abiertos" ? abiertos : viewTab === "proximos" ? proximos : viewTab === "guardados" ? guardados : total,
    [viewTab, abiertos, proximos, guardados, total]
  );


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
      if (soloInscripcionAbierta && h.status !== "inscripcion_abierta") return false;
      return true;
    });
  }, [tabBase, search, monthFilter, dayFilter, estadoFilter, provinciaFilter, modalidadFilter, soloInscripcionAbierta]);

  const activeFilterCount = [monthFilter, dayFilter, estadoFilter, provinciaFilter, modalidadFilter, soloInscripcionAbierta].filter(Boolean).length;

  function clearAll() {
    setMonthFilter(""); setDayFilter(""); setEstadoFilter(""); setProvinciaFilter(""); setModalidadFilter(""); setSoloInscripcionAbierta(false); setSearchInput(""); setSearch("");
  }

  const showFeatured = viewTab === "total" && !search && activeFilterCount === 0;
  const featuredHackathon = useMemo(
    () => showFeatured ? selectFeaturedHackathon(total) : null,
    [total, showFeatured],
  );
  const gridHackathons = useMemo(
    () => featuredHackathon ? filtered.filter((item) => item.id !== featuredHackathon.id) : filtered,
    [featuredHackathon, filtered],
  );
  const featuredProgress = featuredHackathon ? hackathonAptitudeProgress(featuredHackathon) : null;

  return (
    <>
      <style>{`
        .al-hack-empty-wrap { display: grid; gap: 14px; grid-template-columns: 1fr; }
        @media (min-width: 640px) { .al-hack-empty-wrap.al-hack-empty-two { grid-template-columns: 1fr 1fr; } }
        .al-hack-empty { min-height: 320px; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
        .al-hack-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
        .al-hack-empty-illustration { width: 100%; max-width: 280px; height: auto; }
        .al-hack-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
        .al-hack-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
        .al-hack-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; border: 1px solid var(--al-action-soft-border); cursor: pointer; }
      `}</style>
      <div className="al-catalog-view space-y-4">
        <div className="al-cc-shell">
          <CollectionControls
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Buscar nombre, organizador, tema, aptitud..."
            tabs={[
              { id: "total", label: "Total", count: total.length },
              { id: "abiertos", label: "Inscripción abierta", count: abiertos.length },
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
                  options={[["", "Todos"], ["pendiente", "Pendiente"], ["inscripcion_abierta", "Activo"], ["realizado", "Realizado"]]}
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
              {provincias.length > 0 && (
                <div>
                  <p className="al-fp-row-label">Provincia</p>
                  <FilterChips
                    options={[["", "Todas"], ...provincias.map((p): [string, string] => [p, p])]}
                    value={provinciaFilter}
                    onChange={setProvinciaFilter}
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
                  <input type="checkbox" checked={soloInscripcionAbierta} onChange={(e) => setSoloInscripcionAbierta(e.target.checked)} className="rounded" />
                  Inscripción abierta
                </label>
              </div>
            </FilterPanelCompact>
          )}
        </div>

        <div className="min-w-0 space-y-4">
            {featuredHackathon && (() => {
              const presentation = getHackathonPresentation(featuredHackathon);
              return (
                <CatalogFeaturedCard
                  imageSrc="/assets/hackathons/eventos-hero.svg"
                  tag={<><Flame className="h-3 w-3" />Próximo</>}
                  title={presentation.title}
                  subtitle={presentation.organizer}
                  status={(
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <span className={cn("al-catalog-status", hackathonStatusPillClass(featuredHackathon.status))}>{hackathonStatusLabel(featuredHackathon.status)}</span>
                      {!isHackathonArchived(featuredHackathon) && isPreparationComplete(featuredHackathon) && (
                        <Badge className="al-hack-prep-ready al-hack-chip-green"><CheckCircle2 className="h-3 w-3" />Preparación lista</Badge>
                      )}
                    </div>
                  )}
                  favorite={canToggleHackathonFavorite(featuredHackathon) ? (
                    <CatalogFavoriteButton
                      active={!!featuredHackathon.is_favorite}
                      featured
                      onClick={() => toggleHackathonFavoriteFor(featuredHackathon, actions)}
                    />
                  ) : undefined}
                  description={presentation.description}
                  facts={(
                    <>
                      {presentation.startDate && <CatalogFact icon={<CalendarDays />}>{formatDateLabel(presentation.startDate)}</CatalogFact>}
                      {presentation.location && <CatalogFact icon={<MapPin />}>{presentation.location}</CatalogFact>}
                      {presentation.modality && <CatalogFact icon={<Building2 />}>{presentation.modality}</CatalogFact>}
                      {featuredProgress && featuredProgress.total > 0 && (
                        <CatalogFact icon={<CheckCircle2 />}>{featuredProgress.done}/{featuredProgress.total} aptitudes</CatalogFact>
                      )}
                    </>
                  )}
                  detailHref={`/hackathons/${encodeURIComponent(featuredHackathon.id)}`}
                />
              );
            })()}

            {(featuredHackathon || gridHackathons.length) ? (
              <div className="al-catalog-grid al-catalog-grid-cards">
                {gridHackathons.map((item) => {
                  const presentation = getHackathonPresentation(item);
                  const canFavorite = canToggleHackathonFavorite(item);
                  return (
                    <CatalogCard
                      key={item.id}
                      title={presentation.title}
                      subtitle={presentation.organizer}
                      badges={(
                        <>
                          <span className={cn("al-catalog-status", hackathonStatusPillClass(item.status))}>{hackathonStatusLabel(item.status)}</span>
                          {!isHackathonArchived(item) && isPreparationComplete(item) && (
                            <Badge className="al-hack-prep-ready al-hack-chip-green"><CheckCircle2 className="h-3 w-3" /><span className="sr-only sm:not-sr-only">Preparación lista</span></Badge>
                          )}
                          {canFavorite && (
                            <CatalogFavoriteButton
                              active={!!item.is_favorite}
                              onClick={() => toggleHackathonFavoriteFor(item, actions)}
                            />
                          )}
                        </>
                      )}
                      facts={(
                        <>
                          {presentation.startDate && <CatalogFact icon={<CalendarDays />}>{formatDateLabel(presentation.startDate)}</CatalogFact>}
                          {presentation.location && <CatalogFact icon={<MapPin />}>{presentation.location}</CatalogFact>}
                          {presentation.modality && <CatalogFact icon={<Building2 />}>{presentation.modality}</CatalogFact>}
                        </>
                      )}
                      detailHref={`/hackathons/${encodeURIComponent(item.id)}`}
                    />
                  );
                })}
              </div>
            ) : (
              <HackathonsEmptyState variant={search || activeFilterCount > 0 ? "sin_resultados" : viewTab === "total" ? "sin_activos" : "sin_datos"} onClearFilters={clearAll} />
            )}
        </div>
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
          <p className="al-hack-empty-desc">Ningún evento o reto coincide con tu búsqueda o filtros.</p>
          <button type="button" className="al-hack-empty-btn" onClick={onClearFilters}>Quitar filtros</button>
        </div>
      </div>
    );
  }
  return (
    <div className="al-hack-empty-wrap al-hack-empty-two">
      <div className="al-hack-empty">
        <Image src="/assets/hackathons/hackathons-empty-sin-datos.png" alt="" width={900} height={295} sizes="280px" className="al-hack-empty-illustration" />
        <p className="al-hack-empty-title">Sin eventos o retos disponibles</p>
        <p className="al-hack-empty-desc">Vuelve pronto para descubrir nuevas convocatorias relacionadas con tu ciclo.</p>
      </div>
      <div className="al-hack-empty">
        <Image src="/assets/hackathons/hackathons-empty-sin-activos.png" alt="" width={900} height={295} sizes="280px" className="al-hack-empty-illustration" />
        <p className="al-hack-empty-title">¡Aún no te has inscrito!</p>
        <p className="al-hack-empty-desc">Busca un evento o reto y demuestra tus habilidades.</p>
      </div>
    </div>
  );
}

function isCompetencyDone(competency: RequiredCompetency): boolean {
  return !!competency.completed;
}

function hackathonAptitudeProgress(item: Hackathon) {
  const competencies = item.requiredCompetencies ?? [];
  const required = competencies.filter((competency) => competency.obligatoria_para_item);
  const recommended = competencies.filter((competency) => !competency.obligatoria_para_item);
  const resources = [...new Map(
    competencies.flatMap((competency) => competency.preparationResources ?? []).map((resource) => [resource.id, resource]),
  ).values()];
  return {
    done: required.filter(isCompetencyDone).length,
    total: required.length,
    requiredDone: required.filter(isCompetencyDone).length,
    requiredTotal: required.length,
    recommendedDone: recommended.filter(isCompetencyDone).length,
    recommendedTotal: recommended.length,
    resourcesStarted: resources.filter((resource) => resource.user_status === "started").length,
    resourcesCompleted: resources.filter((resource) => resource.user_status === "completed").length,
  };
}

function hackathonStatusPillClass(status: Hackathon["status"]): string {
  const classes: Record<Hackathon["status"], string> = {
    inscripcion_abierta: "al-catalog-status-open",
    pendiente: "al-catalog-status-pending",
    realizado: "al-catalog-status-complete",
    revisar_futura_edicion: "al-catalog-status-review",
    descartado: "al-catalog-status-dismissed",
  };
  return classes[status];
}

function RequirementRow({ competency, actions }: { competency: RequiredCompetency; actions: EventsActions }) {
  const done = isCompetencyDone(competency);
  const resources = competency.preparationResources ?? [];
  const roleLabel = { primary: "Principal", alternative: "Alternativa", extension: "Ampliación" } as const;
  const statusLabel = { started: "En curso", completed: "Completado" } as const;

  return (
    <div className="rounded-2xl border border-[#ece7dc] p-3.5">
      <div className="flex items-start gap-2.5">
        <span className={cn("al-modal-req-check mt-0.5", done ? "al-modal-req-check-done" : "al-modal-req-check-pending")}>
          <Check className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13.5px] font-bold text-[#111111]">{competency.titulo}</p>
            <span className={cn("al-modal-step-badge", competency.obligatoria_para_item ? "al-modal-step-badge-oblig" : "al-modal-step-badge-reco")}>
              {competency.obligatoria_para_item ? "Imprescindible" : "Recomendada"}
            </span>
          </div>
          {competency.descripcion && <p className="mt-1.5 text-xs leading-5 text-[#4b4740]">{competency.descripcion}</p>}
          <div className="mt-3 space-y-2">
            {resources.map((resource) => {
              const watchedPercent = resource.saved_duration_seconds && resource.last_position_seconds > 0
                ? Math.min(100, Math.round((resource.last_position_seconds / resource.saved_duration_seconds) * 100))
                : null;
              return (
                <div key={resource.id} className="rounded-xl border border-[#ece7dc] bg-[#faf8f4] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("al-modal-step-badge", resource.role === "primary" ? "al-modal-step-badge-oblig" : "al-modal-step-badge-reco")}>{roleLabel[resource.role]}</span>
                        <span className="text-[10.5px] font-semibold text-[#6b6f72]">{resource.provider}</span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] font-bold text-[#22201c]">{resource.title}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10.5px] font-semibold text-[#4b4740]">
                      {resource.user_status ? statusLabel[resource.user_status] : "Sin empezar"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-5 text-[#6b6f72]">{resource.mapping_rationale}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-[#8a857c]">
                    {resource.duration_seconds && <span>{Math.max(1, Math.round(resource.duration_seconds / 60))} min</span>}
                    <span>Verificado {formatDateLabel(resource.source_verified_at)}</span>
                    {watchedPercent !== null && <span>Visto {watchedPercent}%</span>}
                    {resource.user_status === "completed" && resource.completion_method === "self_declared" && <span>Declarado por ti</span>}
                  </div>
                  <Link href={resource.deep_link} className="al-modal-req-btn al-modal-req-btn-video mt-2">
                    {resource.resource_type.startsWith("youtube") ? <Youtube className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                    {resource.user_status === "started" ? "Continuar recurso" : resource.user_status === "completed" ? "Revisar recurso" : "Abrir recurso"}
                  </Link>
                </div>
              );
            })}
            {resources.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#ded8cc] bg-[#faf8f4] px-3 py-2.5">
                <p className="text-[11.5px] font-semibold text-[#6b6f72]">Aún no hay un recurso verificado para esta aptitud.</p>
                <p className="mt-0.5 text-[10.5px] leading-4 text-[#9a958a]">La carencia queda registrada para buscar una opción fiable; no mostraremos un enlace genérico.</p>
              </div>
            )}
          </div>
          {done ? (
            <span className="al-modal-mark-done al-modal-mark-done-active mt-3">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {competency.completion_method === "resource_observed" ? "Completado con evidencia" : "Marcado como hecho"}
            </span>
          ) : (
            <button type="button" className="al-modal-mark-done mt-3" onClick={() => actions.markCompetencyCompleted(competency.id)}>
              <Check className="h-3.5 w-3.5" />Marcar como hecho
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function HackathonDetailView({ id }: { id: string }) {
  const { store } = useApplicationStore();
  const actions = { ...useEventActions(), ...useLearningActions(), ...useTaskActions() };
  const allHackathons = useMemo(
    () => getDisplayHackathons(store.hackathons, store.techOpportunities, store.fpContent),
    [store.hackathons, store.techOpportunities, store.fpContent]
  );
  const item = useMemo(() => allHackathons.find((h) => h.id === id) ?? null, [allHackathons, id]);
  const [pendingComplete, setPendingComplete] = useState(false);

  if (!item) {
    return (
      <div className="space-y-4">
        <style>{`
          .al-hack-empty { min-height: 320px; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
          .al-hack-empty-icon { width: 56px; height: 56px; border-radius: 16px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
          .al-hack-empty-title { color: #111111; font-weight: 700; font-size: 15px; }
          .al-hack-empty-desc { color: #6b6f72; font-size: 12.5px; max-width: 32ch; }
          .al-hack-empty-btn { margin-top: 4px; display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px; background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; border: 1px solid var(--al-action-soft-border); cursor: pointer; text-decoration: none; }
        `}</style>
        <PageHeader
          eyebrow="Eventos y retos"
          title="Evento no disponible"
          actions={
            <div className="hidden md:flex md:items-center md:gap-2">
              <StudentHeaderActions />
            </div>
          }
        />
        <div className="al-hack-empty">
          <span className="al-hack-empty-icon"><Trophy className="h-6 w-6" /></span>
          <p className="al-hack-empty-title">Ya no podemos mostrar este evento</p>
          <p className="al-hack-empty-desc">Puede haberse retirado del catálogo o no estar disponible para tu ciclo. Vuelve al listado para ver los eventos activos.</p>
          <Link href="/hackathons" className="al-hack-empty-btn">Volver a Eventos y retos</Link>
        </div>
      </div>
    );
  }

  const presentation = getHackathonPresentation(item);
  const canFavorite = canToggleHackathonFavorite(item);
  const inscripcionFin = presentation.registrationDeadline;
  const requirements = item.requiredCompetencies ?? [];
  const progress = hackathonAptitudeProgress(item);
  const past = isHackathonPast(item);
  const archived = isHackathonArchived(item);
  const requiredSkills = requirements.filter((competency) => competency.obligatoria_para_item);
  const testedSkills = [...new Set([
    ...presentation.skillsTested,
    ...requiredSkills.map((competency) => competency.titulo),
  ].filter(Boolean))];
  const preparationTips = presentation.preparationTips;
  const eligibility = [...new Set([...presentation.audience, ...presentation.otherEligibility, ...presentation.requirements].filter(Boolean))];
  const overviewRows = [
    presentation.startDate ? { label: "Fechas", value: `${formatDateLabel(presentation.startDate)}${presentation.endDate ? ` → ${formatDateLabel(presentation.endDate)}` : ""}` } : null,
    presentation.location ? { label: "Ubicación", value: presentation.location } : null,
    presentation.modality ? { label: "Modalidad", value: presentation.modality } : null,
    inscripcionFin ? { label: "Inscripción hasta", value: formatDateLabel(inscripcionFin) } : null,
    opportunityLifecycleLabel(presentation.lifecycle) ? { label: "Estado", value: opportunityLifecycleLabel(presentation.lifecycle)! } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  const additionalRows = [
    presentation.type ? { label: "Tipo", value: presentation.type } : null,
    presentation.organizer ? { label: "Entidad", value: presentation.organizer } : null,
    presentation.certification ? { label: "Certificación", value: presentation.certification } : null,
    presentation.prize ? { label: "Premio", value: presentation.prize } : null,
    presentation.price ? { label: "Precio", value: presentation.price } : null,
    presentation.modality ? { label: "Modalidad", value: presentation.modality } : null,
    presentation.location ? { label: "Ubicación", value: presentation.location } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  const startKey = (presentation.startDate ?? "").slice(0, 10);
  const nextHackathon = (() => {
    const pool = allHackathons
      .filter((candidate) => candidate.id !== item.id && !isHackathonArchived(candidate))
      .map((candidate) => ({ candidate, key: (candidate.start_at || "").slice(0, 10) }))
      .filter(({ key }) => key)
      .sort((a, b) => a.key.localeCompare(b.key));
    return (pool.find(({ key }) => key >= startKey) ?? pool[0])?.candidate ?? null;
  })();

  async function handleComplete(target: Hackathon) {
    if (pendingComplete) return;
    setPendingComplete(true);
    try {
      await actions.completeHackathon(target);
    } catch {
      // Store action already surfaced a toast and rolled back optimistic state.
    } finally {
      setPendingComplete(false);
    }
  }

  return (
    <div className="space-y-5">
      <style>{`
        .al-modal-req-check { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 999px; flex-shrink: 0; }
        .al-modal-req-check-done { background: linear-gradient(180deg, #4C9A6E, #1f7a4d); color: white; }
        .al-modal-req-check-pending { border: 2px solid #e4dfd5; color: transparent; }
        .al-modal-step-badge { display: inline-flex; align-items: center; height: 20px; padding: 0 9px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; flex-shrink: 0; }
        .al-modal-step-badge-oblig { background: #e7f5ee; color: #1f7a4d; }
        .al-modal-step-badge-reco { background: #fdf1dd; color: #b4791f; }
        .al-modal-req-actions { display: flex; flex-wrap: wrap; gap: 6px; }
        .al-modal-req-btn { display: inline-flex; align-items: center; gap: 5px; height: 29px; padding: 0 10px; border-radius: 8px; border: 1px solid #ece7dc; background: white; font-size: 11px; font-weight: 600; color: #333029; text-decoration: none; cursor: pointer; }
        .al-modal-req-btn-video { border-color: rgba(225, 93, 45, 0.3); background: #fbe7dd; color: #c94f21; }
        .al-modal-mark-done { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 9px; border: none; cursor: pointer; font-size: 11.5px; font-weight: 700; background: linear-gradient(180deg, #4C9A6E, #1f7a4d); color: white; }
        .al-modal-mark-done-active { background: #e7f5ee; color: #1f7a4d; cursor: default; }
      `}</style>
      <Link href="/hackathons" className="inline-flex items-center gap-1 text-xs font-semibold text-[#6b6f72] transition hover:text-[#c94f21]">
        <ChevronLeft className="h-3.5 w-3.5" />Eventos y retos
      </Link>
      <PageHeader
        eyebrow={presentation.type || "Evento o reto"}
        title={presentation.title}
        subtitle={presentation.organizer}
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
              <img src="/assets/hackathons/eventos-hero.svg" alt="" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("al-catalog-status", hackathonStatusPillClass(item.status))}>{hackathonStatusLabel(item.status)}</span>
              {!archived && isPreparationComplete(item) && (
                <Badge className="al-hack-prep-ready al-hack-chip-green"><CheckCircle2 className="h-3 w-3" />Preparación lista</Badge>
              )}
            </div>
            {past && <p className="rounded-lg bg-[#f3ece1] px-3 py-2 text-xs font-semibold text-[#6b6f72]">Este evento ya ha finalizado.</p>}
            {overviewRows.length > 0 && <CatalogInfoGrid items={overviewRows} />}
          </CatalogPanel>

          {(presentation.description || testedSkills.length > 0 || preparationTips.length > 0 || eligibility.length > 0) && (
            <div className="al-catalog-detail-cols">
            {presentation.description && <CatalogPanel title="Sobre el evento o reto">
              <p className="whitespace-pre-wrap text-[12.5px] leading-6 text-[#4b4740]">{presentation.description}</p>
            </CatalogPanel>}
            {testedSkills.length > 0 && <CatalogPanel title="Qué pondrás a prueba">
                <ul className="space-y-2">
                  {testedSkills.slice(0, 6).map((skill) => (
                    <li key={skill} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1f7a4d]" />{skill}</li>
                  ))}
                </ul>
            </CatalogPanel>}
            {preparationTips.length > 0 && <CatalogPanel title="Cómo prepararte">
              <ul className="space-y-2">
                {preparationTips.map((tip) => <li key={tip} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9a958a]" />{tip}</li>)}
              </ul>
            </CatalogPanel>}
            {eligibility.length > 0 && <CatalogPanel title="Quién puede participar">
              <ul className="space-y-2">
                {eligibility.map((rule) => <li key={rule} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9a958a]" />{rule}</li>)}
              </ul>
            </CatalogPanel>}
            </div>
          )}

          {requirements.length > 0 && (
            <CatalogPanel title="Recursos para prepararte">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] leading-5 text-[#6b6f72]">Cada aptitud muestra sólo recursos exactos, disponibles y verificados para tu ciclo.</p>
                {(progress.requiredTotal > 0 || progress.recommendedTotal > 0) && (
                  <span className="shrink-0 text-right text-[10.5px] font-semibold leading-4 text-[#9a958a]">
                    Obligatorias {progress.requiredDone}/{progress.requiredTotal}<br />
                    Recomendadas {progress.recommendedDone}/{progress.recommendedTotal}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {requirements.map((competency) => (
                  <RequirementRow key={competency.id} competency={competency} actions={actions} />
                ))}
              </div>
            </CatalogPanel>
          )}

          {additionalRows.length > 0 && <CatalogPanel title="Información adicional">
            <CatalogInfoGrid items={additionalRows} />
          </CatalogPanel>}
        </div>

        <div className="space-y-4">
          <CatalogPanel>
            <p className="al-catalog-side-title">Estado del evento</p>
            <span className={cn("al-catalog-status w-fit", hackathonStatusPillClass(item.status))}>{hackathonStatusLabel(item.status)}</span>
            {(inscripcionFin || presentation.startDate) && <div>
              <p className="al-catalog-info-k">Próximo hito</p>
              <p className="al-catalog-info-v">
                {inscripcionFin
                  ? `Cierre de inscripción · ${formatDateLabel(inscripcionFin)}`
                  : `Inicio · ${formatDateLabel(presentation.startDate!)}`}
              </p>
            </div>}
            {progress.total > 0 && (
              <div className="rounded-xl bg-[#faf8f4] p-3">
                <div className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-[#4b4740]">
                  <span>Tu avance de preparación</span>
                  <span>{progress.done}/{progress.total}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eee7dc]">
                  <div className="h-full rounded-full bg-[#1f7a4d] transition-[width]" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
                </div>
                <p className="mt-2 text-[10.5px] leading-4 text-[#8a857c]">
                  Recursos: {progress.resourcesCompleted} completados · {progress.resourcesStarted} en curso. Este indicador organiza tu preparación; no evalúa tu nivel.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-1">
              {isSafeHttpUrl(presentation.sourceUrl) && (
                <a href={presentation.sourceUrl} target="_blank" rel="noopener noreferrer" className="al-catalog-action al-catalog-action-solid">
                  <ExternalLink className="h-3.5 w-3.5" />Abrir convocatoria oficial
                </a>
              )}
              {canFavorite && (
                <button
                  type="button"
                  className={cn("al-catalog-action", item.is_favorite && "al-catalog-action-soft")}
                  aria-pressed={!!item.is_favorite}
                  onClick={() => toggleHackathonFavoriteFor(item, actions)}
                >
                  <Heart className="h-3.5 w-3.5" fill={item.is_favorite ? "currentColor" : "none"} />
                  {item.is_favorite ? "Guardado en favoritos" : "Guardar en favoritos"}
                </button>
              )}
              <button type="button" className="al-catalog-action" onClick={() => actions.addTask({ title: `Revisar ${item.name}`, due_at: addDaysKeepingTime("", 1), status: "pendiente", priority: "media", description: "Evento o reto" }).catch(() => {})}>
                <Plus className="h-3.5 w-3.5" />Crear tarea
              </button>
              {!archived && item.sourceTable !== "tech_opportunities" && (
                <button type="button" className="al-catalog-action" disabled={pendingComplete} onClick={() => handleComplete(item)}>
                  <CheckCircle2 className="h-3.5 w-3.5" />{pendingComplete ? "Guardando…" : "Realizado"}
                </button>
              )}
            </div>
          </CatalogPanel>

          {nextHackathon && (() => {
            const nextPresentation = getHackathonPresentation(nextHackathon);
            return (
              <CatalogPanel>
                <p className="al-catalog-side-title">Siguiente evento o reto</p>
                <CatalogNextLink
                  href={`/hackathons/${encodeURIComponent(nextHackathon.id)}`}
                  title={nextPresentation.title}
                  meta={nextPresentation.startDate ? `Inicio · ${formatDateLabel(nextPresentation.startDate)}` : nextPresentation.organizer || "Ver evento"}
                  actionLabel="Ver evento"
                />
              </CatalogPanel>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function nowIso() {
  return new Date().toISOString();
}

function isHackathonArchived(hackathon: Pick<Hackathon, "status">) {
  return hackathon.status === "realizado" || hackathon.status === "descartado";
}

function isHackathonPast(hackathon: Pick<Hackathon, "inscripcion_hasta" | "registration_deadline_at" | "end_at" | "start_at">) {
  return isPastActionDate(hackathon.inscripcion_hasta || hackathon.registration_deadline_at || hackathon.end_at || hackathon.start_at);
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

function toDatetimeLocalValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addDaysKeepingTime(value: string | undefined, days: number) {
  const base = parseDate(value) ?? new Date();
  base.setDate(base.getDate() + days);
  return toDatetimeLocalValue(base);
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

export function EventsFeature() {
  const { store } = useApplicationStore();
  const actions = { ...useEventActions(), ...useLearningActions(), ...useTaskActions() };
  return (
    <FeaturePage eyebrow="Comunidad" title="Eventos y retos" subtitle="Hackathons, retos y convocatorias para poner a prueba lo que sabes." catalogue>
      <Hackathons store={store} actions={actions} />
    </FeaturePage>
  );
}
