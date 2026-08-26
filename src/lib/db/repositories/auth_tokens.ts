import "server-only";
import { query } from "@/lib/db/pool";
import type { AuthTokenPurpose, DbAuthToken } from "@/lib/db/types";

export async function createAuthToken(data: {
  user_id: string;
  purpose: AuthTokenPurpose;
  token_hash: string;
  expires_at: string;
}): Promise<DbAuthToken> {
  const res = await query<DbAuthToken>(
    `INSERT INTO public.auth_tokens (user_id, purpose, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.user_id, data.purpose, data.token_hash, data.expires_at]
  );
  return res.rows[0];
}

export async function findValidAuthToken(tokenHash: string, purpose: AuthTokenPurpose): Promise<DbAuthToken | null> {
  const res = await query<DbAuthToken>(
    `SELECT * FROM public.auth_tokens WHERE token_hash = $1 AND purpose = $2 LIMIT 1`,
    [tokenHash, purpose]
  );
  return res.rows[0] ?? null;
}

// Only claims a token that is still unused - concurrent double-consumption
// of the same link claims it at most once.
export async function markAuthTokenUsed(id: string): Promise<boolean> {
  const res = await query(
    `UPDATE public.auth_tokens SET used_at = now() WHERE id = $1 AND used_at IS NULL`,
    [id]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function invalidateAuthTokensForPurpose(userId: string, purpose: AuthTokenPurpose): Promise<void> {
  await query(
    `UPDATE public.auth_tokens SET used_at = now() WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [userId, purpose]
  );
}
