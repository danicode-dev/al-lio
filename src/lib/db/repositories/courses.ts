import "server-only";
import { query } from "@/lib/db/pool";
import type { DbCourse } from "@/lib/db/types";

export async function getCoursesByUser(userId: string): Promise<DbCourse[]> {
  const res = await query<DbCourse>(
    `SELECT * FROM public.courses WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function createCourse(
  userId: string,
  data: Partial<Omit<DbCourse, "id" | "user_id" | "created_at" | "updated_at">> & { title: string }
): Promise<DbCourse> {
  const res = await query<DbCourse>(
    `INSERT INTO public.courses
      (user_id, title, platform, url, category, status, start_date, deadline, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      data.title,
      data.platform ?? null,
      data.url ?? null,
      data.category ?? null,
      data.status ?? "pendiente",
      data.start_date ?? null,
      data.deadline ?? null,
      data.notes ?? null,
    ]
  );
  return res.rows[0];
}

export async function updateCourseStatus(userId: string, id: string, status: string): Promise<void> {
  await query(
    `UPDATE public.courses SET status = $1 WHERE id = $2 AND user_id = $3`,
    [status, id, userId]
  );
}

export async function updateCourse(
  userId: string,
  id: string,
  data: Partial<Omit<DbCourse, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (!fields.length) return;
  const sets = fields.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
  const values: unknown[] = [...fields.map(f => data[f] ?? null), id, userId];
  await query(
    `UPDATE public.courses SET ${sets} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2}`,
    values
  );
}

export async function deleteCourse(userId: string, id: string): Promise<void> {
  await query(
    `DELETE FROM public.courses WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

export async function deleteCoursesByUserLike(userId: string, pattern: string): Promise<void> {
  await query(
    `DELETE FROM public.courses WHERE user_id = $1 AND title LIKE $2`,
    [userId, pattern]
  );
}

// Atomic flip (no read-then-write race) scoped to the caller's own row.
// Returns null when the row doesn't exist or isn't owned by this user, so
// the caller can distinguish "not found/not yours" from a real DB error.
export async function toggleCourseFavorite(userId: string, id: string): Promise<boolean | null> {
  const res = await query<{ is_favorite: boolean }>(
    `UPDATE public.courses SET is_favorite = NOT is_favorite WHERE id = $1 AND user_id = $2 RETURNING is_favorite`,
    [id, userId]
  );
  return res.rows[0]?.is_favorite ?? null;
}
