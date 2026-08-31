import "server-only";

import { query } from "@/lib/db/pool";
import type { DbBlocNote } from "@/lib/db/types";

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

export type BlocNotePatch = Partial<Pick<BlocNoteSeed, "title" | "content_html" | "content_text" | "is_favorite" | "deleted_at">>;

export async function getBlocNotesByUser(userId: string): Promise<DbBlocNote[]> {
  const result = await query<DbBlocNote>(
    `SELECT * FROM public.bloc_notes WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function countBlocNotesByUser(userId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM public.bloc_notes WHERE user_id = $1`,
    [userId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function createBlocNote(userId: string, note: BlocNoteSeed): Promise<boolean> {
  const result = await query(
    `INSERT INTO public.bloc_notes
      (id, user_id, title, content_html, content_text, is_favorite, deleted_at, created_at, updated_at)
     VALUES (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO NOTHING`,
    [
      note.id ?? null,
      userId,
      note.title,
      note.content_html,
      note.content_text,
      note.is_favorite,
      note.deleted_at,
      note.created_at,
      note.updated_at,
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateBlocNote(
  userId: string,
  id: string,
  patch: BlocNotePatch,
): Promise<boolean> {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  if (patch.title !== undefined) add("title", patch.title);
  if (patch.content_html !== undefined) add("content_html", patch.content_html);
  if (patch.content_text !== undefined) add("content_text", patch.content_text);
  if (patch.is_favorite !== undefined) add("is_favorite", patch.is_favorite);
  if (patch.deleted_at !== undefined) add("deleted_at", patch.deleted_at);
  if (assignments.length === 0) return false;

  values.push(id, userId);
  const result = await query(
    `UPDATE public.bloc_notes
        SET ${assignments.join(", ")}, updated_at = now()
      WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
    values,
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteBlocNote(userId: string, id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM public.bloc_notes WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function insertBlocNotesBatch(userId: string, notes: BlocNoteSeed[]): Promise<void> {
  for (const note of notes) await createBlocNote(userId, note);
}
