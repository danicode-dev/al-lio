import "server-only";
import { query } from "@/lib/db/pool";
import type { DbQuickSearch } from "@/lib/db/types";

export async function getQuickSearchesByUser(userId: string): Promise<DbQuickSearch[]> {
  const res = await query<DbQuickSearch>(
    `SELECT * FROM public.quick_searches WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function createQuickSearch(
  userId: string,
  data: Omit<DbQuickSearch, "id" | "user_id" | "created_at" | "updated_at">
): Promise<DbQuickSearch> {
  const res = await query<DbQuickSearch>(
    `INSERT INTO public.quick_searches (user_id, title, platform, keyword, location, generated_url, category, is_favorite)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, data.title, data.platform, data.keyword, data.location ?? null, data.generated_url, data.category ?? null, data.is_favorite ?? false]
  );
  return res.rows[0];
}

export async function deleteQuickSearch(userId: string, id: string): Promise<void> {
  await query(
    `DELETE FROM public.quick_searches WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}
