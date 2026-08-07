"use client";

import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";

let _cache: { data: TechOpportunity[]; at: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export type { TechOpportunity };

const PRIORITY_RANK: Record<string, number> = { Alta: 0, Media: 1, Baja: 2 };

export function sortOpportunities(items: TechOpportunity[]): TechOpportunity[] {
  return [...items].sort((a, b) => {
    const pa = PRIORITY_RANK[a.prioridad ?? ""] ?? 9;
    const pb = PRIORITY_RANK[b.prioridad ?? ""] ?? 9;
    if (pa !== pb) return pa - pb;

    const da = a.encaje_daw_1_5 ?? 0;
    const db = b.encaje_daw_1_5 ?? 0;
    if (da !== db) return db - da;

    const ga = a.provincia?.toLowerCase() === "granada" ? 0 : 1;
    const gb = b.provincia?.toLowerCase() === "granada" ? 0 : 1;
    if (ga !== gb) return ga - gb;

    const fa = a.fecha_inicio ?? "9999-99-99";
    const fb = b.fecha_inicio ?? "9999-99-99";
    return fa.localeCompare(fb);
  });
}

export async function getTechOpportunities(): Promise<TechOpportunity[]> {
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) return _cache.data;

  const res = await fetch("/api/tech-opportunities");
  if (!res.ok) throw new Error("Failed to fetch tech opportunities");
  const data: TechOpportunity[] = await res.json();

  const sorted = sortOpportunities(data);
  _cache = { data: sorted, at: Date.now() };
  return sorted;
}
