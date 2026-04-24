import type { NormalizedOpportunity } from "@/lib/db/types";

export type Collector = () => Promise<NormalizedOpportunity[]>;

export function emptyOnError(error: unknown, source: string): NormalizedOpportunity[] {
  console.error(`[collector:${source}]`, error);
  return [];
}
