const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  quot: "\"",
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num: string) =>
      String.fromCodePoint(Number.parseInt(num, 10)),
    )
    .replace(/&([a-z]+);/gi, (match, key: string) => ENTITY_MAP[key.toLowerCase()] ?? match);
}

export function cleanNewsText(value: string | undefined, maxLength = 280): string | undefined {
  if (!value) return undefined;

  let text = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const rawImgAlt = text.match(/<img\b[^>]*\balt=(["'])(.*?)\1/i);
  if (rawImgAlt?.[2] && text.trimStart().startsWith("<img")) {
    text = rawImgAlt[2];
  }

  text = decodeHtmlEntities(text);
  const decodedImgAlt = text.match(/<img\b[^>]*\balt=(["'])(.*?)\1/i);
  if (decodedImgAlt?.[2] && text.trimStart().startsWith("<img")) {
    text = decodedImgAlt[2];
  }

  text = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return undefined;
  return text.slice(0, maxLength).trim();
}
