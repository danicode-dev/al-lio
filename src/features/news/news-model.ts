import type { FpCycleCode } from "@/lib/db/types";
import type { NewsItem, NewsTrustTier } from "@/lib/news/types";

/**
 * Framework-free presentation and list model for the News feature: trust/kind
 * labels, hero-image selection, date formatting, the freshness predicates and
 * the list tab/search/sort logic. Split out of
 * src/components/noticias/noticias-view.tsx so it has direct executable
 * coverage. Self-contained (only `import type`), so
 * tests/unit/news/news-model.test.mjs runs it directly. Verified-detail source
 * fields stay owned by #201 / the Radar contract.
 */

export const TRUST_LABELS: Record<NewsTrustTier, string> = {
  official: "Oficial",
  institutional: "Institucional",
  first_party: "Primera parte",
  sector: "Sectorial",
  reference: "Especializada",
};

export const KIND_LABELS: Record<NewsItem["kind"], string> = {
  news: "Noticia",
  event: "Evento",
  call: "Convocatoria",
  legal: "Normativa",
};

const TRUST_WEIGHT: Record<NewsTrustTier, number> = {
  official: 5,
  institutional: 4,
  first_party: 3,
  sector: 2,
  reference: 1,
};

// Banner artwork is organised by professional family; the two development
// cycles share one family and every family holds several numbered variants.
const NEWS_HERO_POOL = { desarrollo: 5, administracion: 4, marketing: 4, deporte: 3 } as const;

const CYCLE_HERO_FAMILY: Record<FpCycleCode, keyof typeof NEWS_HERO_POOL> = {
  DAW: "desarrollo",
  DAM: "desarrollo",
  AF: "administracion",
  MP: "marketing",
  TSAF: "deporte",
};

/**
 * One stable banner per item, hashed from its id, so a re-featured item always
 * carries the same image. An item with no target cycle (the database forbids
 * it) falls back to the neutral placeholder rather than someone else's artwork.
 */
export function newsHeroImage(item: Pick<NewsItem, "id" | "targetCycleCodes">): string {
  const cycle = item.targetCycleCodes[0];
  const family = cycle ? CYCLE_HERO_FAMILY[cycle] : undefined;
  if (!family) return "/assets/noticias/noticia-hero-placeholder.svg";
  let hash = 0;
  for (let index = 0; index < item.id.length; index += 1) hash = (hash * 31 + item.id.charCodeAt(index)) | 0;
  return `/assets/noticias/noticia-hero-${family}-${(Math.abs(hash) % NEWS_HERO_POOL[family]) + 1}.jpg`;
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

type DatedNewsItem = Pick<NewsItem, "publishedAt" | "fetchedAt">;

export function newsItemDate(item: DatedNewsItem): string {
  return item.publishedAt ?? item.fetchedAt;
}

export function isPublishedToday(item: DatedNewsItem): boolean {
  const date = new Date(newsItemDate(item));
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

/** A live item: within the seven-day news / thirty-day legal freshness window. */
export function isCurrentNewsItem(item: DatedNewsItem & Pick<NewsItem, "kind">): boolean {
  const date = Date.parse(newsItemDate(item));
  if (Number.isNaN(date)) return false;
  const ageDays = (Date.now() - date) / 86_400_000;
  return ageDays <= (item.kind === "legal" ? 30 : 7);
}

export type NewsListSort = "date" | "trust";
export type NewsListTab = "hoy" | "recientes" | "sinleer" | "guardadas";

type ListNewsItem = NewsItem;

/** The distinct sources in the loaded feed, as `[id, name]` pairs ordered by name. */
export function collectNewsSources(items: readonly Pick<NewsItem, "sourceId" | "sourceName">[]): [string, string][] {
  return Array.from(new Map(items.map((item) => [item.sourceId, item.sourceName])).entries())
    .sort((first, second) => first[1].localeCompare(second[1]));
}

// Counts and tab contents come from the same loaded items, so a tab number
// always matches the list it opens. "recientes" is the whole current feed;
// the other three are subsets.
export function selectRecientes<T extends ListNewsItem>(items: readonly T[]): T[] {
  return items.filter((item) => item.status !== "saved" || isCurrentNewsItem(item));
}

export function selectPublishedToday<T extends DatedNewsItem>(items: readonly T[]): T[] {
  return items.filter(isPublishedToday);
}

export function selectUnread<T extends Pick<NewsItem, "status">>(items: readonly T[]): T[] {
  return items.filter((item) => item.status === "new");
}

export function selectSaved<T extends Pick<NewsItem, "status">>(items: readonly T[]): T[] {
  return items.filter((item) => item.status === "saved");
}

export function selectNewsForTab<T extends ListNewsItem>(items: readonly T[], tab: NewsListTab): T[] {
  const recientes = selectRecientes(items);
  if (tab === "hoy") return selectPublishedToday(recientes);
  if (tab === "sinleer") return selectUnread(items);
  if (tab === "guardadas") return selectSaved(items);
  return recientes;
}

export type NewsListFilter = { search: string; sourceId: string; sort: NewsListSort };

/**
 * Case-insensitive title/description/source/topic/module search plus an
 * optional source filter, then sorted by recency (or by trust tier first when
 * the sort is "trust", recency breaking ties).
 */
export function filterAndSortNews<T extends ListNewsItem>(items: readonly T[], filter: NewsListFilter): T[] {
  const query = filter.search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (filter.sourceId && item.sourceId !== filter.sourceId) return false;
    if (!query) return true;
    return [item.title, item.description ?? "", item.sourceName, ...item.topics, ...item.moduleCodes]
      .some((value) => value.toLowerCase().includes(query));
  });
  return [...filtered].sort((first, second) => {
    if (filter.sort === "trust") {
      const trustDifference = TRUST_WEIGHT[second.trustTier] - TRUST_WEIGHT[first.trustTier];
      if (trustDifference !== 0) return trustDifference;
    }
    return newsItemDate(second).localeCompare(newsItemDate(first));
  });
}
