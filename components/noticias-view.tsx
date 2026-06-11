"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  type NewsCategory,
} from "@/lib/sources/source-registry";
import type { NewsItem, NewsStatus, SyncStatus } from "@/lib/news/types";

const ALL_CATEGORIES: Array<{ id: NewsCategory | "all"; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "granada", label: CATEGORY_LABELS.granada },
  { id: "ia", label: CATEGORY_LABELS.ia },
  { id: "empresas_granada", label: CATEGORY_LABELS.empresas_granada },
  { id: "eventos_granada", label: CATEGORY_LABELS.eventos_granada },
];

type ApiResponse = { items: NewsItem[]; status: SyncStatus };

export function NoticiasView() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [category, setCategory] = useState<NewsCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<NewsStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date" | "score">("date");
  const [showFilters, setShowFilters] = useState(true);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("");
  const [viewMode, setViewMode] = useState<"lista" | "grid">("lista");

  async function load(autoSync = false) {
    setLoading(true);
    try {
      const r = await fetch(autoSync ? "/api/news?auto=1" : "/api/news", {
        cache: "no-store",
      });
      const data = (await r.json()) as ApiResponse;
      setItems(data.items ?? []);
      setSyncStatus(data.status ?? null);
    } catch (err) {
      console.warn("[noticias] load error", err);
    } finally {
      setLoading(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const r = await fetch("/api/news/sync?force=1", { method: "POST" });
      const data = (await r.json()) as { ok: boolean; status?: SyncStatus };
      if (data.ok && data.status) setSyncStatus(data.status);
      await load(false);
    } finally {
      setSyncing(false);
    }
  }

  async function markRead(id: string) {
    try {
      await fetch(`/api/news/${encodeURIComponent(id)}/read`, { method: "PATCH" });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "read" } : i)));
    } catch { /* noop */ }
  }

  async function markSaved(id: string) {
    try {
      await fetch(`/api/news/${encodeURIComponent(id)}/save`, { method: "PATCH" });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "saved" } : i)));
    } catch { /* noop */ }
  }

  useEffect(() => { load(true); }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const sources = useMemo(
    () =>
      Array.from(
        new Map(items.map((i) => [i.sourceId, i.sourceName])).entries()
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [items]
  );

  const filtered = useMemo(() => {
    let out = items;
    if (category !== "all") out = out.filter((i) => i.category === category);
    if (statusFilter !== "all") out = out.filter((i) => i.status === statusFilter);
    if (showSavedOnly) out = out.filter((i) => i.status === "saved");
    if (sourceFilter) out = out.filter((i) => i.sourceId === sourceFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return [...out].sort((a, b) =>
      sort === "score"
        ? b.relevanceScore - a.relevanceScore
        : (b.publishedAt || b.fetchedAt).localeCompare(a.publishedAt || a.fetchedAt)
    );
  }, [items, category, statusFilter, showSavedOnly, sourceFilter, search, sort]);

  // KPIs
  const { kpiTotal, kpiNuevas, kpiGuardadas, kpiFailed } = useMemo(() => ({
    kpiTotal: items.filter((i) => category === "all" || i.category === category).length,
    kpiNuevas: items.filter((i) => (category === "all" || i.category === category) && i.status === "new").length,
    kpiGuardadas: items.filter((i) => i.status === "saved").length,
    kpiFailed: syncStatus?.sources.filter((s) => !s.ok).length ?? 0,
  }), [items, category, syncStatus]);

  const activeFilterCount = [
    statusFilter !== "all",
    showSavedOnly,
    !!sourceFilter,
    sort !== "date",
  ].filter(Boolean).length;

  function clearFilters() {
    setStatusFilter("all");
    setShowSavedOnly(false);
    setSourceFilter("");
    setSort("date");
    setSearchInput("");
    setSearch("");
  }

  const lastSync = syncStatus?.lastSyncAt
    ? formatRelative(syncStatus.lastSyncAt)
    : null;

  return (
    <div className="space-y-4">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar título, fuente, tag..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-md border bg-card p-0.5">
          {ALL_CATEGORIES.map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={category === id ? "default" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => setCategory(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={syncNow}
          disabled={syncing}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
          {syncing ? "Sync…" : "Sync"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={showFilters ? "default" : "outline"}
          className="gap-1.5"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros{activeFilterCount > 0 ? ` ${activeFilterCount}` : ""}
        </Button>
      </div>

      <div className="flex gap-5">
        {/* ── Main content ── */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ["Total", kpiTotal, ""],
              ["Nuevas", kpiNuevas, "text-blue-600 dark:text-blue-400"],
              ["Guardadas", kpiGuardadas, "text-amber-600 dark:text-amber-400"],
              kpiFailed > 0
                ? ["Errores sync", kpiFailed, "text-red-600 dark:text-red-400"]
                : ["Último sync", lastSync ?? "—", "text-muted-foreground text-sm"],
            ] as [string, string | number, string][]).map(([label, value, cls]) => (
              <Card key={label} className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
                <p className={cn("mt-1 font-bold leading-none tabular-nums", typeof value === "number" ? "text-2xl" : "text-base", cls)}>
                  {value}
                </p>
              </Card>
            ))}
          </div>

          {/* Meta + toggle */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Mostrando {filtered.length} {filtered.length === 1 ? "artículo" : "artículos"}
              {lastSync ? ` · sync ${lastSync}` : ""}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-md border bg-card p-0.5">
                {(["lista", "grid"] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    size="sm"
                    variant={viewMode === v ? "default" : "ghost"}
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setViewMode(v)}
                  >
                    {v === "lista" ? "Lista" : "Grid"}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards */}
          {loading && items.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Cargando noticias…
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No hay artículos con estos filtros.{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={syncNow}
              >
                Sincronizar ahora
              </button>
            </Card>
          ) : (
            <div className={cn(viewMode === "grid" ? "grid gap-4 sm:grid-cols-2" : "space-y-2")}>
              {filtered.map((item) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  compact={viewMode === "lista"}
                  onRead={() => markRead(item.id)}
                  onSave={() => markSaved(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Filter panel ── */}
        {showFilters && (
          <div className="w-56 shrink-0 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Filtros</span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Ordenar */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Ordenar
              </p>
              <div className="flex flex-wrap gap-1">
                {([["date", "Reciente"], ["score", "Relevancia"]] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSort(v)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:bg-muted",
                      sort === v && "border-primary bg-primary text-primary-foreground"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Estado */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Estado
              </p>
              <div className="flex flex-wrap gap-1">
                {([["all", "Todas"], ["new", "Nueva"], ["read", "Leída"], ["saved", "Guardada"]] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setStatusFilter(v)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:bg-muted",
                      statusFilter === v && "border-primary bg-primary text-primary-foreground"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Fuente */}
            {sources.length > 1 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Fuente
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  <button
                    type="button"
                    onClick={() => setSourceFilter("")}
                    className={cn(
                      "w-full rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted",
                      !sourceFilter && "bg-primary/10 font-medium text-primary"
                    )}
                  >
                    Todas las fuentes
                  </button>
                  {sources.map(([id, name]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSourceFilter(sourceFilter === id ? "" : id)}
                      className={cn(
                        "w-full rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted",
                        sourceFilter === id && "bg-primary/10 font-medium text-primary"
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Solo */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Solo
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={showSavedOnly}
                  onChange={(e) => setShowSavedOnly(e.target.checked)}
                  className="rounded"
                />
                Guardadas
              </label>
            </div>

            {/* Info sync */}
            {syncStatus && (
              <div className="rounded-md border bg-muted/30 p-2 text-[10px] text-muted-foreground">
                <p className="font-medium">{syncStatus.totalItems} artículos guardados</p>
                <p>{syncStatus.newToday} nuevos hoy</p>
                {syncStatus.sources.filter((s) => !s.ok).length > 0 && (
                  <p className="mt-1 text-amber-600 dark:text-amber-400">
                    {syncStatus.sources.filter((s) => !s.ok).length} fuente(s) con error
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NewsCard({
  item,
  compact,
  onRead,
  onSave,
}: {
  item: NewsItem;
  compact: boolean;
  onRead: () => void;
  onSave: () => void;
}) {
  if (compact) {
    return (
      <Card
        className={cn(
          "px-4 py-3 transition-colors hover:bg-accent/30",
          item.status === "read" && "opacity-60",
          item.status === "saved" && "ring-1 ring-primary/30"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-foreground/80">{item.sourceName}</span>
              {item.relevanceScore >= 50 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-2.5 w-2.5" />top
                </span>
              )}
              {item.status === "saved" && (
                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  guardada
                </span>
              )}
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              onClick={onRead}
              className="block font-medium leading-snug hover:text-primary hover:underline underline-offset-2 transition-colors line-clamp-2"
            >
              {item.title}
            </a>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                {item.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
              {item.tags.slice(0, 3).map((t) => (
                <span key={t} className="rounded bg-muted px-1.5 py-0.5">#{t}</span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button asChild size="sm" variant="ghost" className="h-7 px-2" onClick={onRead}>
              <a href={item.url} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            {item.status !== "saved" ? (
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onSave} title="Guardar">
                <BookmarkCheck className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="h-7 px-2" disabled>
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Grid card
  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4 transition-colors hover:bg-accent/30",
        item.status === "read" && "opacity-60",
        item.status === "saved" && "ring-1 ring-primary/30"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-foreground/80">{item.sourceName}</span>
        <div className="flex shrink-0 items-center gap-1">
          {item.relevanceScore >= 50 && (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-2.5 w-2.5" />top
            </span>
          )}
          {item.status === "saved" && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              guardada
            </span>
          )}
        </div>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer noopener"
        onClick={onRead}
        className="font-semibold leading-snug hover:text-primary hover:underline underline-offset-2 transition-colors line-clamp-3"
      >
        {item.title}
      </a>
      {item.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      )}
      <div className="mt-auto space-y-2">
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">
              #{t}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground">
            {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
          </div>
          <div className="flex items-center gap-0.5">
            <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={onRead}>
              <a href={item.url} target="_blank" rel="noreferrer noopener">
                Abrir
              </a>
            </Button>
            {item.status !== "saved" ? (
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onSave}>
                <BookmarkCheck className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="h-7 px-2" disabled>
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function formatDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `hace ${days}d`;
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(d);
}
