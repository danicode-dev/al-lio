import "server-only";
// Student resource links have an explicit feature owner.
import { query } from "@/lib/db/pool";
import type { DbQuickLink } from "@/lib/db/types";

export async function getQuickLinksByUser(userId: string): Promise<DbQuickLink[]> {
  const res = await query<DbQuickLink>(
    `SELECT * FROM public.quick_links WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function createQuickLink(
  userId: string,
  data: Partial<Omit<DbQuickLink, "id" | "user_id" | "created_at" | "updated_at">> & { name: string; url: string }
): Promise<DbQuickLink> {
  const res = await query<DbQuickLink>(
    `INSERT INTO public.quick_links (user_id, name, url, category, icon, description, is_favorite)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, data.name, data.url, data.category ?? null, data.icon ?? null, data.description ?? null, data.is_favorite ?? false]
  );
  return res.rows[0];
}

export async function deleteQuickLink(userId: string, id: string): Promise<void> {
  await query(
    `DELETE FROM public.quick_links WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}
