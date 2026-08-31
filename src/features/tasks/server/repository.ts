import "server-only";

import { query } from "@/lib/db/pool";
import type { DbTask } from "@/lib/db/types";

export type TaskWrite = {
  id?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: "alta" | "media" | "baja";
  status?: "pendiente" | "en_progreso" | "completada" | "pospuesta" | "cancelada";
  due_date?: string | null;
  completed_at?: string | null;
  reminder_at?: string | null;
  related_type?: string | null;
  related_id?: string | null;
};

export type TaskPatch = Partial<Omit<TaskWrite, "id">>;

export async function getTasksByUser(userId: string): Promise<DbTask[]> {
  const result = await query<DbTask>(
    `SELECT * FROM public.tasks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function createTask(userId: string, data: TaskWrite): Promise<DbTask> {
  const result = await query<DbTask>(
    `INSERT INTO public.tasks
      (id, user_id, title, description, category, priority, status, due_date,
       completed_at, reminder_at, related_type, related_id)
     VALUES (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.id ?? null,
      userId,
      data.title,
      data.description ?? null,
      data.category ?? "diario",
      data.priority ?? "media",
      data.status ?? "pendiente",
      data.due_date ?? null,
      data.completed_at ?? null,
      data.reminder_at ?? null,
      data.related_type ?? null,
      data.related_id ?? null,
    ],
  );
  return result.rows[0];
}

export async function updateTask(userId: string, id: string, patch: TaskPatch): Promise<DbTask | null> {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (patch.title !== undefined) add("title", patch.title);
  if (patch.description !== undefined) add("description", patch.description);
  if (patch.category !== undefined) add("category", patch.category);
  if (patch.priority !== undefined) add("priority", patch.priority);
  if (patch.status !== undefined) add("status", patch.status);
  if (patch.due_date !== undefined) add("due_date", patch.due_date);
  if (patch.completed_at !== undefined) add("completed_at", patch.completed_at);
  if (patch.reminder_at !== undefined) add("reminder_at", patch.reminder_at);
  if (patch.related_type !== undefined) add("related_type", patch.related_type);
  if (patch.related_id !== undefined) add("related_id", patch.related_id);
  if (assignments.length === 0) return null;

  values.push(id, userId);
  const result = await query<DbTask>(
    `UPDATE public.tasks
        SET ${assignments.join(", ")}, updated_at = now()
      WHERE id = $${values.length - 1} AND user_id = $${values.length}
      RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function appendTaskNote(userId: string, id: string, text: string): Promise<DbTask | null> {
  const result = await query<DbTask>(
    `UPDATE public.tasks
        SET description = concat_ws(E'\n\n', nullif(description, ''), '[Nota]: ' || $1),
            updated_at = now()
      WHERE id = $2 AND user_id = $3
      RETURNING *`,
    [text, id, userId],
  );
  return result.rows[0] ?? null;
}

export async function updateTaskStatus(userId: string, id: string, status: string): Promise<void> {
  await query(
    `UPDATE public.tasks SET status = $1, updated_at = now() WHERE id = $2 AND user_id = $3`,
    [status, id, userId],
  );
}

export async function deleteTask(userId: string, id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM public.tasks WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteTasksByUserLike(userId: string, pattern: string): Promise<void> {
  await query(
    `DELETE FROM public.tasks WHERE user_id = $1 AND title LIKE $2`,
    [userId, pattern],
  );
}
