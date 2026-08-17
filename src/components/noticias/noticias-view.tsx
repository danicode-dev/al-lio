"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  Newspaper,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NewsItem, NewsStatus, NewsSyncStatus, NewsTrustTier } from "@/lib/news/types";
import { toast } from "sonner";

type ApiResponse = { items: NewsItem[]; status: NewsSyncStatus };
type SortMode = "date" | "trust";

const TRUST_LABELS: Record<NewsTrustTier, string> = {
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

const KIND_LABELS: Record<NewsItem["kind"], string> = {
  news: "Noticia",
  event: "Evento",
  call: "Convocatoria",
  legal: "Normativa",
};

export function NoticiasView() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<NewsSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<NewsStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("date");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  async function load({ quiet = false }: { quiet?: boolean } = {}) {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch("/api/news?limit=200", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as ApiResponse;
      setItems(data.items ?? []);
      setStatus(data.status ?? null);
      if (quiet) toast.success("Noticias actualizadas");
    } catch (error) {
      console.warn("[noticias] load error", error);
      toast.error("No se pudieron cargar las noticias");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function markRead(item: NewsItem) {
    if (item.status !== "new") return;
    const previousItems = items;
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, status: "read" } : candidate));
    try {
      const response = await fetch(`/api/news/${encodeURIComponent(item.id)}/read`, { method: "PATCH" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStatus((current) => current ? { ...current, newItems: Math.max(0, current.newItems - 1) } : current);
    } catch {
      setItems(previousItems);
      toast.error("No se pudo marcar como leída");
    }
  }

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
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 250);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const sources = useMemo(
    () => Array.from(new Map(items.map((item) => [item.sourceId, item.sourceName])).entries())
      .sort((first, second) => first[1].localeCompare(second[1])),
    [items],
  );

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
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
  }, [items, search, sourceFilter, sort, statusFilter]);

  const activeFilterCount = [statusFilter !== "all", Boolean(sourceFilter), sort !== "date"].filter(Boolean).length;

  function clearFilters() {
    setStatusFilter("all");
    setSourceFilter("");
    setSort("date");
    setSearchInput("");
    setSearch("");
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal text-[#111111] dark:text-[#faf9f6] sm:text-3xl">Noticias</h1>
            {status?.cycleCode && (
              <span className="rounded-full bg-[#e7f5ee] px-2.5 py-1 text-xs font-bold text-[#1f7a4d]">
                {status.cycleCode}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#6b6f72] dark:text-[#c9c4bc]">
            Información aprobada y relacionada con tu ciclo formativo.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6b6f72]">
          <ShieldCheck className="h-4 w-4 text-[#1f7a4d]" />
          Solo fuentes verificadas y contenido revisado
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[230px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a958a]" />
          <Input
            className="h-10 rounded-xl border-[#ece7dc] bg-white pl-9 text-sm"
            placeholder="Buscar por título, tema o módulo..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => void load({ quiet: true })}
          disabled={refreshing}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ece7dc] bg-white px-3 text-xs font-semibold text-[#333029] disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Actualizar
        </button>
        <button
          type="button"
          onClick={() => setShowFilters((current) => !current)}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl border border-[#ece7dc] bg-white px-3 text-xs font-semibold text-[#333029]",
            showFilters && "border-[#efb79f] bg-[#fbe7dd] text-[#c94f21]",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros{activeFilterCount ? ` ${activeFilterCount}` : ""}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Newspaper} value={status?.totalItems ?? 0} label="Disponibles" color="#E15D2D" background="#fbe7dd" />
        <StatCard icon={Bell} value={status?.newItems ?? 0} label="Nuevas" color="#1f7a4d" background="#e7f5ee" />
        <StatCard icon={BookmarkCheck} value={status?.savedItems ?? 0} label="Guardadas" color="#b4791f" background="#fdf1dd" />
        <StatCard icon={ShieldCheck} value={sources.length} label="Fuentes activas" color="#475569" background="#eef2f6" />
      </div>

      {showFilters && (
        <div className="grid gap-4 rounded-2xl border border-[#ece7dc] bg-white p-4 shadow-sm sm:grid-cols-3">
          <FilterGroup label="Orden">
            <FilterButton active={sort === "date"} onClick={() => setSort("date")}>Reciente</FilterButton>
            <FilterButton active={sort === "trust"} onClick={() => setSort("trust")}>Confianza</FilterButton>
          </FilterGroup>
          <FilterGroup label="Estado">
            {(["all", "new", "read", "saved"] as const).map((value) => (
              <FilterButton key={value} active={statusFilter === value} onClick={() => setStatusFilter(value)}>
                {{ all: "Todas", new: "Nueva", read: "Leída", saved: "Guardada" }[value]}
              </FilterButton>
            ))}
          </FilterGroup>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#9a958a]">Fuente</p>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="h-9 w-full rounded-lg border border-[#ece7dc] bg-white px-2 text-xs text-[#333029]"
            >
              <option value="">Todas las fuentes</option>
              {sources.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="mt-2 text-xs font-semibold text-[#c94f21]">Limpiar filtros</button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#6b6f72]">Mostrando {filteredItems.length} contenidos aprobados</p>
        <div className="flex rounded-xl border border-[#ece7dc] bg-white p-1">
          <FilterButton active={viewMode === "list"} onClick={() => setViewMode("list")}>Lista</FilterButton>
          <FilterButton active={viewMode === "grid"} onClick={() => setViewMode("grid")}>Grid</FilterButton>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <EmptyState icon={RefreshCw} title="Cargando noticias verificadas..." />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Todavía no hay contenido aprobado"
          description="El radar solo mostrará información que haya superado la clasificación y revisión de tu ciclo."
        />
      ) : (
        <div className={cn("grid gap-3", viewMode === "grid" && "sm:grid-cols-2 xl:grid-cols-3")}>
          {filteredItems.map((item) => (
            <NewsCard key={item.id} item={item} onRead={() => void markRead(item)} onSave={() => void saveItem(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCard({ item, onRead, onSave }: { item: NewsItem; onRead: () => void; onSave: () => void }) {
  return (
    <article className={cn(
      "flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-[0_8px_20px_rgba(17,17,17,0.04)]",
      item.status === "read" ? "border-[#ece7dc] opacity-70" : "border-[#e6e1d8]",
      item.status === "saved" && "border-[#efb79f] opacity-100",
    )}>
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
        <span className="text-[#6b6f72]">{item.sourceName}</span>
        <span className={cn(
          "rounded-full px-2 py-0.5",
          item.trustTier === "official" || item.trustTier === "institutional"
            ? "bg-[#e7f5ee] text-[#1f7a4d]"
            : "bg-[#f3ece1] text-[#6b6f72]",
        )}>
          {TRUST_LABELS[item.trustTier]}
        </span>
        <span className="rounded-full bg-[#fbe7dd] px-2 py-0.5 text-[#c94f21]">{KIND_LABELS[item.kind]}</span>
        {item.status === "saved" && <span className="rounded-full bg-[#fdf1dd] px-2 py-0.5 text-[#9a6418]">Guardada</span>}
      </div>

      <div className="min-w-0 flex-1">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          onClick={onRead}
          className="line-clamp-3 text-sm font-semibold leading-5 text-[#111111] hover:text-[#c94f21] hover:underline hover:underline-offset-2"
        >
          {item.title}
        </a>
        {item.description && <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-[#6b6f72]">{item.description}</p>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {item.topics.slice(0, 3).map((topic) => (
          <span key={topic} className="rounded-md bg-[#f3ece1] px-2 py-1 text-[10px] text-[#6b6f72]">#{topic}</span>
        ))}
        {item.moduleCodes.slice(0, 2).map((moduleCode) => (
          <span key={moduleCode} className="rounded-md bg-[#eef4f1] px-2 py-1 text-[10px] text-[#1f6a4c]">{formatModule(moduleCode)}</span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#f0ece2] pt-3">
        <div className="text-[10px] text-[#9a958a]">
          {item.publishedAt ? formatDate(item.publishedAt) : "Fecha no indicada"}
          {item.province ? ` · ${item.province}` : ""}
        </div>
        <div className="flex items-center gap-1">
          <a href={item.url} target="_blank" rel="noreferrer noopener" onClick={onRead} className="icon-button" title="Abrir fuente">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {item.status === "saved" ? (
            <span className="icon-button text-[#1f7a4d]" title="Guardada"><CheckCircle2 className="h-3.5 w-3.5" /></span>
          ) : (
            <button type="button" onClick={onSave} className="icon-button" title="Guardar"><BookmarkCheck className="h-3.5 w-3.5" /></button>
          )}
        </div>
      </div>
      <style jsx>{`
        .icon-button { display:inline-flex; width:30px; height:30px; align-items:center; justify-content:center; border:1px solid #ece7dc; border-radius:9px; color:#6b6f72; background:white; }
        .icon-button:hover { border-color:rgba(225,93,45,.4); color:#c94f21; }
      `}</style>
    </article>
  );
}

function StatCard({ icon: Icon, value, label, color, background }: {
  icon: typeof Newspaper;
  value: number;
  label: string;
  color: string;
  background: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#ece7dc] bg-white p-4 shadow-[0_8px_20px_rgba(17,17,17,0.04)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ color, background }}><Icon className="h-4 w-4" /></span>
      <div><p className="text-xl font-extrabold leading-none text-[#111111]">{value}</p><p className="mt-1 text-[11px] font-semibold text-[#6b6f72]">{label}</p></div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#9a958a]">{label}</p><div className="flex flex-wrap gap-1.5">{children}</div></div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
        active ? "bg-[#E15D2D] text-white" : "bg-[#f7f4ee] text-[#6b6f72] hover:text-[#c94f21]",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof Search; title: string; description?: string }) {
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no indicada";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatModule(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (firstCharacter) => firstCharacter.toUpperCase());
}
