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

// Used only by the Google identity sign-in flow (src/lib/auth/google-signin.ts).
// A verified Google email is itself proof of ownership, so a freshly created
// row is confirmed immediately - COALESCE never un-confirms an existing
// account that already got there some other way.
export async function ensureUserByEmail(email: string, displayName?: string | null): Promise<DbUser> {
  const res = await query<DbUser>(
    `INSERT INTO public.users (email, display_name, email_confirmed_at)
     VALUES ($1, $2, now())
     ON CONFLICT (email) DO UPDATE
     SET display_name = COALESCE(public.users.display_name, EXCLUDED.display_name),
         email_confirmed_at = COALESCE(public.users.email_confirmed_at, now()),
         updated_at = now()
     RETURNING *`,
    [email.toLowerCase(), displayName ?? null]
  );
  return res.rows[0];
}

// Public registration (src/lib/auth/register.ts). email_confirmed_at stays
// null - the account cannot log in until the emailed confirmation link is
// used. Returns null instead of throwing when the email is already taken,
// so the caller can give a response indistinguishable from a fresh
// registration (see registerAction's enumeration-safety comment).
export async function createUnconfirmedUser(email: string, passwordHash: string): Promise<DbUser | null> {
  const res = await query<DbUser>(
    `INSERT INTO public.users (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING
     RETURNING *`,
    [email.toLowerCase(), passwordHash]
  );
  return res.rows[0] ?? null;
}

export async function confirmUserEmail(id: string): Promise<void> {
  await query(
    `UPDATE public.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = $1`,
    [id]
  );
}

export async function updatePasswordHash(id: string, hash: string): Promise<void> {
  await query(
    `UPDATE public.users SET password_hash = $1 WHERE id = $2`,
    [hash, id]
  );
}

// Regenerating security_stamp invalidates every previously issued session
// cookie (see getGlobalStore in src/lib/data.ts, which compares the
// signed-in stamp against this column). Used after a password reset, and
// bundled into the same statement as the new password hash so the two can
// never be applied separately.
export async function resetPasswordAndRevokeSessions(id: string, hash: string): Promise<string> {
  const res = await query<{ security_stamp: string }>(
    `UPDATE public.users
     SET password_hash = $1, security_stamp = gen_random_uuid()
     WHERE id = $2
     RETURNING security_stamp`,
    [hash, id]
  );
  return res.rows[0].security_stamp;
}
