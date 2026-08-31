"use server";

import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth/current-user";
import type { DbBlocNote } from "@/lib/db/types";
import { toIsoTimestamp } from "@/lib/bloc/timestamps";
import {
  countBlocNotesByUser,
  createBlocNote,
  deleteBlocNote,
  getBlocNotesByUser,
  insertBlocNotesBatch,
  updateBlocNote,
  type BlocNoteSeed,
} from "@/features/bloc/server/repository";

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

const noteId = z.string().uuid();
const noteTitle = z.string().trim().min(1).max(300);
const noteHtml = z.string().max(1_000_000);
const noteText = z.string().max(500_000);
const timestamp = z.string().datetime();

const createNoteSchema = z.object({
  id: noteId,
  title: noteTitle,
  contentHtml: noteHtml,
  contentText: noteText,
  favorite: z.boolean(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
}).strict();

const updateNoteSchema = z.object({
  id: noteId,
  patch: z.object({
    title: noteTitle.optional(),
    contentHtml: noteHtml.optional(),
    contentText: noteText.optional(),
    favorite: z.boolean().optional(),
    deletedAt: z.union([timestamp, z.null()]).optional(),
  }).strict().refine((patch) => Object.keys(patch).length > 0, "empty_patch"),
}).strict();

const localNoteSchema = z.object({
  id: z.string().min(1).max(100),
  title: noteTitle,
  contentHtml: noteHtml,
  contentText: noteText,
  favorite: z.boolean(),
  created_at: timestamp,
  updated_at: timestamp,
}).strict();

const localTrashedSchema = localNoteSchema.extend({ deleted_at: timestamp }).strict();
const migrationSchema = z.object({
  notes: z.array(localNoteSchema).max(500),
  trashedNotes: z.array(localTrashedSchema).max(500),
}).strict();

type BlocMutationResult = { ok: true } | { ok: false; error: "invalid_input" | "not_found" | "save_failed" };

export async function fetchBlocNotes(): Promise<{ notes: BlocNoteDTO[]; trashedNotes: BlocTrashedNoteDTO[]; migrated: boolean }> {
  const userId = await getCurrentUserId();
  const rows = await getBlocNotesByUser(userId);
  return { ...splitRows(rows), migrated: rows.length > 0 };
}

export async function migrateLocalBlocNotes(
  localNotes: unknown,
  localTrashed: unknown,
): Promise<{ notes: BlocNoteDTO[]; trashedNotes: BlocTrashedNoteDTO[]; migrated: boolean }> {
  const parsed = migrationSchema.safeParse({ notes: localNotes, trashedNotes: localTrashed });
  const userId = await getCurrentUserId();
  if (!parsed.success) return { ...splitRows(await getBlocNotesByUser(userId)), migrated: true };

  const existing = await countBlocNotesByUser(userId);
  if (existing === 0 && (parsed.data.notes.length > 0 || parsed.data.trashedNotes.length > 0)) {
    const seeds: BlocNoteSeed[] = [
      ...parsed.data.notes.map((note) => toSeed(note, null)),
      ...parsed.data.trashedNotes.map((note) => toSeed(note, note.deleted_at)),
    ];
    await insertBlocNotesBatch(userId, seeds);
  }
  return { ...splitRows(await getBlocNotesByUser(userId)), migrated: true };
}

export async function createBlocNoteAction(input: unknown): Promise<BlocMutationResult> {
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();
  try {
    const created = await createBlocNote(userId, {
      id: parsed.data.id,
      title: parsed.data.title,
      content_html: parsed.data.contentHtml,
      content_text: parsed.data.contentText,
      is_favorite: parsed.data.favorite,
      deleted_at: null,
      created_at: parsed.data.createdAt ?? now,
      updated_at: parsed.data.updatedAt ?? now,
    });
    return created ? { ok: true } : { ok: false, error: "save_failed" };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}

export async function updateBlocNoteAction(input: unknown): Promise<BlocMutationResult> {
  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const userId = await getCurrentUserId();
  const { id, patch } = parsed.data;
  try {
    const updated = await updateBlocNote(userId, id, {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.contentHtml !== undefined ? { content_html: patch.contentHtml } : {}),
      ...(patch.contentText !== undefined ? { content_text: patch.contentText } : {}),
      ...(patch.favorite !== undefined ? { is_favorite: patch.favorite } : {}),
      ...(patch.deletedAt !== undefined ? { deleted_at: patch.deletedAt } : {}),
    });
    return updated ? { ok: true } : { ok: false, error: "not_found" };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}

export async function deleteBlocNoteAction(input: unknown): Promise<BlocMutationResult> {
  const parsed = noteId.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const userId = await getCurrentUserId();
  try {
    return (await deleteBlocNote(userId, parsed.data))
      ? { ok: true }
      : { ok: false, error: "not_found" };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}

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
    if (row.deleted_at) trashedNotes.push({ ...toDto(row), deleted_at: toIsoTimestamp(row.deleted_at) });
    else notes.push(toDto(row));
  }
  return { notes, trashedNotes };
}

function toSeed(
  note: z.infer<typeof localNoteSchema>,
  deletedAt: string | null,
): BlocNoteSeed {
  return {
    id: noteId.safeParse(note.id).success ? note.id : undefined,
    title: note.title,
    content_html: note.contentHtml,
    content_text: note.contentText,
    is_favorite: note.favorite,
    deleted_at: deletedAt,
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
}
