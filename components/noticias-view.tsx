"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type NewsCategory } from "@/lib/sources/source-registry";
import type { NewsItem, NewsStatus, SyncStatus } from "@/lib/news/types";

const CATEGORY_TABS: Array<{ id: NewsCategory | "all"; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "tech", label: CATEGORY_LABELS.tech },
  { id: "granada", label: CATEGORY_LABELS.granada },
  { id: "economy", label: CATEGORY_LABELS.economy },
  { id: "programming", label: CATEGORY_LABELS.programming },
  { id: "jobs", label: CATEGORY_LABELS.jobs },
  { id: "companies", label: CATEGORY_LABELS.companies },
  { id: "hackathons", label: CATEGORY_LABELS.hackathons },
];

const STATUS_OPTIONS: Array<{ id: NewsStatus | "all"; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "new", label: "Nuevas" },
  { id: "read", label: "Leídas" },
  { id: "saved", label: "Guardadas" },
];

type ApiResponse = { items: NewsItem[]; status: SyncStatus };
const VALID_CATEGORY_IDS = new Set(CATEGORY_TABS.map((tab) => tab.id));

function categoryFromParam(value: string | null): NewsCategory | "all" {
  return value && VALID_CATEGORY_IDS.has(value as NewsCategory) ? (value as NewsCategory) : "all";
}

