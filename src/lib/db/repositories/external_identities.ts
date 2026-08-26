import "server-only";
import { query } from "@/lib/db/pool";
import type { DbExternalIdentity } from "@/lib/db/types";

export async function findExternalIdentity(
  provider: "google",
  providerUserId: string
): Promise<DbExternalIdentity | null> {
  const res = await query<DbExternalIdentity>(
    `SELECT * FROM public.external_identities WHERE provider = $1 AND provider_user_id = $2 LIMIT 1`,
    [provider, providerUserId]
  );
  return res.rows[0] ?? null;
}

export async function linkExternalIdentity(data: {
  user_id: string;
  provider: "google";
  provider_user_id: string;
  email: string;
}): Promise<DbExternalIdentity> {
  const res = await query<DbExternalIdentity>(
    `INSERT INTO public.external_identities (user_id, provider, provider_user_id, email)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (provider, provider_user_id) DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [data.user_id, data.provider, data.provider_user_id, data.email]
  );
  return res.rows[0];
}
