import "server-only";
import { query } from "@/lib/db/pool";
import type { DbUser } from "@/lib/db/types";

export async function getUserById(id: string): Promise<DbUser | null> {
  const res = await query<DbUser>(
    `SELECT * FROM public.users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const res = await query<DbUser>(
    `SELECT * FROM public.users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return res.rows[0] ?? null;
}

export async function upsertUser(id: string, email: string): Promise<void> {
  await query(
    `INSERT INTO public.users (id, email)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
    [id, email]
  );
}

export async function updatePasswordHash(id: string, hash: string): Promise<void> {
  await query(
    `UPDATE public.users SET password_hash = $1 WHERE id = $2`,
    [hash, id]
  );
}
