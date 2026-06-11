import { promises as fs } from "node:fs";
import path from "node:path";
import type { NewsItem, NewsListFilters, NewsStatus, SourceSyncRecord, SyncStatus } from "@/lib/news/types";
import { SOURCES } from "@/lib/sources/source-registry";
import { cleanNewsText } from "@/lib/news/text";
import { normalizeNewsUrl, stableNewsId } from "@/lib/news/ids";
import { isGranadaCandidateJob } from "@/lib/news/job-filters";

/** IDs de fuentes activas. Se recalcula en cada import (startup). */
const VALID_SOURCE_IDS = new Set(SOURCES.map((s) => s.id));
const BLOCKED_SOURCE_IDS = new Set(["xataka"]);
const VALID_STATUSES = new Set<NewsStatus>(["new", "read", "saved"]);

/**
 * Almacenamiento persistente en JSON local para desarrollo.
 *
 * Diseñado para poder migrar a SQLite/Prisma/Supabase sin tocar el resto del
 * proyecto: las funciones públicas (`readAllItems`, `upsertItems`, etc.) son
 * la API estable.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const ITEMS_FILE = path.join(DATA_DIR, "news-items.json");
const STATUS_FILE = path.join(DATA_DIR, "news-sync-status.json");

const MAX_ITEMS = 800;

// Promise-coalescing cache: multiple concurrent callers share one file read
let _itemsCache: { data: NewsItem[]; ts: number } | null = null;
let _itemsInFlight: Promise<NewsItem[]> | null = null;
const CACHE_TTL = 30_000;

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    /* noop */
  }
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    const text = await fs.readFile(file, "utf-8");
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(file: string, data: unknown): Promise<void> {
  await ensureDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

export async function readAllItems(): Promise<NewsItem[]> {
  const now = Date.now();
  if (_itemsCache && now - _itemsCache.ts < CACHE_TTL) return _itemsCache.data;
  if (_itemsInFlight) return _itemsInFlight;

  _itemsInFlight = (async () => {
    const all = await readJsonFile<NewsItem[]>(ITEMS_FILE, []);
    const normalized = all
      .map(normalizeStoredItem)
      .filter((item): item is NewsItem => Boolean(item));

    if (normalized.length !== all.length) {
      writeAllItems(normalized).catch(() => {});
    }

    _itemsCache = { data: normalized, ts: Date.now() };
    return normalized;
  })().finally(() => { _itemsInFlight = null; });

  return _itemsInFlight;
}

export async function readSyncStatus(): Promise<SyncStatus> {
  return readJsonFile<SyncStatus>(STATUS_FILE, {
    lastSyncAt: null,
    lastSyncOk: false,
    totalItems: 0,
    newToday: 0,
    sources: [],
  });
}

export async function writeAllItems(items: NewsItem[]): Promise<void> {
  _itemsCache = null;
  const trimmed = items
    .slice()
    .sort((a, b) => (b.publishedAt || b.fetchedAt).localeCompare(a.publishedAt || a.fetchedAt))
    .slice(0, MAX_ITEMS);
  await writeJsonFile(ITEMS_FILE, trimmed);
}

export async function writeSyncStatus(status: SyncStatus): Promise<void> {
  await writeJsonFile(STATUS_FILE, status);
}

// ─── Operaciones públicas ────────────────────────────────────────────────────

function normUrl(u: string): string {
  return normalizeNewsUrl(u);
}

function normalizeStoredItem(item: NewsItem): NewsItem | null {
  if (!item?.sourceId || !VALID_SOURCE_IDS.has(item.sourceId) || BLOCKED_SOURCE_IDS.has(item.sourceId)) {
    return null;
  }

  const title = cleanNewsText(item.title, 240);
  if (!title || !item.url) return null;

  const tags = (item.tags ?? [])
    .map((tag) => cleanNewsText(tag, 40))
    .filter((tag): tag is string => Boolean(tag));

  const normalized: NewsItem = {
    ...item,
    id: stableNewsId(item.sourceId, item.url),
    title,
    description: cleanNewsText(item.description, 280),
    tags: Array.from(new Set(tags)),
    status: VALID_STATUSES.has(item.status) ? item.status : "new",
  };

  return isGranadaCandidateJob(normalized) ? normalized : null;
}

function similarTitle(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
  const A = norm(a);
  const B = norm(b);
  if (!A || !B) return false;
  if (A === B) return true;
  if (A.length > 20 && B.length > 20 && (A.startsWith(B.slice(0, 30)) || B.startsWith(A.slice(0, 30))))
    return true;
  return false;
}

/**
 * Inserta o actualiza items, dedup por URL normalizada y por título similar
 * de la misma fuente. Devuelve cuántos eran nuevos vs. actualizados.
 */
export async function upsertItems(
  incoming: NewsItem[],
): Promise<{ added: number; updated: number; items: NewsItem[] }> {
  const current = await readAllItems();
  const byUrl = new Map<string, NewsItem>();
  for (const it of current) byUrl.set(normUrl(it.url), it);

  let added = 0;
  let updated = 0;

  for (const raw of incoming) {
    if (!isGranadaCandidateJob(raw)) continue;

    const key = normUrl(raw.url);
    const existing = byUrl.get(key);
    if (existing) {
      // Mantener estado y fechas originales, refrescar metadatos
      const merged: NewsItem = {
        ...existing,
        title: raw.title || existing.title,
        description: raw.description ?? existing.description,
        tags: Array.from(new Set([...(existing.tags ?? []), ...(raw.tags ?? [])])),
        relevanceScore: raw.relevanceScore || existing.relevanceScore,
        publishedAt: raw.publishedAt ?? existing.publishedAt,
      };
      byUrl.set(key, merged);
      updated++;
      continue;
    }
    // Dedup por título similar de la misma fuente
    const dup = current.find(
      (c) => c.sourceId === raw.sourceId && similarTitle(c.title, raw.title),
    );
    if (dup) {
      updated++;
      continue;
    }
    byUrl.set(key, raw);
    added++;
  }

  const merged = Array.from(byUrl.values());
  await writeAllItems(merged);
  return { added, updated, items: merged };
}

export function filterItems(items: NewsItem[], filters: NewsListFilters = {}): NewsItem[] {
  let out = items;

  if (filters.category && filters.category !== "all") {
    out = out.filter((i) => i.category === filters.category);
  }
  if (filters.sourceId) out = out.filter((i) => i.sourceId === filters.sourceId);
  if (filters.status && filters.status !== "all") {
    out = out.filter((i) => i.status === filters.status);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    out = out.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  const sort = filters.sort ?? "date";
  if (sort === "score") {
    out = out.slice().sort((a, b) => b.relevanceScore - a.relevanceScore);
  } else {
    out = out
      .slice()
      .sort((a, b) => (b.publishedAt || b.fetchedAt).localeCompare(a.publishedAt || a.fetchedAt));
  }

  if (filters.limit && filters.limit > 0) out = out.slice(0, filters.limit);
  return out;
}

export async function listItems(filters: NewsListFilters = {}): Promise<NewsItem[]> {
  return filterItems(await readAllItems(), filters);
}

export async function setItemStatus(id: string, status: NewsStatus): Promise<NewsItem | null> {
  const items = await readAllItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], status };
  await writeAllItems(items);
  return items[idx];
}

export async function recomputeStatus(syncRecords: SourceSyncRecord[]): Promise<SyncStatus> {
  const items = await readAllItems();
  const todayKey = new Date().toISOString().slice(0, 10);
  const newToday = items.filter((i) => i.fetchedAt.startsWith(todayKey)).length;
  const status: SyncStatus = {
    lastSyncAt: new Date().toISOString(),
    lastSyncOk: syncRecords.some((r) => r.ok),
    totalItems: items.length,
    newToday,
    sources: syncRecords,
  };
  await writeSyncStatus(status);
  return status;
}
