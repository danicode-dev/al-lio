import "server-only";
import { query } from "@/lib/db/pool";
import type { DbReminder } from "@/lib/db/types";

export async function getRemindersByUser(userId: string): Promise<DbReminder[]> {
  const res = await query<DbReminder>(
    `SELECT * FROM public.reminders WHERE user_id = $1 ORDER BY remind_at ASC`,
    [userId]
  );
  return res.rows;
}

export async function createReminder(
  userId: string,
  data: Omit<DbReminder, "id" | "user_id" | "sent" | "created_at" | "updated_at">
): Promise<DbReminder> {
  const res = await query<DbReminder>(
    `INSERT INTO public.reminders (user_id, title, remind_at, related_type, related_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, data.title, data.remind_at, data.related_type ?? null, data.related_id ?? null]
  );
  return res.rows[0];
}
