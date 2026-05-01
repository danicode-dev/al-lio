"use client";

import { createClient } from "@/lib/supabase/client";
import type { TechOpportunity } from "@/lib/tech-opportunity-types";

// Module-level cache — survives component re-mounts within the same browser session.
// Stale after 5 minutes so fresh data is fetched if the user leaves and comes back.
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

  const supabase = createClient();
  const { data, error } = await supabase
    .from("tech_opportunities")
    .select("*");

  if (error) throw error;
  const sorted = sortOpportunities((data as TechOpportunity[]) ?? []);
  _cache = { data: sorted, at: Date.now() };
  return sorted;
}
