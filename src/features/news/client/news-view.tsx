"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Flame,
  Newspaper,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NewsItem, NewsSyncStatus } from "@/lib/news/types";
import {
  collectNewsSources,
  filterAndSortNews,
  formatDate,
  formatDateTime,
  KIND_LABELS,
  newsHeroImage,
  selectPublishedToday,
  selectRecientes,
  selectSaved,
  selectUnread,
  TRUST_LABELS,
  type NewsListSort,
  type NewsListTab,
} from "@/features/news/news-model";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StudentHeaderActions } from "@/components/student-header-actions";
import {
  CatalogCard,
  CatalogFact,
  CatalogFavoriteButton,
  CatalogFeaturedCard,
} from "@/components/catalog/catalog-card";
import {
  CollectionAction,
  CollectionControls,
  FilterChips,
  FilterPanelCompact,
} from "@/components/catalog/collection-controls";

type ApiResponse = { items: NewsItem[]; status: NewsSyncStatus };
// The four control-strip entries double as the KPI counts and the status
// filter, exactly like Cursos and Eventos: "recientes" is the whole current
// feed and the other three are subsets of the loaded items.
type SortMode = NewsListSort;
type ViewTab = NewsListTab;

export function NewsView() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<NewsSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("recientes");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("date");
  const [showFilters, setShowFilters] = useState(false);
  const lastReceivedAtRef = useRef<string | null>(null);

  const load = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    const previousReceivedAt = lastReceivedAtRef.current;
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const [currentResponse, savedResponse] = await Promise.all([
        fetch("/api/news?limit=200", { cache: "no-store" }),
        fetch("/api/news?status=saved&limit=200", { cache: "no-store" }),
      ]);
      if (!currentResponse.ok || !savedResponse.ok) {
        throw new Error(`HTTP ${currentResponse.status}/${savedResponse.status}`);
      }
      const [currentData, savedData] = await Promise.all([
        currentResponse.json() as Promise<ApiResponse>,
        savedResponse.json() as Promise<ApiResponse>,
      ]);
      const merged = new Map<string, NewsItem>();
      for (const item of savedData.items ?? []) merged.set(item.id, item);
      for (const item of currentData.items ?? []) merged.set(item.id, item);
      setItems(Array.from(merged.values()));
      setStatus(currentData.status ?? null);
      lastReceivedAtRef.current = currentData.status?.lastReceivedAt ?? null;
      if (quiet) {
        const receivedAt = currentData.status?.lastReceivedAt ?? null;
        toast.success(
          receivedAt && receivedAt !== previousReceivedAt
            ? "Hay nuevas noticias aprobadas"
            : "Lista al día; no hay nuevas entregas aprobadas",
        );
      }
    } catch (error) {
      console.warn("[noticias] load error", error);
      toast.error("No se pudieron cargar las noticias");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reading is marked by the detail route itself (the only way into an
  // item now that the cards carry a "Ver detalles" action), so the list no
  // longer needs its own read call.
  async function saveItem(item: NewsItem) {
    if (item.status === "saved") return;
    const previousItems = items;
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "saved" } : candidate));
    try {
      const response = await fetch(`/api/news/${encodeURIComponent(item.id)}/save`, { method: "PATCH" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStatus((current) => current ? {
        ...current,
        savedItems: current.savedItems + 1,
        newItems: item.status === "new" ? Math.max(0, current.newItems - 1) : current.newItems,
      } : current);
      toast.success("Noticia guardada");
    } catch {
      setItems(previousItems);
      toast.error("No se pudo guardar la noticia");
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 250);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const sources = useMemo(() => collectNewsSources(items), [items]);

  // Counts and tab contents come from the same loaded items, so the number
  // on a tab always matches the list it opens.
  const recientes = useMemo(() => selectRecientes(items), [items]);
  const hoy = useMemo(() => selectPublishedToday(recientes), [recientes]);
  const sinLeer = useMemo(() => selectUnread(items), [items]);
  const guardadas = useMemo(() => selectSaved(items), [items]);

  const tabBase = useMemo(
    () => viewTab === "hoy" ? hoy : viewTab === "sinleer" ? sinLeer : viewTab === "guardadas" ? guardadas : recientes,
    [viewTab, hoy, sinLeer, guardadas, recientes],
  );

  const filteredItems = useMemo(
    () => filterAndSortNews(tabBase, { search, sourceId: sourceFilter, sort }),
    [tabBase, search, sourceFilter, sort],
  );

  const featuredItem = viewTab === "guardadas" ? null : filteredItems.find((item) => item.isFeatured) ?? null;
  const regularItems = featuredItem ? filteredItems.filter((item) => item.id !== featuredItem.id) : filteredItems;

  const activeFilterCount = [Boolean(sourceFilter), sort !== "date"].filter(Boolean).length;

  function clearFilters() {
    setSourceFilter("");
    setSort("date");
    setSearchInput("");
    setSearch("");
  }

  return (
    // Same shell as Courses and Events: a space-y-6 wrapper around the page
    // header plus an .al-catalog-view block, so the vertical rhythm and the
    // phone-only pull-up above the control strip match those routes. The
    // shared `al-catalog-hoist` opt-in adds one phone-only tweak on top of
    // that rhythm (globals.css): the search / reload / filters cluster is
    // lifted into the free top-right band of this header instead of taking
    // its own row, so the stat grid and the featured card start higher.
    <div className="space-y-6 al-catalog-hoist">
      <PageHeader
        eyebrow="Radar de noticias"
        title={
          <span className="inline-flex items-center gap-2">
            Noticias
            {status?.cycleCode && (
              <span className="rounded-full bg-[#e7f5ee] px-2.5 py-1 text-xs font-bold text-[#1f7a4d]">
                {status.cycleCode}
              </span>
            )}
          </span>
        }
        subtitle="Actualidad reciente, fiable y relacionada con lo que estudias. Radar revisa las fuentes cada 12 horas; recargar solo consulta la última entrega disponible."
        actions={
          <>
            {/* The trust line carries the freshness stamp too, so the list
                below stays free of informational bands. */}
            <div className="flex items-center gap-2 text-xs text-[#6b6f72]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#1f7a4d]" />
              <span>
                Fuentes verificadas
                {status?.lastReceivedAt ? ` · Actualizado ${formatDateTime(status.lastReceivedAt)}` : ""}
              </span>
            </div>
            <div className="hidden md:flex md:items-center md:gap-2">
              <StudentHeaderActions />
            </div>
          </>
        }
      />

      <div className="al-catalog-view space-y-4">
        <div className="al-cc-shell">
          <CollectionControls
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Buscar por título, tema o módulo..."
            tabs={[
              { id: "hoy", label: "Publicadas hoy", count: hoy.length },
              { id: "recientes", label: "Últimos 7 días", count: recientes.length },
              { id: "sinleer", label: "Sin leer", count: sinLeer.length },
              { id: "guardadas", label: "Guardadas", count: guardadas.length },
            ]}
            activeTab={viewTab}
            onTabChange={(id) => { setViewTab(id as ViewTab); clearFilters(); }}
            filterCount={activeFilterCount}
            filtersOpen={showFilters}
            onToggleFilters={() => setShowFilters((current) => !current)}
            extraActions={(
              <CollectionAction
                icon={<RefreshCw className={cn(refreshing && "animate-spin")} />}
                label="Recargar"
                onClick={() => void load({ quiet: true })}
                disabled={refreshing}
              />
            )}
          />

          {showFilters && (
            <FilterPanelCompact activeCount={activeFilterCount} onClear={clearFilters} onClose={() => setShowFilters(false)}>
              <div>
                <p className="al-fp-row-label">Orden</p>
                <FilterChips
                  options={[["date", "Reciente"], ["trust", "Confianza"]]}
                  value={sort}
                  onChange={(value) => setSort((value || "date") as SortMode)}
                />
              </div>
              <div>
                <p className="al-fp-row-label">Fuente</p>
                <FilterChips
                  options={[["", "Todas"], ...sources.map(([id, name]): [string, string] => [id, name])]}
                  value={sourceFilter}
                  onChange={setSourceFilter}
                />
              </div>
            </FilterPanelCompact>
          )}
        </div>

        {loading && items.length === 0 ? (
          <EmptyState icon={RefreshCw} title="Cargando noticias verificadas..." />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Todavía no hay contenido aprobado"
            description="Radar solo mostrará información reciente que supere los controles de relevancia de tu ciclo."
          />
        ) : (
          <div className="space-y-4">
            {featuredItem && (
              <CatalogFeaturedCard
                imageSrc={newsHeroImage(featuredItem)}
                tag={<><Flame className="h-3 w-3" />Destacada</>}
                title={featuredItem.title}
                subtitle={featuredItem.sourceName}
                status={<NewsStatusPill item={featuredItem} />}
                favorite={(
                  <CatalogFavoriteButton
                    active={featuredItem.status === "saved"}
                    featured
                    onClick={() => void saveItem(featuredItem)}
                  />
                )}
                description={featuredItem.description}
                facts={<NewsFacts item={featuredItem} />}
                detailHref={`/noticias/${encodeURIComponent(featuredItem.id)}`}
              />
            )}
            {regularItems.length > 0 && (
              // One layout only, the catalogue grid Courses and Events use:
              // the featured item on top, everything else in the same
              // three-column rhythm. There is no list/grid switch any more.
              <div className="al-catalog-grid al-catalog-grid-cards">
                {regularItems.map((item) => (
                  <CatalogCard
                    key={item.id}
                    title={item.title}
                    subtitle={item.sourceName}
                    badges={(
                      <>
                        <NewsStatusPill item={item} />
                        <CatalogFavoriteButton
                          active={item.status === "saved"}
                          onClick={() => void saveItem(item)}
                        />
                      </>
                    )}
                    facts={<NewsFacts item={item} />}
                    detailHref={`/noticias/${encodeURIComponent(item.id)}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// The reading state as a catalogue status pill, the same shape Courses and
// Events use for theirs: unread reads as the one that still wants
// attention, saved as settled, already-read as muted.
function NewsStatusPill({ item }: { item: NewsItem }) {
  const { label, tone } = item.status === "saved"
    ? { label: "Guardada", tone: "al-catalog-status-open" }
    : item.status === "read"
      ? { label: "Leída", tone: "al-catalog-status-muted" }
      : { label: "Sin leer", tone: "al-catalog-status-review" };
  return <span className={cn("al-catalog-status", tone)}>{label}</span>;
}

// Three facts per card, mirroring the date/modality/level row of a course:
// when it was published, what kind of item it is and how trustworthy its
// source is. Topics and modules stay on the detail route.
function NewsFacts({ item }: { item: NewsItem }) {
  return (
    <>
      <CatalogFact icon={<CalendarDays />}>
        {item.publishedAt ? formatDate(item.publishedAt) : "Fecha no indicada"}
      </CatalogFact>
      <CatalogFact icon={<Newspaper />}>{KIND_LABELS[item.kind]}</CatalogFact>
      <CatalogFact icon={<ShieldCheck />}>{TRUST_LABELS[item.trustTier]}</CatalogFact>
    </>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: typeof Search; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#ece7dc] bg-white px-6 py-12 text-center shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fbe7dd] text-[#E15D2D]"><Icon className="h-5 w-5" /></span>
      <p className="text-sm font-bold text-[#111111]">{title}</p>
      {description && <p className="max-w-lg text-xs leading-5 text-[#6b6f72]">{description}</p>}
    </div>
  );
}
