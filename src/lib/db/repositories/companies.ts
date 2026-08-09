import "server-only";
import { query } from "@/lib/db/pool";
import type { DbCompany, FpCycleGroup } from "@/lib/db/types";

export async function getCompaniesByCycleGroup(cycleGroup: FpCycleGroup): Promise<DbCompany[]> {
  const res = await query<DbCompany>(
    `SELECT * FROM public.companies WHERE cycle_group = $1 ORDER BY sort_order, nombre`,
    [cycleGroup]
  );
  return res.rows;
}

export async function getFavoriteCompanyIds(userId: string): Promise<Set<string>> {
  const res = await query<{ company_id: string }>(
    `SELECT company_id FROM public.company_favorites WHERE user_id = $1`,
    [userId]
  );
  return new Set(res.rows.map((row) => row.company_id));
}

export async function toggleCompanyFavorite(userId: string, companyId: string): Promise<boolean> {
  const removed = await query(
    `DELETE FROM public.company_favorites WHERE user_id = $1 AND company_id = $2 RETURNING company_id`,
    [userId, companyId]
  );
  if (removed.rows.length > 0) return false;

  await query(
    `INSERT INTO public.company_favorites (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, companyId]
  );
  return true;
}
