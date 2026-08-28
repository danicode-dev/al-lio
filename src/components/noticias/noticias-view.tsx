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
import type { FpCycleCode } from "@/lib/db/types";
import type { NewsItem, NewsSyncStatus, NewsTrustTier } from "@/lib/news/types";
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
type SortMode = "date" | "trust";
// The four control-strip entries double as the KPI counts and the status
// filter, exactly like Cursos and Eventos: "recientes" is the whole current
// feed and the other three are subsets of the loaded items.
type ViewTab = "hoy" | "recientes" | "sinleer" | "guardadas";

export const TRUST_LABELS: Record<NewsTrustTier, string> = {
  official: "Oficial",
  institutional: "Institucional",
  first_party: "Primera parte",
  sector: "Sectorial",
  reference: "Especializada",
};

const TRUST_WEIGHT: Record<NewsTrustTier, number> = {
  official: 5,
  institutional: 4,
  first_party: 3,
  sector: 2,
  reference: 1,
};

export const KIND_LABELS: Record<NewsItem["kind"], string> = {
  news: "Noticia",
  event: "Evento",
  call: "Convocatoria",
  legal: "Normativa",
};

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

  const sources = useMemo(
    () => Array.from(new Map(items.map((item) => [item.sourceId, item.sourceName])).entries())
      .sort((first, second) => first[1].localeCompare(second[1])),
    [items],
  );

  // Counts and tab contents come from the same loaded items, so the number
  // on a tab always matches the list it opens.
  const recientes = useMemo(
    () => items.filter((item) => item.status !== "saved" || isCurrentItem(item)),
    [items],
  );
  const hoy = useMemo(() => recientes.filter(isPublishedToday), [recientes]);
  const sinLeer = useMemo(() => items.filter((item) => item.status === "new"), [items]);
  const guardadas = useMemo(() => items.filter((item) => item.status === "saved"), [items]);

  const tabBase = useMemo(
    () => viewTab === "hoy" ? hoy : viewTab === "sinleer" ? sinLeer : viewTab === "guardadas" ? guardadas : recientes,
    [viewTab, hoy, sinLeer, guardadas, recientes],
  );

  const filteredItems = useMemo(() => {
    const filtered = tabBase.filter((item) => {
      if (sourceFilter && item.sourceId !== sourceFilter) return false;
      if (!search) return true;
      return [item.title, item.description ?? "", item.sourceName, ...item.topics, ...item.moduleCodes]
        .some((value) => value.toLowerCase().includes(search));
    });
    return filtered.sort((first, second) => {
      if (sort === "trust") {
        const trustDifference = TRUST_WEIGHT[second.trustTier] - TRUST_WEIGHT[first.trustTier];
        if (trustDifference !== 0) return trustDifference;
      }
      return itemDate(second).localeCompare(itemDate(first));
    });
  }, [tabBase, search, sourceFilter, sort]);

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
    // phone-only pull-up above the control strip match those routes.
    <div className="space-y-6">
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

// Banner artwork is organised by professional family, the way the course
// banners are: the two development cycles share one family, and every
// family holds several variants. The counts are how many files exist.
const NEWS_HERO_POOL = { desarrollo: 5, administracion: 4, marketing: 4, deporte: 3 } as const;

const CYCLE_HERO_FAMILY: Record<FpCycleCode, keyof typeof NEWS_HERO_POOL> = {
  DAW: "desarrollo",
  DAM: "desarrollo",
  AF: "administracion",
  MP: "marketing",
  TSAF: "deporte",
};

// An item keeps one stable banner (hashed from its id), so a re-featured
// item always carries the same image and two items of one family rarely
// share it. An item with no target cycle - which the database forbids -
// falls back to the neutral placeholder rather than to someone else's
// artwork.
function newsHeroImage(item: NewsItem): string {
  const cycle = item.targetCycleCodes[0];
  const family = cycle ? CYCLE_HERO_FAMILY[cycle] : undefined;
  if (!family) return "/assets/noticias/noticia-hero-placeholder.svg";
  let hash = 0;
  for (let index = 0; index < item.id.length; index += 1) hash = (hash * 31 + item.id.charCodeAt(index)) | 0;
  return `/assets/noticias/noticia-hero-${family}-${(Math.abs(hash) % NEWS_HERO_POOL[family]) + 1}.jpg`;
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

function itemDate(item: NewsItem): string {
  return item.publishedAt ?? item.fetchedAt;
}

function isPublishedToday(item: NewsItem): boolean {
  const date = new Date(itemDate(item));
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

function isCurrentItem(item: NewsItem): boolean {
  const date = Date.parse(itemDate(item));
  if (Number.isNaN(date)) return false;
  const ageDays = (Date.now() - date) / 86_400_000;
  return ageDays <= (item.kind === "legal" ? 30 : 7);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no indicada";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no indicada";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatModule(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (firstCharacter) => firstCharacter.toUpperCase());
}

export function formatTopic(value: string): string {
  return value.replaceAll("-", " ");
}
