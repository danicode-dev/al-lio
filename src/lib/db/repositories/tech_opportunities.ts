import "server-only";
import { query } from "@/lib/db/pool";
import type { DbTechOpportunity } from "@/lib/db/types";

export async function getAllTechOpportunities(): Promise<DbTechOpportunity[]> {
  const res = await query<DbTechOpportunity>(
    `SELECT * FROM public.tech_opportunities ORDER BY prioridad, encaje_daw_1_5 DESC NULLS LAST`
  );
  return res.rows;
}
