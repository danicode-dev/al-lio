import "server-only";
import { query } from "@/lib/db/pool";
import type { DbOpportunity } from "@/lib/db/types";

export async function getOpportunitiesByUser(userId: string): Promise<DbOpportunity[]> {
  const res = await query<DbOpportunity>(
    `SELECT * FROM public.opportunities WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function createOpportunity(
  userId: string,
  data: Partial<Omit<DbOpportunity, "id" | "user_id" | "created_at" | "updated_at">> & { title: string; url: string; source: string }
): Promise<DbOpportunity> {
  const res = await query<DbOpportunity>(
    `INSERT INTO public.opportunities
      (user_id, source, source_type, title, company, description, location, province, remote, url, category, tags, notes, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      userId,
      data.source,
      data.source_type ?? "manual",
      data.title,
      data.company ?? null,
      data.description ?? null,
      data.location ?? null,
      data.province ?? null,
      data.remote ?? false,
      data.url,
      data.category ?? "job",
      data.tags ?? null,
      data.notes ?? null,
      data.status ?? "guardada",
    ]
  );
  return res.rows[0];
}

export async function updateOpportunityStatus(userId: string, id: string, status: string): Promise<void> {
  await query(
    `UPDATE public.opportunities SET status = $1 WHERE id = $2 AND user_id = $3`,
    [status, id, userId]
  );
}

export async function updateOpportunity(
  userId: string,
  id: string,
  data: Partial<Omit<DbOpportunity, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (!fields.length) return;
  const sets = fields.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
  const values: unknown[] = [...fields.map(f => data[f] ?? null), id, userId];
  await query(
    `UPDATE public.opportunities SET ${sets} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2}`,
    values
  );
}

export async function deleteOpportunity(userId: string, id: string): Promise<void> {
  await query(
    `DELETE FROM public.opportunities WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}
