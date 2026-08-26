import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { query } from "@/lib/db/pool";

// Backed by public.rate_limit_buckets (see 0009_production_authentication.sql)
// instead of an in-process Map, so limits survive a process restart and
// would stay correct if this ever ran as more than one instance. bucket_key
// is a salted SHA-256 digest - the table never stores a raw email or IP.
export type AuthRateLimitScope =
  | "password"
  | "demo"
  | "register"
  | "email_confirm_resend"
  | "password_reset_request"
  | "password_reset_consume";

export async function consumeAuthRateLimit(
  scope: AuthRateLimitScope,
  identity: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const address = await getClientAddress();
  const key = digest(`${scope}:${address}:${identity.trim().toLowerCase()}`);
  const resetAt = new Date(Date.now() + windowMs).toISOString();

  const res = await query<{ count: number; reset_at: string }>(
    `INSERT INTO public.rate_limit_buckets (bucket_key, count, reset_at)
     VALUES ($1, 1, $2)
     ON CONFLICT (bucket_key) DO UPDATE SET
       count = CASE WHEN public.rate_limit_buckets.reset_at <= now() THEN 1 ELSE public.rate_limit_buckets.count + 1 END,
       reset_at = CASE WHEN public.rate_limit_buckets.reset_at <= now() THEN EXCLUDED.reset_at ELSE public.rate_limit_buckets.reset_at END
     RETURNING count, reset_at`,
    [key, resetAt]
  );

  const row = res.rows[0];
  if (row.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1_000));
    return { allowed: false, retryAfterSeconds };
  }

  if (Math.random() < 0.01) opportunisticCleanup();

  return { allowed: true, retryAfterSeconds: 0 };
}

export async function clearAuthRateLimit(scope: AuthRateLimitScope, identity: string): Promise<void> {
  const address = await getClientAddress();
  const key = digest(`${scope}:${address}:${identity.trim().toLowerCase()}`);
  await query(`DELETE FROM public.rate_limit_buckets WHERE bucket_key = $1`, [key]);
}

async function getClientAddress(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const value = forwarded || requestHeaders.get("x-real-ip")?.trim() || "unknown";
  return value.slice(0, 128);
}

function digest(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for auth rate limiting");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function opportunisticCleanup(): void {
  query(`DELETE FROM public.rate_limit_buckets WHERE reset_at < now() - interval '1 day'`).catch(() => {});
}