export function NoticiasView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [category, setCategory] = useState<NewsCategory | "all">(() =>
    categoryFromParam(searchParams.get("category")),
  );
  const [statusFilter, setStatusFilter] = useState<NewsStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sort, setSort] = useState<"date" | "score">("date");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  function selectCategory(nextCategory: NewsCategory | "all") {
    setCategory(nextCategory);
    const params = new URLSearchParams(searchParams.toString());
    if (nextCategory === "all") params.delete("category");
    else params.set("category", nextCategory);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  async function load(autoSync = false) {
    setLoading(true);
    try {
      const url = autoSync ? "/api/news?auto=1" : "/api/news";
      const r = await fetch(url, { cache: "no-store" });
      const data = (await r.json()) as ApiResponse;
      setItems(data.items ?? []);
      setStatus(data.status ?? null);
    } catch (err) {
      console.warn("Error cargando noticias", err);
    } finally {
      setLoading(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const r = await fetch("/api/news/sync?force=1", { method: "POST" });
      const data = (await r.json()) as { ok: boolean; status?: SyncStatus };
      if (data.ok && data.status) setStatus(data.status);
      await load(false);
    } finally {
      setSyncing(false);
    }
  }

  async function markRead(id: string) {
    try {
      await fetch(`/api/news/${encodeURIComponent(id)}/read`, { method: "PATCH" });
      setItems((s) => s.map((i) => (i.id === id ? { ...i, status: "read" } : i)));
    } catch {/* noop */}
  }

  async function markSaved(id: string) {
    try {
      await fetch(`/api/news/${encodeURIComponent(id)}/save`, { method: "PATCH" });
      setItems((s) => s.map((i) => (i.id === id ? { ...i, status: "saved" } : i)));
    } catch {/* noop */}
  }

  useEffect(() => {
    load(true);
  }, []);

  useEffect(() => {
    setCategory(categoryFromParam(searchParams.get("category")));
  }, [searchParams]);

  const sources = useMemo(
    () => Array.from(new Set(items.map((i) => i.sourceId))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    let out = items;
    if (category !== "all") out = out.filter((i) => i.category === category);
    if (statusFilter !== "all") out = out.filter((i) => i.status === statusFilter);
    if (sourceFilter) out = out.filter((i) => i.sourceId === sourceFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    out = out.slice().sort((a, b) =>
      sort === "score"
        ? b.relevanceScore - a.relevanceScore
        : (b.publishedAt || b.fetchedAt).localeCompare(a.publishedAt || a.fetchedAt),
    );
    return out;
  }, [items, category, statusFilter, sourceFilter, search, sort]);

  const failedSources = status?.sources.filter((s) => !s.ok) ?? [];

  return (
    <div className="space-y-4">
      {/* ── Cabecera: título izquierda + stats compactos derecha ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Newspaper className="h-5 w-5 text-primary" />
            Noticias
          </h2>
          <p className="text-sm text-muted-foreground">
            Radar diario de oportunidades, tecnología y Granada.
          </p>
        </div>

        {/* Stats compactos esquina derecha */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 font-medium">
            <span className="text-foreground font-semibold">{status?.totalItems ?? items.length}</span>
            <span className="text-muted-foreground">total</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-medium text-primary">
            <span className="font-semibold">{status?.newToday ?? 0}</span>
            <span className="opacity-80">nuevas hoy</span>
          </span>
          {status?.lastSyncAt && (
            <span className="text-muted-foreground hidden sm:inline">
              · {formatRelative(status.lastSyncAt)}
            </span>
          )}
          {failedSources.length > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {failedSources.length} error{failedSources.length !== 1 ? "es" : ""}
            </span>
          )}
          <Button onClick={syncNow} disabled={syncing} size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1">
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            {syncing ? "Sync…" : "Sync"}
          </Button>
        </div>
      </div>

      {/* ── Tabs de categoría ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectCategory(t.id)}
            className={cn(
              "flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
              category === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Barra de filtros compacta (una fila) ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[140px] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
          />
        </div>
        <Select
          className="h-8 w-auto text-xs"
          value={sort}
          onChange={(e) => setSort(e.target.value as "date" | "score")}
        >
          <option value="date">Más reciente</option>
          <option value="score">Mejor match</option>
        </Select>
        <Select
          className="h-8 w-auto text-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as NewsStatus | "all")}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </Select>
        {sources.length > 0 && (
          <Select
            className="h-8 w-auto text-xs max-w-[150px]"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">Todas las fuentes</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {items.find((i) => i.sourceId === s)?.sourceName ?? s}
              </option>
            ))}
          </Select>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Listado ── */}
      <div className="space-y-2">
        {loading && items.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-card/60 p-8 text-center text-sm text-muted-foreground">
            Cargando radar…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-card/60 p-8 text-center text-sm text-muted-foreground">
            No hay noticias con esos filtros.{" "}
            <button
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={syncNow}
            >
              Sincronizar ahora
            </button>
          </div>
        ) : (
          filtered.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              onRead={() => markRead(item.id)}
              onSave={() => markSaved(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NewsCard({
  item,
  onRead,
  onSave,
}: {
  item: NewsItem;
  onRead: () => void;
  onSave: () => void;
}) {
  return (
    <Card
      className={cn(
        "group px-4 py-3 transition-colors hover:bg-accent/30",
        item.status === "read" && "opacity-70",
        item.status === "saved" && "ring-1 ring-primary/40",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Contenido principal */}
        <div className="min-w-0 flex-1 space-y-1">
          {/* Título + badges */}
          <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              onClick={onRead}
              className="font-medium leading-snug hover:text-primary hover:underline underline-offset-2 transition-colors line-clamp-2 min-w-0"
            >
              {item.title}
            </a>
          </div>
          {/* Descripción */}
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/70">{item.sourceName}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{formatDate(item.publishedAt) || "Sin fecha"}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className={cn(
              "rounded-full px-1.5 py-0.5 font-medium",
              item.category === "jobs" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
              item.category === "granada" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
              item.category === "hackathons" ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" :
              "bg-muted text-muted-foreground"
            )}>
              {CATEGORY_LABELS[item.category]}
            </span>
            {item.relevanceScore >= 50 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <Sparkles className="h-2.5 w-2.5" />top
              </span>
            )}
            <StatusBadge status={item.status} />
            {item.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex shrink-0 items-center gap-1">
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onRead}>
            <a href={item.url} target="_blank" rel="noreferrer noopener">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          {item.status !== "saved" ? (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onSave} title="Guardar">
              <BookmarkCheck className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 px-2" disabled title="Guardada">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: NewsStatus }) {
  if (status === "saved")
    return (
      <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-primary font-medium">
        guardada
      </span>
    );
  if (status === "read")
    return (
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
        leída
      </span>
    );
  return (
    <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-blue-600 dark:text-blue-300 font-medium">
      nueva
    </span>
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
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `hace ${days}d`;
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(d);
}
