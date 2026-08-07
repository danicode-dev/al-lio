"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  Newspaper,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  type NewsCategory,
} from "@/lib/sources/source-registry";
import type { NewsItem, NewsStatus, SyncStatus } from "@/lib/news/types";
import { toast } from "sonner";

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
      if (data.ok) toast.success("Noticias actualizadas");
      else toast.error("Error al sincronizar noticias");
    } catch {
      toast.error("Error al conectar con el servidor de noticias");
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
    <>
      <style>{`
        .al-news-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .al-news-search { position: relative; flex: 1; min-width: 220px; }
        .al-news-search input { padding-left: 36px; height: 40px; border-radius: 12px; border: 1px solid #ece7dc; background: white; font-size: 13px; }
        .al-news-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: #9a958a; }
        .al-news-tabs { display: flex; align-items: center; gap: 2px; border-radius: 12px; border: 1px solid #ece7dc; background: white; padding: 3px; }
        .al-news-tab { height: 32px; padding: 0 12px; border-radius: 9px; font-size: 12.5px; font-weight: 600; color: #6b6f72; background: transparent; border: none; cursor: pointer; transition: background 0.15s, color 0.15s; white-space: nowrap; }
        .al-news-tab.al-news-tab-active { background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; box-shadow: 0 6px 14px rgba(225, 93, 45, 0.25); }
        .al-news-btn { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 12px; border: 1px solid #ece7dc; background: white; font-size: 12.5px; font-weight: 600; color: #333029; cursor: pointer; }
        .al-news-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .al-news-btn.al-news-btn-active { background: #fbe7dd; border-color: rgba(225, 93, 45, 0.3); color: #c94f21; }
        .al-news-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 640px) { .al-news-stats { grid-template-columns: repeat(4, 1fr); } }
        .al-news-stat-card { display: flex; align-items: center; gap: 12px; background: white; border: 1px solid #ece7dc; border-radius: 18px; padding: 14px 16px; box-shadow: 0 8px 20px rgba(17, 17, 17, 0.04); }
        .al-news-stat-icon { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; }
        .al-news-stat-value { font-size: 22px; font-weight: 800; line-height: 1; color: #111111; }
        .al-news-stat-value-text { font-size: 13px; font-weight: 700; line-height: 1.3; color: #111111; }
        .al-news-stat-label { font-size: 11px; font-weight: 600; color: #6b6f72; margin-top: 3px; }
        .al-news-count-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .al-news-count-text { font-size: 12px; color: #6b6f72; }
        .al-news-grid { display: grid; gap: 10px; }
        .al-news-grid-2 { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        .al-news-card { position: relative; display: flex; flex-direction: column; gap: 8px; background: white; border: 1px solid #ece7dc; border-radius: 16px; box-shadow: 0 8px 20px rgba(17, 17, 17, 0.04); padding: 13px; transition: border-color 0.15s; }
        .al-news-card:hover { border-color: rgba(225, 93, 45, 0.3); }
        .al-news-card-read { opacity: 0.6; }
        .al-news-card-saved { border-color: rgba(225, 93, 45, 0.35); }
        .al-news-source { font-size: 11.5px; font-weight: 700; color: #6b6f72; }
        .al-news-title-link { font-weight: 600; font-size: 13px; line-height: 1.35; color: #111111; text-decoration: none; }
        .al-news-title-link:hover { color: #c94f21; text-decoration: underline; text-underline-offset: 2px; }
        .al-news-desc { font-size: 11.5px; color: #6b6f72; line-height: 1.4; }
        .al-news-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; font-size: 10.5px; color: #9a958a; }
        .al-news-tag { border-radius: 6px; background: #f3ece1; padding: 1px 6px; color: #6b6f72; }
        .al-news-badge-top { display: inline-flex; align-items: center; gap: 3px; border-radius: 6px; background: #e7f5ee; padding: 2px 6px; font-size: 10px; font-weight: 700; color: #1f7a4d; flex-shrink: 0; }
        .al-news-badge-saved { border-radius: 6px; background: #fbe7dd; padding: 2px 6px; font-size: 10px; font-weight: 700; color: #c94f21; flex-shrink: 0; }
        .al-news-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 9px; border: 1px solid #ece7dc; background: white; color: #6b6f72; cursor: pointer; flex-shrink: 0; text-decoration: none; }
        .al-news-icon-btn:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
        .al-news-icon-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .al-news-icon-btn-done { color: #1f7a4d; }
        .al-news-open-btn { display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border-radius: 9px; border: 1px solid #ece7dc; background: white; font-size: 11px; font-weight: 600; color: #333029; text-decoration: none; }
        .al-news-open-btn:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
        .al-news-empty { background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); border-radius: 20px; padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .al-news-empty-icon { width: 48px; height: 48px; border-radius: 14px; background: #fbe7dd; display: flex; align-items: center; justify-content: center; color: #E15D2D; }
        .al-news-empty-title { color: #111111; font-weight: 700; font-size: 14px; }
        .al-news-empty-desc { color: #6b6f72; font-size: 12.5px; }
        .al-news-empty-link { color: #c94f21; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; background: none; border: none; cursor: pointer; padding: 0; font-size: inherit; }
        .al-news-filter-panel { background: white; border: 1px solid #ece7dc; border-radius: 18px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); padding: 16px; display: flex; flex-direction: column; gap: 16px; }
        .al-news-filter-head { display: flex; align-items: center; justify-content: space-between; }
        .al-news-filter-title { font-size: 13px; font-weight: 700; color: #111111; }
        .al-news-filter-clear { font-size: 11.5px; font-weight: 600; color: #9a958a; }
        .al-news-filter-clear:hover { color: #c94f21; }
        .al-news-filter-section { padding-top: 14px; border-top: 1px solid #f0ece2; }
        .al-news-filter-section:first-child { padding-top: 0; border-top: none; }
        .al-news-filter-section-label { margin-bottom: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9a958a; }
        .al-news-chip { border-radius: 999px; border: 1px solid #ece7dc; background: white; color: #333029; padding: 3px 10px; font-size: 11.5px; font-weight: 600; transition: border-color 0.15s, color 0.15s; }
        .al-news-chip:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
        .al-news-chip-active, .al-news-chip-active:hover { border-color: transparent; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; }
        .al-news-source-row { width: 100%; border-radius: 9px; padding: 5px 8px; text-align: left; font-size: 11.5px; color: #333029; background: none; border: none; cursor: pointer; }
        .al-news-source-row:hover { background: #f7f4ee; }
        .al-news-source-row-active { background: #fbe7dd; color: #c94f21; font-weight: 700; }
        .al-news-sync-info { border-radius: 12px; border: 1px solid #ece7dc; background: #faf8f4; padding: 10px; font-size: 10.5px; color: #6b6f72; }
        .al-news-sync-info strong { color: #111111; }
        .al-news-sync-warn { margin-top: 4px; color: #8a5c14; }
      `}</style>
      <div className="space-y-4">
        <div className="al-news-toolbar">
          <div className="al-news-search">
            <Search />
            <Input
              placeholder="Buscar título, fuente, tag..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="al-news-tabs">
            {ALL_CATEGORIES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={cn("al-news-tab", category === id && "al-news-tab-active")}
                onClick={() => setCategory(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="al-news-btn" onClick={syncNow} disabled={syncing}>
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            {syncing ? "Sync…" : "Sync"}
          </button>
          <button type="button" className={cn("al-news-btn", showFilters && "al-news-btn-active")} onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros{activeFilterCount > 0 ? ` ${activeFilterCount}` : ""}
          </button>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="al-news-stats">
              <div className="al-news-stat-card">
                <span className="al-news-stat-icon" style={{ background: "#fbe7dd", color: "#E15D2D" }}><Newspaper className="h-4.5 w-4.5" /></span>
                <div><p className="al-news-stat-value">{kpiTotal}</p><p className="al-news-stat-label">Total</p></div>
              </div>
              <div className="al-news-stat-card">
                <span className="al-news-stat-icon" style={{ background: "#e7f5ee", color: "#1f7a4d" }}><Bell className="h-4.5 w-4.5" /></span>
                <div><p className="al-news-stat-value">{kpiNuevas}</p><p className="al-news-stat-label">Nuevas</p></div>
              </div>
              <div className="al-news-stat-card">
                <span className="al-news-stat-icon" style={{ background: "#fdf1dd", color: "#b4791f" }}><BookmarkCheck className="h-4.5 w-4.5" /></span>
                <div><p className="al-news-stat-value">{kpiGuardadas}</p><p className="al-news-stat-label">Guardadas</p></div>
              </div>
              {kpiFailed > 0 ? (
                <div className="al-news-stat-card">
                  <span className="al-news-stat-icon" style={{ background: "#fbe2df", color: "#c23a2e" }}><AlertTriangle className="h-4.5 w-4.5" /></span>
                  <div><p className="al-news-stat-value">{kpiFailed}</p><p className="al-news-stat-label">Errores sync</p></div>
                </div>
              ) : (
                <div className="al-news-stat-card">
                  <span className="al-news-stat-icon" style={{ background: "#f3ece1", color: "#6b6f72" }}><RefreshCw className="h-4.5 w-4.5" /></span>
                  <div><p className="al-news-stat-value-text">{lastSync ?? "—"}</p><p className="al-news-stat-label">Último sync</p></div>
                </div>
              )}
            </div>

            <div className="al-news-count-row">
              <p className="al-news-count-text">
                Mostrando {filtered.length} {filtered.length === 1 ? "artículo" : "artículos"}
                {lastSync ? ` · sync ${lastSync}` : ""}
              </p>
              <div className="al-news-tabs">
                {(["lista", "grid"] as const).map((v) => (
                  <button key={v} type="button" className={cn("al-news-tab", viewMode === v && "al-news-tab-active")} onClick={() => setViewMode(v)}>
                    {v === "lista" ? "Lista" : "Grid"}
                  </button>
                ))}
              </div>
            </div>

            {loading && items.length === 0 ? (
              <div className="al-news-empty">
                <span className="al-news-empty-icon"><Newspaper className="h-5 w-5" /></span>
                <p className="al-news-empty-title">Cargando noticias…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="al-news-empty">
                <span className="al-news-empty-icon"><Search className="h-5 w-5" /></span>
                <p className="al-news-empty-title">Sin resultados</p>
                <p className="al-news-empty-desc">
                  No hay artículos con estos filtros.{" "}
                  <button type="button" className="al-news-empty-link" onClick={syncNow}>
                    Sincronizar ahora
                  </button>
                </p>
              </div>
            ) : (
              <div className={cn("al-news-grid", viewMode === "grid" && "al-news-grid-2")}>
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

          {showFilters && (
            <div className="w-full shrink-0 lg:w-64">
              <div className="al-news-filter-panel">
                <div className="al-news-filter-head">
                  <span className="al-news-filter-title">Filtros</span>
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearFilters} className="al-news-filter-clear">
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="al-news-filter-section">
                  <p className="al-news-filter-section-label">Ordenar</p>
                  <div className="flex flex-wrap gap-1.5">
                    {([["date", "Reciente"], ["score", "Relevancia"]] as const).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSort(v)}
                        className={cn("al-news-chip", sort === v && "al-news-chip-active")}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="al-news-filter-section">
                  <p className="al-news-filter-section-label">Estado</p>
                  <div className="flex flex-wrap gap-1.5">
                    {([["all", "Todas"], ["new", "Nueva"], ["read", "Leída"], ["saved", "Guardada"]] as const).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setStatusFilter(v)}
                        className={cn("al-news-chip", statusFilter === v && "al-news-chip-active")}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {sources.length > 1 && (
                  <div className="al-news-filter-section">
                    <p className="al-news-filter-section-label">Fuente</p>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      <button
                        type="button"
                        onClick={() => setSourceFilter("")}
                        className={cn("al-news-source-row", !sourceFilter && "al-news-source-row-active")}
                      >
                        Todas las fuentes
                      </button>
                      {sources.map(([id, name]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSourceFilter(sourceFilter === id ? "" : id)}
                          className={cn("al-news-source-row", sourceFilter === id && "al-news-source-row-active")}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="al-news-filter-section">
                  <p className="al-news-filter-section-label">Solo</p>
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

                {syncStatus && (
                  <div className="al-news-sync-info">
                    <p><strong>{syncStatus.totalItems}</strong> artículos guardados</p>
                    <p>{syncStatus.newToday} nuevos hoy</p>
                    {syncStatus.sources.filter((s) => !s.ok).length > 0 && (
                      <p className="al-news-sync-warn">
                        {syncStatus.sources.filter((s) => !s.ok).length} fuente(s) con error
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
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
  const cardClass = cn(
    "al-news-card",
    item.status === "read" && "al-news-card-read",
    item.status === "saved" && "al-news-card-saved"
  );

  if (compact) {
    return (
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="al-news-source truncate">{item.sourceName}</span>
              {item.relevanceScore >= 50 && (
                <span className="al-news-badge-top"><Sparkles className="h-2.5 w-2.5" />top</span>
              )}
              {item.status === "saved" && <span className="al-news-badge-saved">guardada</span>}
            </div>
            <a href={item.url} target="_blank" rel="noreferrer noopener" onClick={onRead} className="al-news-title-link block line-clamp-2">
              {item.title}
            </a>
            {item.description && <p className="al-news-desc line-clamp-1">{item.description}</p>}
            <div className="al-news-meta">
              {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
              {item.tags.slice(0, 3).map((t) => (
                <span key={t} className="al-news-tag">#{t}</span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <a href={item.url} target="_blank" rel="noreferrer noopener" onClick={onRead} className="al-news-icon-btn">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {item.status !== "saved" ? (
              <button type="button" className="al-news-icon-btn" onClick={onSave} title="Guardar">
                <BookmarkCheck className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button type="button" className="al-news-icon-btn al-news-icon-btn-done" disabled>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between gap-2">
        <span className="al-news-source truncate">{item.sourceName}</span>
        <div className="flex shrink-0 items-center gap-1">
          {item.relevanceScore >= 50 && (
            <span className="al-news-badge-top"><Sparkles className="h-2.5 w-2.5" />top</span>
          )}
          {item.status === "saved" && <span className="al-news-badge-saved">guardada</span>}
        </div>
      </div>
      <a href={item.url} target="_blank" rel="noreferrer noopener" onClick={onRead} className="al-news-title-link line-clamp-3">
        {item.title}
      </a>
      {item.description && <p className="al-news-desc line-clamp-2">{item.description}</p>}
      <div className="mt-auto space-y-2">
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((t) => (
            <span key={t} className="al-news-tag">#{t}</span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="al-news-meta">
            {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
          </div>
          <div className="flex items-center gap-1">
            <a href={item.url} target="_blank" rel="noreferrer noopener" onClick={onRead} className="al-news-open-btn">
              Abrir
            </a>
            {item.status !== "saved" ? (
              <button type="button" className="al-news-icon-btn" onClick={onSave}>
                <BookmarkCheck className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button type="button" className="al-news-icon-btn al-news-icon-btn-done" disabled>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
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
