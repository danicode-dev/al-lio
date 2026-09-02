"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, CheckCircle2, Flame, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { isPreparationComplete, selectFeaturedHackathon } from "@/lib/fp/event-lifecycle";
import { dateKey, formatDateLabel, isWithinUpcomingWindow } from "@/lib/catalog/date-filters";
import { canToggleHackathonFavorite, getDisplayHackathons, getHackathonPresentation, toggleHackathonFavoriteFor } from "@/features/events/presentation";
import { CatalogCard, CatalogFact, CatalogFavoriteButton, CatalogFeaturedCard } from "@/components/catalog/catalog-card";
import { CollectionControls, FilterChips, FilterPanelCompact } from "@/components/catalog/collection-controls";
import type { Store } from "@/components/store/types";
import {
  HACK_EMPTY_STYLES,
  hackathonAptitudeProgress,
  hackathonStatusLabel,
  hackathonStatusPillClass,
  isHackathonArchived,
  sortHackathonsByStart,
  type EventsActions,
} from "./event-catalogue-model";
import { FilterDateRow } from "./events-filter-controls";
import { isHackathonPast } from "./hackathon-dates";

export function Hackathons({ store, actions }: { store: Store; actions: EventsActions }) {
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

  const sorted = useMemo(() => sortHackathonsByStart(allHackathons), [allHackathons]);

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
    const now = new Date();
    return total.filter((h) => isWithinUpcomingWindow(h.start_at, now));
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
      <style>{HACK_EMPTY_STYLES}</style>
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
