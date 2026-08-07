import { fetchSource } from "@/lib/news/fetchers";
import { recomputeStatus, readSyncStatus, upsertItems } from "@/lib/news/store";
import type { NewsItem, SourceSyncRecord, SyncStatus } from "@/lib/news/types";
import { getFetchableSources } from "@/lib/sources/source-registry";

const MIN_INTERVAL_MS = 1000 * 60 * 60 * 12; // 12h mínimo entre sincros automáticas

let inFlight: Promise<SyncStatus> | null = null;

function isSyncedToday(lastSyncAt: string | null): boolean {
  if (!lastSyncAt) return false;
  const last = new Date(lastSyncAt);
  if (Number.isNaN(last.getTime())) return false;
  const now = new Date();
  return (
    last.getUTCFullYear() === now.getUTCFullYear() &&
    last.getUTCMonth() === now.getUTCMonth() &&
    last.getUTCDate() === now.getUTCDate()
  );
}

async function runSync(): Promise<SyncStatus> {
  const sources = getFetchableSources();
  const records: SourceSyncRecord[] = [];

  const results = await Promise.allSettled(
    sources.map(async (s) => {
      try {
        const items = await fetchSource(s);
        return { source: s, items };
      } catch (err) {
        return { source: s, error: (err as Error).message ?? "unknown error", items: [] as NewsItem[] };
      }
    }),
  );

  const allItems: NewsItem[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const src = sources[i];
    if (r.status === "fulfilled") {
      const { items, error } = r.value as { items: NewsItem[]; error?: string };
      allItems.push(...items);
      records.push({
        sourceId: src.id,
        lastSyncAt: new Date().toISOString(),
        ok: !error,
        itemsAdded: 0, // se completa tras upsert
        itemsUpdated: 0,
        error,
      });
    } else {
      records.push({
        sourceId: src.id,
        lastSyncAt: new Date().toISOString(),
        ok: false,
        itemsAdded: 0,
        itemsUpdated: 0,
        error: String(r.reason ?? "rejected"),
      });
    }
  }

  const { added, updated } = await upsertItems(allItems);
  // Atribución sencilla: prorrateamos los nuevos al primer source si no hay desglose
  if (records.length) {
    records[0].itemsAdded = added;
    records[0].itemsUpdated = updated;
  }

  return recomputeStatus(records);
}

/**
 * Lanza una sync si toca (cada 24h) o si se fuerza.
 * Garantiza una única ejecución concurrente.
 */
export async function syncIfNeeded(force = false): Promise<SyncStatus> {
  const status = await readSyncStatus();
  if (!force && isSyncedToday(status.lastSyncAt)) return status;
  if (!force && status.lastSyncAt) {
    const since = Date.now() - new Date(status.lastSyncAt).getTime();
    if (since < MIN_INTERVAL_MS) return status;
  }
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export async function forceSync(): Promise<SyncStatus> {
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
