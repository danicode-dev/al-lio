import "server-only";
import { query } from "@/lib/db/pool";
import type { DbSource } from "@/lib/db/types";

export async function getSourcesByUser(userId: string): Promise<DbSource[]> {
  const res = await query<DbSource>(
    `SELECT * FROM public.sources WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function createSource(
  userId: string,
  data: Omit<DbSource, "id" | "user_id" | "created_at" | "updated_at">
): Promise<DbSource> {
  const res = await query<DbSource>(
    `INSERT INTO public.sources (user_id, name, slug, source_type, status, logo_url, base_url, last_checked_at, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [userId, data.name, data.slug, data.source_type, data.status, data.logo_url ?? null, data.base_url ?? null, data.last_checked_at ?? null, data.notes ?? null]
  );
  return res.rows[0];
}

export async function deleteSource(userId: string, id: string): Promise<void> {
  await query(
    `DELETE FROM public.sources WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}
