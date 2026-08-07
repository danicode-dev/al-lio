import "server-only";
import { query } from "@/lib/db/pool";
import type { DbHackathon } from "@/lib/db/types";

export async function getHackathonsByUser(userId: string): Promise<DbHackathon[]> {
  const res = await query<DbHackathon>(
    `SELECT * FROM public.hackathons WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function createHackathon(
  userId: string,
  data: Partial<Omit<DbHackathon, "id" | "user_id" | "created_at" | "updated_at">> & { name: string; province: string }
): Promise<DbHackathon> {
  const res = await query<DbHackathon>(
    `INSERT INTO public.hackathons
      (user_id, name, organizer, province, city, type, status, url, notes, priority, next_review_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      userId,
      data.name,
      data.organizer ?? null,
      data.province,
      data.city ?? null,
      data.type ?? "hackathon",
      data.status ?? "revisar_futura_edicion",
      data.url ?? null,
      data.notes ?? null,
      data.priority ?? "media",
      data.next_review_at ?? null,
    ]
  );
  return res.rows[0];
}

export async function updateHackathon(
  userId: string,
  id: string,
  data: Partial<Omit<DbHackathon, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (!fields.length) return;
  const sets = fields.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
  const values: unknown[] = [...fields.map(f => data[f] ?? null), id, userId];
  await query(
    `UPDATE public.hackathons SET ${sets} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2}`,
    values
  );
}

export async function deleteHackathonsByUserLike(userId: string, pattern: string): Promise<void> {
  await query(
    `DELETE FROM public.hackathons WHERE user_id = $1 AND name LIKE $2`,
    [userId, pattern]
  );
}
