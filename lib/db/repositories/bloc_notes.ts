import "server-only";
import { query } from "@/lib/db/pool";
import type { DbBlocNote } from "@/lib/db/types";

export async function getBlocNotesByUser(userId: string): Promise<DbBlocNote[]> {
  const res = await query<DbBlocNote>(
    `SELECT * FROM public.bloc_notes WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function countBlocNotesByUser(userId: string): Promise<number> {
  const res = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM public.bloc_notes WHERE user_id = $1`,
    [userId]
  );
  return Number(res.rows[0]?.count ?? 0);
}

export type BlocNoteSeed = {
  id?: string;
  title: string;
  content_html: string;
  content_text: string;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function insertBlocNotesBatch(userId: string, notes: BlocNoteSeed[]): Promise<void> {
  for (const note of notes) {
    const columns = ["user_id", "title", "content_html", "content_text", "is_favorite", "deleted_at", "created_at", "updated_at"];
    const values: unknown[] = [userId, note.title, note.content_html, note.content_text, note.is_favorite, note.deleted_at, note.created_at, note.updated_at];
    if (note.id) {
      columns.unshift("id");
      values.unshift(note.id);
    }
    const placeholders = columns.map((_, i) => `$${i + 1}`);
    await query(
      `INSERT INTO public.bloc_notes (${columns.map((c) => `"${c}"`).join(", ")})
       VALUES (${placeholders.join(", ")})
       ON CONFLICT (id) DO NOTHING`,
      values
    );
  }
}
