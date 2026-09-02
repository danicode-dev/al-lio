// Failure policy for the auth rate limiter's backing store (issue #155).
//
// consumeAuthRateLimit / clearAuthRateLimit / opportunisticCleanup in
// login-rate-limit.ts all write to public.rate_limit_buckets in Postgres.
// When that store is unreachable - connection refused, DNS failure, pool
// exhaustion, a failover window - `pg` rejects with a message-less
// AggregateError. Left unguarded that bubbles out of every auth entry point
// (password sign-in, registration, password-reset request) as a raw HTTP 500
// before those actions' own try/catch can run, so a transient database blip
// locks every user out of every sign-in method with no usable error.
//
// Decision: fail OPEN. The limiter is a protective layer, not an
// authentication gate. Every action that calls it depends on the same
// Postgres for its real work and already degrades to a controlled error when
// that work throws (`credentials_unavailable`, `register_failed`, the generic
// reset response). Allowing the attempt when only the limiter's store is down
// therefore does not widen a real brute-force window - the request fails a
// moment later through a handled path - and it keeps the login page and its
// actions responding instead of crashing. Every fail-open is logged once, at
// error level, naming the dependency so the infra problem stays alertable.
//
// This module holds no server-only or Next.js imports on purpose: the policy
// and the AggregateError flattening are pure and directly unit-tested.

// The dependency name that appears in every fail-open log line.
export const RATE_LIMIT_STORE = "postgres:public.rate_limit_buckets";

// consumeAuthRateLimit resolves to exactly this when the store cannot be
// reached: the attempt is allowed and nothing is asked to retry.
export const RATE_LIMIT_STORE_UNAVAILABLE_RESULT: { allowed: boolean; retryAfterSeconds: number } =
  Object.freeze({ allowed: true, retryAfterSeconds: 0 });

export type RateLimitStoreOperation = "consume" | "clear" | "cleanup";

// `pg` surfaces a connection failure as an AggregateError whose own `message`
// is empty and whose real causes (ECONNREFUSED, ENOTFOUND, ETIMEDOUT, the
// SQLSTATE of an admin shutdown, ...) sit in `.errors`. Flatten that into one
// readable, de-duplicated string; never return "".
export function describeRateLimitStoreError(error: unknown): string {
  const parts = new Set<string>();

  const visit = (value: unknown): void => {
    if (value instanceof AggregateError && Array.isArray(value.errors)) {
      for (const inner of value.errors) visit(inner);
      return;
    }
    if (value instanceof Error) {
      const rawCode = (value as { code?: unknown }).code;
      const code = typeof rawCode === "string" && rawCode.length > 0 ? rawCode : null;
      const base = value.message.trim() || value.name;
      parts.add(code ? `${base} (${code})` : base);
      return;
    }
    if (value !== null && value !== undefined) {
      const text = String(value).trim();
      if (text.length > 0) parts.add(text);
    }
  };

  visit(error);
  return parts.size > 0 ? [...parts].join("; ") : "unknown error";
}

// One structured, greppable line per failed store interaction. Names the
// dependency, the operation and the auth scope, and carries the flattened
// underlying cause instead of a message-less AggregateError.
export function reportRateLimitStoreUnavailable(
  operation: RateLimitStoreOperation,
  scope: string,
  error: unknown,
): void {
  const disposition =
    operation === "consume" ? "allowing the attempt (fail-open)" : `skipped ${operation}`;
  console.error(
    `[auth-rate-limit] ${RATE_LIMIT_STORE} unavailable during ${operation} (scope=${scope}); ${disposition}`,
    describeRateLimitStoreError(error),
  );
}
