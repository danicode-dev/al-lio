"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const RETRIABLE_MISSING_COLUMNS = new Set([
  "reminder_at",
  "progress_notes",
  "completed_at",
  "related_type",
  "related_id",
  "start_date",
  "deadline",
  "price",
  "category",
  "notes",
  "event_start_date",
  "event_end_date",
  "registration_deadline",
  "type",
  "icon",
  "description",
  "is_favorite",
]);

function getMissingColumn(error: unknown) {
  const message = typeof error === "object" && error && "message" in error ? String(error.message) : String(error ?? "");
  return (
    message.match(/Could not find the '([^']+)' column/)?.[1] ||
    message.match(/column [a-zA-Z0-9_]+\.([a-zA-Z0-9_]+) does not exist/)?.[1] ||
    ""
  );
}

function omitRetriableMissingColumn(payload: Record<string, unknown>, error: unknown) {
  const column = getMissingColumn(error);
  if (!column || !RETRIABLE_MISSING_COLUMNS.has(column) || !(column in payload)) return null;

  const next = { ...payload };
  delete next[column];
  console.warn(`[db] Retrying write without missing optional column: ${column}`);
  return next;
}

export async function insertDb(table: string, data: any, paths: string[] = []) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let payload = { ...data, user_id: user.id };
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: result, error } = await supabase.from(table).insert(payload).select().single();
    if (!error) {
      paths.forEach((p) => revalidatePath(p));
      return { result, error };
    }

    const retryPayload = omitRetriableMissingColumn(payload, error);
    if (!retryPayload) {
      paths.forEach((p) => revalidatePath(p));
      return { result, error };
    }
    payload = retryPayload;
  }

  paths.forEach((p) => revalidatePath(p));
  return { result: null, error: new Error("Could not write after removing missing optional columns") };
}

export async function updateDb(table: string, id: string, data: any, paths: string[] = []) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let payload = { ...data };
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: result, error } = await supabase.from(table).update(payload).eq("id", id).eq("user_id", user.id).select().single();
    if (!error) {
      paths.forEach((p) => revalidatePath(p));
      return { result, error };
    }

    const retryPayload = omitRetriableMissingColumn(payload, error);
    if (!retryPayload) {
      paths.forEach((p) => revalidatePath(p));
      return { result, error };
    }
    payload = retryPayload;
  }

  paths.forEach((p) => revalidatePath(p));
  return { result: null, error: new Error("Could not write after removing missing optional columns") };
}

export async function deleteDb(table: string, id: string, paths: string[] = []) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
  paths.forEach((p) => revalidatePath(p));
}
