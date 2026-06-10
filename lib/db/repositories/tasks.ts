import "server-only";
import { query } from "@/lib/db/pool";
import type { DbTask } from "@/lib/db/types";

export async function getTasksByUser(userId: string): Promise<DbTask[]> {
  const res = await query<DbTask>(
    `SELECT * FROM public.tasks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function createTask(
  userId: string,
  data: Partial<Omit<DbTask, "id" | "user_id" | "created_at" | "updated_at">> & { title: string }
): Promise<DbTask> {
  const res = await query<DbTask>(
    `INSERT INTO public.tasks
      (user_id, title, description, category, priority, status, due_date, related_type, related_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      data.title,
      data.description ?? null,
      data.category ?? "personal",
      data.priority ?? "media",
      data.status ?? "pendiente",
      data.due_date ?? null,
      data.related_type ?? null,
      data.related_id ?? null,
    ]
  );
  return res.rows[0];
}

export async function updateTaskStatus(userId: string, id: string, status: string): Promise<void> {
  await query(
    `UPDATE public.tasks SET status = $1 WHERE id = $2 AND user_id = $3`,
    [status, id, userId]
  );
}

export async function updateTask(
  userId: string,
  id: string,
  data: Partial<Omit<DbTask, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (!fields.length) return;
  const sets = fields.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
  const values: unknown[] = [...fields.map(f => data[f] ?? null), id, userId];
  await query(
    `UPDATE public.tasks SET ${sets} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2}`,
    values
  );
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  await query(
    `DELETE FROM public.tasks WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

export async function deleteTasksByUserLike(userId: string, pattern: string): Promise<void> {
  await query(
    `DELETE FROM public.tasks WHERE user_id = $1 AND title LIKE $2`,
    [userId, pattern]
  );
}
