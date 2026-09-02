// Executable coverage for the pure News presentation/list model extracted from
// src/features/news/client/news-view.tsx in issue #371.

import assert from "node:assert/strict";
import test from "node:test";

import {
  collectNewsSources,
  filterAndSortNews,
  formatDate,
  formatDateTime,
  formatModule,
  formatTopic,
  isCurrentNewsItem,
  isPublishedToday,
  newsHeroImage,
  newsItemDate,
  selectNewsForTab,
  selectRecientes,
} from "../../../src/features/news/news-model.ts";

const DAY = 86_400_000;
const iso = (offsetDays) => new Date(Date.now() - offsetDays * DAY).toISOString();

const item = (over = {}) => ({
  id: "n1",
  sourceId: "s1",
  sourceName: "Fuente Uno",
  title: "Titular",
  description: "",
  url: "https://example.org/n1",
  kind: "news",
  publishedAt: iso(1),
  fetchedAt: iso(1),
  targetCycleCodes: ["DAW"],
  moduleCodes: [],
  topics: [],
  matchReasons: [],
  trustTier: "sector",
  status: "new",
  isFeatured: false,
  keyFacts: [],
  ...over,
});

test("newsHeroImage is deterministic, cycle-family aware, and falls back to the placeholder", () => {
  assert.equal(newsHeroImage({ id: "x", targetCycleCodes: [] }), "/assets/noticias/noticia-hero-placeholder.svg");
  const a = newsHeroImage({ id: "abc", targetCycleCodes: ["DAW"] });
  assert.equal(a, newsHeroImage({ id: "abc", targetCycleCodes: ["DAM"] }), "the two dev cycles share one family and hash");
  assert.match(a, /^\/assets\/noticias\/noticia-hero-desarrollo-[1-5]\.jpg$/);
  assert.match(newsHeroImage({ id: "b", targetCycleCodes: ["AF"] }), /noticia-hero-administracion-[1-4]\.jpg$/);
  assert.match(newsHeroImage({ id: "c", targetCycleCodes: ["MP"] }), /noticia-hero-marketing-[1-4]\.jpg$/);
  assert.match(newsHeroImage({ id: "d", targetCycleCodes: ["TSAF"] }), /noticia-hero-deporte-[1-3]\.jpg$/);
});

test("the date formatters degrade to an honest label on an unparseable value", () => {
  assert.equal(formatDate("not-a-date"), "Fecha no indicada");
  assert.equal(formatDateTime("not-a-date"), "Fecha no indicada");
  assert.match(formatDate("2026-08-20T10:15:00.000Z"), /2026/);
  assert.match(formatDateTime("2026-08-20T10:15:00.000Z"), /\d{2}:\d{2}/);
});

test("formatModule and formatTopic humanise the raw codes", () => {
  assert.equal(formatModule("gestion_de_datos"), "Gestion de datos");
  assert.equal(formatTopic("empleo-publico-2026"), "empleo publico 2026");
});

test("newsItemDate prefers publishedAt and falls back to fetchedAt", () => {
  assert.equal(newsItemDate({ publishedAt: "2026-08-01", fetchedAt: "2026-08-05" }), "2026-08-01");
  assert.equal(newsItemDate({ publishedAt: undefined, fetchedAt: "2026-08-05" }), "2026-08-05");
});

test("isPublishedToday and isCurrentNewsItem apply the freshness windows", () => {
  assert.equal(isPublishedToday({ publishedAt: new Date().toISOString(), fetchedAt: iso(9) }), true);
  assert.equal(isPublishedToday({ publishedAt: iso(2), fetchedAt: iso(2) }), false);
  assert.equal(isPublishedToday({ publishedAt: "bad", fetchedAt: "bad" }), false);

  assert.equal(isCurrentNewsItem({ publishedAt: iso(3), fetchedAt: iso(3), kind: "news" }), true);
  assert.equal(isCurrentNewsItem({ publishedAt: iso(10), fetchedAt: iso(10), kind: "news" }), false);
  assert.equal(isCurrentNewsItem({ publishedAt: iso(20), fetchedAt: iso(20), kind: "legal" }), true);
  assert.equal(isCurrentNewsItem({ publishedAt: iso(40), fetchedAt: iso(40), kind: "legal" }), false);
});

