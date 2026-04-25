"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function insertDb(table: string, data: any, paths: string[] = []) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: result, error } = await supabase.from(table).insert({ ...data, user_id: user.id }).select().single();
  paths.forEach((p) => revalidatePath(p));
  return { result, error };
}

export async function updateDb(table: string, id: string, data: any, paths: string[] = []) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: result, error } = await supabase.from(table).update(data).eq("id", id).eq("user_id", user.id).select().single();
  paths.forEach((p) => revalidatePath(p));
  return { result, error };
}

export async function deleteDb(table: string, id: string, paths: string[] = []) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
  paths.forEach((p) => revalidatePath(p));
}
