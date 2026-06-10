"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db/pool";
import { tryGetCurrentUserId } from "@/lib/auth/current-user";

const WRITABLE_TABLES = new Set<string>([
  "tasks",
  "courses",
  "hackathons",
  "opportunities",
  "quick_links",
  "reminders",
  "profiles",
  "sources",
  "quick_searches",
]);

function assertTable(table: string): void {
  if (!WRITABLE_TABLES.has(table)) {
    throw new Error(`Table "${table}" is not in the allowed write list`);
  }
}

export async function insertDb(
  table: string,
  data: Record<string, unknown>,
  paths: string[] = []
) {
  assertTable(table);
  const userId = await tryGetCurrentUserId();
  if (!userId) return null;

  const payload: Record<string, unknown> = { ...data, user_id: userId };
  const columns = Object.keys(payload);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  const values = columns.map((k) => payload[k] ?? null);

  const res = await query(
    `INSERT INTO public."${table}" (${columns.map((c) => `"${c}"`).join(", ")})
     VALUES (${placeholders.join(", ")})
     RETURNING *`,
    values
  );
  paths.forEach((p) => revalidatePath(p));
  return { result: res.rows[0] ?? null, error: null };
}

export async function updateDb(
  table: string,
  id: string,
  data: Record<string, unknown>,
  paths: string[] = []
) {
  assertTable(table);
  const userId = await tryGetCurrentUserId();
  if (!userId) return null;

  const columns = Object.keys(data);
  const sets = columns.map((col, i) => `"${col}" = $${i + 1}`).join(", ");
  const values: unknown[] = [
    ...columns.map((k) => data[k] ?? null),
    id,
    userId,
  ];
  const idIdx = columns.length + 1;
  const userIdx = columns.length + 2;

  const res = await query(
    `UPDATE public."${table}"
     SET ${sets}
     WHERE id = $${idIdx} AND user_id = $${userIdx}
     RETURNING *`,
    values
  );
  paths.forEach((p) => revalidatePath(p));
  return { result: res.rows[0] ?? null, error: null };
}

export async function deleteDb(
  table: string,
  id: string,
  paths: string[] = []
) {
  assertTable(table);
  const userId = await tryGetCurrentUserId();
  if (!userId) return null;

  await query(
    `DELETE FROM public."${table}" WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  paths.forEach((p) => revalidatePath(p));
}
