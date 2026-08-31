import "server-only";

import { query } from "@/lib/db/pool";
import type { DbCompany, DbQuickSearch, FpCycleGroup } from "@/lib/db/types";

export async function getCompaniesByCycleGroup(cycleGroup: FpCycleGroup): Promise<DbCompany[]> {
  const result = await query<DbCompany>(
    `SELECT * FROM public.companies WHERE cycle_group = $1 ORDER BY sort_order, nombre`,
    [cycleGroup],
  );
  return result.rows;
}

export async function getFavoriteCompanyIds(userId: string): Promise<Set<string>> {
  const result = await query<{ company_id: string }>(
    `SELECT company_id FROM public.company_favorites WHERE user_id = $1`,
    [userId],
  );
  return new Set(result.rows.map((row) => row.company_id));
}

export async function toggleCompanyFavorite(userId: string, companyId: string): Promise<boolean> {
  const result = await query<{ is_favorite: boolean }>(
    `WITH removed AS (
       DELETE FROM public.company_favorites
        WHERE user_id = $1 AND company_id = $2
        RETURNING company_id
     ), inserted AS (
       INSERT INTO public.company_favorites (user_id, company_id)
       SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM removed)
       ON CONFLICT DO NOTHING
       RETURNING company_id
     )
     SELECT EXISTS (SELECT 1 FROM inserted) AS is_favorite`,
    [userId, companyId],
  );
  return result.rows[0]?.is_favorite ?? false;
}

export async function getQuickSearchesByUser(userId: string): Promise<DbQuickSearch[]> {
  const result = await query<DbQuickSearch>(
    `SELECT * FROM public.quick_searches WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function replaceQuickSearch(
  userId: string,
  data: Pick<DbQuickSearch, "title" | "platform" | "keyword" | "location" | "generated_url">,
): Promise<DbQuickSearch> {
  const result = await query<DbQuickSearch>(
    `WITH removed AS (
       DELETE FROM public.quick_searches
        WHERE user_id = $1 AND platform = $2 AND category = 'work'
     )
     INSERT INTO public.quick_searches
       (user_id, title, platform, keyword, location, generated_url, category, is_favorite)
     VALUES ($1, $2, $3, $4, $5, $6, 'work', false)
     RETURNING *`,
    [userId, data.title, data.platform, data.keyword, data.location, data.generated_url],
  );
  return result.rows[0];
}
