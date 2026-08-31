import "server-only";

import { query } from "@/lib/db/pool";
import type { DbCourse } from "@/lib/db/types";

export type CourseWrite = {
  id?: string;
  id_slug?: string | null;
  title: string;
  platform?: string | null;
  url?: string | null;
  category?: string | null;
  status?: "pendiente" | "empezado" | "terminado" | "pausado" | "descartado";
  start_date?: string | null;
  deadline?: string | null;
  notes?: string | null;
};

export async function getCoursesByUser(userId: string): Promise<DbCourse[]> {
  const result = await query<DbCourse>(
    `SELECT * FROM public.courses WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function createCourse(userId: string, data: CourseWrite): Promise<DbCourse> {
  const result = await query<DbCourse>(
    `INSERT INTO public.courses
      (id, user_id, id_slug, title, platform, url, category, status, start_date, deadline, notes)
     VALUES (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      data.id ?? null,
      userId,
      data.id_slug ?? null,
      data.title,
      data.platform ?? null,
      data.url ?? null,
      data.category ?? null,
      data.status ?? "pendiente",
      data.start_date ?? null,
      data.deadline ?? null,
      data.notes ?? null,
    ],
  );
  return result.rows[0];
}

export async function updateCourseStatus(
  userId: string,
  id: string,
  status: CourseWrite["status"],
): Promise<DbCourse | null> {
  const result = await query<DbCourse>(
    `UPDATE public.courses
        SET status = $1, updated_at = now()
      WHERE id = $2 AND user_id = $3
      RETURNING *`,
    [status, id, userId],
  );
  return result.rows[0] ?? null;
}

export async function deleteCourse(userId: string, id: string): Promise<void> {
  await query(`DELETE FROM public.courses WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export async function deleteCoursesByUserLike(userId: string, pattern: string): Promise<void> {
  await query(`DELETE FROM public.courses WHERE user_id = $1 AND title LIKE $2`, [userId, pattern]);
}

export async function toggleCourseFavorite(userId: string, id: string): Promise<boolean | null> {
  const result = await query<{ is_favorite: boolean }>(
    `UPDATE public.courses
        SET is_favorite = NOT is_favorite, updated_at = now()
      WHERE id = $1 AND user_id = $2
      RETURNING is_favorite`,
    [id, userId],
  );
  return result.rows[0]?.is_favorite ?? null;
}
