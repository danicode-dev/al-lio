import type { NormalizedOpportunity } from "@/lib/db/types";
import { emptyOnError, isGranadaCandidateOpportunity } from "./common";

function extractXmlTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return (match[1] ?? match[2] ?? "").trim();
}

function parseRssItems(xml: string): string[] {
  const items: string[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    items.push(m[1]);
  }
  return items;
}

export async function collect(): Promise<NormalizedOpportunity[]> {
  try {
    const response = await fetch(
      "https://www.tecnoempleo.com/rss/feed.php?pr=GRANADA&te=programador",
      { next: { revalidate: 3600 } },
    );
    if (!response.ok) return [];

    const xml = await response.text();
    const items = parseRssItems(xml);

    return items.slice(0, 20).map((item) => {
      const title = extractXmlTag(item, "title");
      const link = extractXmlTag(item, "link");
      const pubDate = extractXmlTag(item, "pubDate");
      const description = extractXmlTag(item, "description").replace(/<[^>]+>/g, "").slice(0, 500);
      const guid = extractXmlTag(item, "guid");

      return {
        source: "Tecnoempleo",
        source_type: "rss" as const,
        title: title || "Oferta Tecnoempleo",
        url: link || "https://www.tecnoempleo.com",
        published_at: pubDate ? new Date(pubDate).toISOString() : undefined,
        description: description || undefined,
        external_id: guid || undefined,
        location: "Granada",
        remote: false,
      };
    }).filter(isGranadaCandidateOpportunity);
  } catch (error) {
    return emptyOnError(error, "tecnoempleo-rss");
  }
}
