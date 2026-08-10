import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };
type RateLimitStore = Map<string, Bucket>;

const globalRateLimits = globalThis as typeof globalThis & {
  __alLioAuthRateLimits?: RateLimitStore;
};

const buckets = globalRateLimits.__alLioAuthRateLimits ?? new Map<string, Bucket>();
globalRateLimits.__alLioAuthRateLimits = buckets;

export async function consumeAuthRateLimit(
  scope: "password" | "demo",
  identity: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  if (buckets.size > 1_000) purgeExpired(now);

  const address = await getClientAddress();
  const key = digest(`${scope}:${address}:${identity.trim().toLowerCase()}`);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function clearAuthRateLimit(scope: "password" | "demo", identity: string): Promise<void> {
  const address = await getClientAddress();
  buckets.delete(digest(`${scope}:${address}:${identity.trim().toLowerCase()}`));
}

async function getClientAddress(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const value = forwarded || requestHeaders.get("x-real-ip")?.trim() || "unknown";
  return value.slice(0, 128);
}

function purgeExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
