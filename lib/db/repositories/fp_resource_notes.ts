import "server-only";
import { query } from "@/lib/db/pool";
import type { DbFpResourceNote } from "@/lib/db/types";

export async function getResourceNotes(userId: string, contentItemId: string): Promise<DbFpResourceNote[]> {
  const res = await query<DbFpResourceNote>(
    `SELECT * FROM public.fp_resource_notes
     WHERE user_id = $1 AND content_item_id = $2
     ORDER BY timestamp_seconds ASC, created_at ASC`,
    [userId, contentItemId]
  );
  return res.rows;
}

export async function addResourceNote(
  userId: string,
  contentItemId: string,
  timestampSeconds: number,
  body: string
): Promise<DbFpResourceNote> {
  const res = await query<DbFpResourceNote>(
    `INSERT INTO public.fp_resource_notes (user_id, content_item_id, timestamp_seconds, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, contentItemId, timestampSeconds, body]
  );
  return res.rows[0];
}
