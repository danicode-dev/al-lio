import "server-only";
import { query } from "@/lib/db/pool";
import type { DbProfile } from "@/lib/db/types";

export async function getProfileByUser(userId: string): Promise<DbProfile | null> {
  const res = await query<DbProfile>(
    `SELECT * FROM public.profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return res.rows[0] ?? null;
}

export async function upsertProfile(
  userId: string,
  data: Partial<Omit<DbProfile, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<DbProfile> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  const updates = fields.map((f, i) => `"${f}" = $${i + 2}`).join(", ");
  const values: unknown[] = [userId, ...fields.map(f => data[f] ?? null)];

  const res = await query<DbProfile>(
    `INSERT INTO public.profiles (user_id, ${fields.map(f => `"${f}"`).join(", ")})
     VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(", ")})
     ON CONFLICT (user_id)
     DO UPDATE SET ${updates}
     RETURNING *`,
    values
  );
  return res.rows[0];
}
