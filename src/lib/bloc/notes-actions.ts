"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getBlocNotesByUser, countBlocNotesByUser, insertBlocNotesBatch, type BlocNoteSeed } from "@/lib/db/repositories/bloc_notes";
import type { DbBlocNote } from "@/lib/db/types";
import { toIsoTimestamp } from "@/lib/bloc/timestamps";

export type BlocNoteDTO = {
  id: string;
  title: string;
  contentHtml: string;
  contentText: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type BlocTrashedNoteDTO = BlocNoteDTO & { deleted_at: string };

function toDto(row: DbBlocNote): BlocNoteDTO {
  return {
    id: row.id,
    title: row.title,
    contentHtml: row.content_html,
    contentText: row.content_text,
    favorite: row.is_favorite,
    created_at: toIsoTimestamp(row.created_at),
    updated_at: toIsoTimestamp(row.updated_at),
  };
}

function splitRows(rows: DbBlocNote[]): { notes: BlocNoteDTO[]; trashedNotes: BlocTrashedNoteDTO[] } {
  const notes: BlocNoteDTO[] = [];
  const trashedNotes: BlocTrashedNoteDTO[] = [];
  for (const row of rows) {
    if (row.deleted_at) {
      trashedNotes.push({ ...toDto(row), deleted_at: toIsoTimestamp(row.deleted_at) });
    } else {
      notes.push(toDto(row));
    }
  }
  return { notes, trashedNotes };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchBlocNotes(): Promise<{ notes: BlocNoteDTO[]; trashedNotes: BlocTrashedNoteDTO[]; migrated: boolean }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await getBlocNotesByUser(session.uid);
  const { notes, trashedNotes } = splitRows(rows);
  return { notes, trashedNotes, migrated: rows.length > 0 };
}

export async function migrateLocalBlocNotes(
  localNotes: Array<{ id: string; title: string; contentHtml: string; contentText: string; favorite: boolean; created_at: string; updated_at: string }>,
  localTrashed: Array<{ id: string; title: string; contentHtml: string; contentText: string; favorite: boolean; created_at: string; updated_at: string; deleted_at: string }>
): Promise<{ notes: BlocNoteDTO[]; trashedNotes: BlocTrashedNoteDTO[]; migrated: boolean }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const existing = await countBlocNotesByUser(session.uid);
  if (existing === 0 && (localNotes.length > 0 || localTrashed.length > 0)) {
    const seeds: BlocNoteSeed[] = [
      ...localNotes.map((note): BlocNoteSeed => ({
        id: UUID_RE.test(note.id) ? note.id : undefined,
        title: note.title,
        content_html: note.contentHtml,
        content_text: note.contentText,
        is_favorite: note.favorite,
        deleted_at: null,
        created_at: note.created_at,
        updated_at: note.updated_at,
      })),
      ...localTrashed.map((note): BlocNoteSeed => ({
        id: UUID_RE.test(note.id) ? note.id : undefined,
        title: note.title,
        content_html: note.contentHtml,
        content_text: note.contentText,
        is_favorite: note.favorite,
        deleted_at: note.deleted_at,
        created_at: note.created_at,
        updated_at: note.updated_at,
      })),
    ];
    await insertBlocNotesBatch(session.uid, seeds);
  }

  const rows = await getBlocNotesByUser(session.uid);
  return { ...splitRows(rows), migrated: true };
}
