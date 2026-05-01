import { createHash } from "node:crypto";

export function normalizeNewsUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "ref_src",
    ].forEach((param) => url.searchParams.delete(param));
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim();
  }
}

export function stableNewsId(sourceId: string, url: string): string {
  const hash = createHash("sha1").update(normalizeNewsUrl(url)).digest("hex").slice(0, 18);
  return `${sourceId}:${hash}`;
}
