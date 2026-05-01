#!/usr/bin/env node
/**
 * CLI para sincronizar noticias contra el endpoint local /api/news/sync.
 * Uso:
 *   npm run sync:news                 # asume http://localhost:3000
 *   BASE_URL=http://localhost:3001 npm run sync:news
 */
const base = process.env.BASE_URL || "http://localhost:3000";
const url = `${base}/api/news/sync?force=1`;

(async () => {
  console.log(`[sync:news] POST ${url}`);
  try {
    const r = await fetch(url, { method: "POST" });
    const data = await r.json();
    if (!data.ok) {
      console.error("[sync:news] sync error:", data.error);
      process.exit(1);
    }
    const { totalItems, newToday, sources } = data.status ?? {};
    const failed = (sources ?? []).filter((s) => !s.ok);
    console.log(`[sync:news] OK · total=${totalItems} · new today=${newToday}`);
    if (failed.length) {
      console.warn(`[sync:news] ${failed.length} fuente(s) con error:`);
      for (const f of failed) console.warn(`   - ${f.sourceId}: ${f.error}`);
    }
  } catch (err) {
    console.error("[sync:news] fetch failed:", err.message);
    process.exit(1);
  }
})();