test("collectNewsSources deduplicates by id and orders by source name", () => {
  const pairs = collectNewsSources([
    { sourceId: "b", sourceName: "Zeta" },
    { sourceId: "a", sourceName: "Alfa" },
    { sourceId: "b", sourceName: "Zeta" },
  ]);
  assert.deepEqual(pairs, [["a", "Alfa"], ["b", "Zeta"]]);
});

test("selectRecientes keeps live items and only keeps a saved item while it is still fresh", () => {
  const fresh = item({ id: "fresh", status: "new", publishedAt: iso(2), fetchedAt: iso(2) });
  const savedFresh = item({ id: "saved-fresh", status: "saved", publishedAt: iso(2), fetchedAt: iso(2) });
  const savedStale = item({ id: "saved-stale", status: "saved", publishedAt: iso(60), fetchedAt: iso(60) });

  assert.deepEqual(
    selectRecientes([fresh, savedFresh, savedStale]).map((i) => i.id),
    ["fresh", "saved-fresh"],
  );
});

test("selectNewsForTab routes each tab to its subset", () => {
  const today = item({ id: "today", status: "new", publishedAt: new Date().toISOString(), fetchedAt: iso(9) });
  const week = item({ id: "week", status: "read", publishedAt: iso(3), fetchedAt: iso(3) });
  const saved = item({ id: "saved", status: "saved", publishedAt: iso(1), fetchedAt: iso(1) });
  const all = [today, week, saved];

  assert.deepEqual(selectNewsForTab(all, "hoy").map((i) => i.id), ["today"]);
  assert.deepEqual(selectNewsForTab(all, "sinleer").map((i) => i.id), ["today"]);
  assert.deepEqual(selectNewsForTab(all, "guardadas").map((i) => i.id), ["saved"]);
  assert.deepEqual(selectNewsForTab(all, "recientes").map((i) => i.id).sort(), ["saved", "today", "week"]);
});

test("filterAndSortNews applies the source filter, the text search and the chosen ordering without mutating", () => {
  const items = [
    item({ id: "old-official", sourceId: "s1", sourceName: "Boletín", trustTier: "official", title: "Convocatoria de empleo", publishedAt: iso(9), fetchedAt: iso(9) }),
    item({ id: "new-sector", sourceId: "s2", sourceName: "Sector", trustTier: "sector", title: "Novedades del mercado", topics: ["empleo"], publishedAt: iso(1), fetchedAt: iso(1) }),
    item({ id: "mid-ref", sourceId: "s1", sourceName: "Boletín", trustTier: "reference", title: "Nota breve", publishedAt: iso(5), fetchedAt: iso(5) }),
  ];
  const snapshot = [...items];

  assert.deepEqual(
    filterAndSortNews(items, { search: "", sourceId: "s1", sort: "date" }).map((i) => i.id),
    ["mid-ref", "old-official"],
  );
  assert.deepEqual(
    filterAndSortNews(items, { search: "EMPLEO", sourceId: "", sort: "date" }).map((i) => i.id),
    ["new-sector", "old-official"],
  );
  assert.deepEqual(
    filterAndSortNews(items, { search: "", sourceId: "", sort: "date" }).map((i) => i.id),
    ["new-sector", "mid-ref", "old-official"],
  );
  assert.deepEqual(
    filterAndSortNews(items, { search: "", sourceId: "", sort: "trust" }).map((i) => i.id),
    ["old-official", "new-sector", "mid-ref"],
  );
  assert.deepEqual(items, snapshot, "the source list is not reordered in place");
});
