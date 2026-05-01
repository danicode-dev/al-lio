import type { NewsItem } from "@/lib/news/types";
import type { Source } from "@/lib/sources/source-registry";
import { extractTags, scoreNews } from "@/lib/news/scoring";
import { cleanNewsText } from "@/lib/news/text";
import { stableNewsId } from "@/lib/news/ids";

const TIMEOUT_MS = 6000;

function makeId(sourceId: string, url: string): string {
  return stableNewsId(sourceId, url);
}

function nowIso(): string {
  return new Date().toISOString();
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "user-agent": "AILioRadar/1.0 (+local)",
        accept: "application/json, application/xml, text/html;q=0.9, */*;q=0.5",
        ...(init?.headers ?? {}),
      },
      next: { revalidate: 3600 },
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

// ─── Helpers de parsing XML/RSS sin dependencias ────────────────────────────

function cdata(s: string): string {
  return cleanNewsText(s, 1000) ?? "";
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? cdata(m[1]) : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, "i"));
  return m ? m[1] : "";
}

function buildItem(source: Source, params: {
  title: string;
  url: string;
  description?: string;
  publishedAt?: string;
}): NewsItem {
  const { url, publishedAt } = params;
  const title = cleanNewsText(params.title, 240) ?? params.title.trim();
  const description = cleanNewsText(params.description, 280);
  const tags = extractTags(title, description);
  return {
    id: makeId(source.id, url),
    sourceId: source.id,
    sourceName: source.name,
    category: source.category,
    title,
    description,
    url,
    publishedAt,
    fetchedAt: nowIso(),
    tags,
    relevanceScore: scoreNews(title, description, source.category, tags),
    status: "new",
  };
}

// ─── Fetchers por método ────────────────────────────────────────────────────

export async function fetchRss(source: Source): Promise<NewsItem[]> {
  const feeds = source.feeds && source.feeds.length ? source.feeds : [source.url];
  const out: NewsItem[] = [];
  for (const feedUrl of feeds) {
    try {
      const r = await safeFetch(feedUrl);
      if (!r.ok) continue;
      const xml = await r.text();
      const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
      for (const b of blocks.slice(0, 12)) {
        const title = extractTag(b, "title");
        let link = extractTag(b, "link");
        if (!link) link = extractAttr(b, "link", "href");
        if (!link) link = extractTag(b, "guid");
        const description =
          extractTag(b, "description") ||
          extractTag(b, "summary") ||
          extractTag(b, "content");
        const publishedAt =
          extractTag(b, "pubDate") ||
          extractTag(b, "published") ||
          extractTag(b, "updated") ||
          undefined;
        if (!title || !link) continue;
        out.push(buildItem(source, { title, url: link, description, publishedAt: normalizeDate(publishedAt) }));
      }
    } catch (err) {
      console.warn(`[news] RSS fail ${source.id} (${feedUrl}):`, (err as Error).message);
    }
  }
  return out;
}

function normalizeDate(d?: string): string | undefined {
  if (!d) return undefined;
  const t = Date.parse(d);
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
}

// ─── DEV.to ─────────────────────────────────────────────────────────────────

export async function fetchDevTo(source: Source): Promise<NewsItem[]> {
  const tags = source.tags ?? ["webdev", "javascript", "react"];
  const out: NewsItem[] = [];
  for (const tag of tags.slice(0, 4)) {
    try {
      const r = await safeFetch(`${source.url}?tag=${encodeURIComponent(tag)}&per_page=8&top=7`);
      if (!r.ok) continue;
      const data = (await r.json()) as Array<{
        title: string;
        url: string;
        description?: string;
        published_at?: string;
        tag_list?: string[];
      }>;
      for (const a of data) {
        out.push(buildItem(source, {
          title: a.title,
          url: a.url,
          description: a.description,
          publishedAt: normalizeDate(a.published_at),
        }));
      }
    } catch (err) {
      console.warn(`[news] devto fail ${tag}:`, (err as Error).message);
    }
  }
  return out;
}

// ─── Hacker News (top + jobs) ───────────────────────────────────────────────

export async function fetchHackerNews(source: Source): Promise<NewsItem[]> {
  try {
    const r = await safeFetch(source.url);
    if (!r.ok) return [];
    const ids = (await r.json()) as number[];
    const top = ids.slice(0, 12);
    const items = await Promise.all(
      top.map(async (id) => {
        try {
          const sr = await safeFetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (!sr.ok) return null;
          const d = (await sr.json()) as { title?: string; url?: string; time?: number; text?: string };
          if (!d?.title) return null;
          const url = d.url || `https://news.ycombinator.com/item?id=${id}`;
          return buildItem(source, {
            title: d.title,
            url,
            description: d.text ? cdata(d.text).slice(0, 240) : undefined,
            publishedAt: d.time ? new Date(d.time * 1000).toISOString() : undefined,
          });
        } catch {
          return null;
        }
      }),
    );
    return items.filter((i): i is NewsItem => Boolean(i));
  } catch (err) {
    console.warn(`[news] hn fail:`, (err as Error).message);
    return [];
  }
}

// ─── Remotive ───────────────────────────────────────────────────────────────

export async function fetchRemotive(source: Source): Promise<NewsItem[]> {
  try {
    const r = await safeFetch(`${source.url}?category=software-dev&limit=20`);
    if (!r.ok) return [];
    const data = (await r.json()) as { jobs?: Array<{
      id: number;
      title: string;
      company_name: string;
      url: string;
      description?: string;
      publication_date?: string;
      tags?: string[];
    }> };
    return (data.jobs ?? []).map((j) => {
      const desc = j.description ? cdata(j.description).slice(0, 240) : `${j.company_name} · Remote`;
      return buildItem(source, {
        title: `${j.title} · ${j.company_name}`,
        url: j.url,
        description: desc,
        publishedAt: normalizeDate(j.publication_date),
      });
    });
  } catch (err) {
    console.warn(`[news] remotive fail:`, (err as Error).message);
    return [];
  }
}

// ─── Dispatcher ────────────────────────────────────────────────────────────

export async function fetchSource(source: Source): Promise<NewsItem[]> {
  // web-link / html-link-only → no se sincronizan, son enlaces directos
  if (source.method === "web-link" || source.method === "html-link-only") return [];

  if (source.id === "devto-api") return fetchDevTo(source);
  if (source.id.startsWith("hackernews-")) return fetchHackerNews(source);
  if (source.id === "remotive-api") return fetchRemotive(source);

  // Por defecto, intentar RSS
  if (source.feeds?.length || source.method === "rss" || source.method === "rss-or-html") {
    return fetchRss(source);
  }

  return [];
}
