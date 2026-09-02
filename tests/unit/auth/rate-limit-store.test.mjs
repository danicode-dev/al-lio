// Source-level assertion rationale: the fail-open policy and the AggregateError
// flattening (rate-limit-store.ts) are pure and executed directly below. The
// wiring test reads login-rate-limit.ts as text because that module imports
// "server-only", next/headers and the "@/"-aliased db pool, none of which the
// plain Node test runner can load; replace it with an executed boundary when an
// auth server-action harness exists.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  RATE_LIMIT_STORE,
  RATE_LIMIT_STORE_UNAVAILABLE_RESULT,
  describeRateLimitStoreError,
  reportRateLimitStoreUnavailable,
} from "../../../src/lib/auth/rate-limit-store.ts";

const readRateLimiter = () =>
  readFile(new URL("../../../src/lib/auth/login-rate-limit.ts", import.meta.url), "utf8");

test("describeRateLimitStoreError turns a message-less AggregateError into its underlying causes (issue #155)", () => {
  const connRefused = Object.assign(new Error("connect ECONNREFUSED 10.1.0.4:5432"), { code: "ECONNREFUSED" });
  const flattened = describeRateLimitStoreError(new AggregateError([connRefused], ""));
  assert.notEqual(flattened.trim(), "", "a pg connection AggregateError must never flatten to an empty string");
  assert.match(flattened, /ECONNREFUSED/, "the SQLSTATE/errno of the real cause must survive");

  // A bare Error with no message still names something actionable.
  assert.equal(describeRateLimitStoreError(new Error("")), "Error");

  // Repeated identical causes (one per pool socket) collapse to one part.
  assert.equal(describeRateLimitStoreError(new AggregateError([new Error("getaddrinfo ENOTFOUND db"), new Error("getaddrinfo ENOTFOUND db")])), "getaddrinfo ENOTFOUND db");

  // Non-Error inputs degrade gracefully rather than throwing.
  assert.equal(describeRateLimitStoreError("boom"), "boom");
  assert.equal(describeRateLimitStoreError(null), "unknown error");
});

test("the store-unavailable result allows the attempt, asks for no retry, and cannot be mutated (issue #155)", () => {
  assert.deepEqual({ ...RATE_LIMIT_STORE_UNAVAILABLE_RESULT }, { allowed: true, retryAfterSeconds: 0 });
  assert.ok(Object.isFrozen(RATE_LIMIT_STORE_UNAVAILABLE_RESULT), "the shared fail-open result must be frozen so a caller cannot flip it closed");
});

test("reportRateLimitStoreUnavailable logs exactly one error line naming the store, operation and scope (issue #155)", (t) => {
  t.mock.method(console, "error", () => {});

  reportRateLimitStoreUnavailable("consume", "password", new AggregateError([Object.assign(new Error("x"), { code: "ECONNREFUSED" })]));
  assert.equal(console.error.mock.calls.length, 1, "one fail-open must produce exactly one log line");
  const [message, detail] = console.error.mock.calls[0].arguments;
  assert.match(message, new RegExp(RATE_LIMIT_STORE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "the line must name the failing dependency");
  assert.match(message, /scope=password/, "the line must name the auth scope");
  assert.match(message, /fail-open/, "a consume failure must record that it allowed the attempt");
  assert.match(String(detail), /ECONNREFUSED/, "the underlying cause must be carried, not a message-less AggregateError");

  reportRateLimitStoreUnavailable("clear", "password", new Error("down"));
  assert.match(console.error.mock.calls[1].arguments[0], /skipped clear/, "a non-consume failure must record what it skipped, not claim fail-open");
});

test("login-rate-limit routes every rate_limit_buckets query through the fail-open guard, happy path unchanged (issue #155)", async () => {
  const source = await readRateLimiter();

  assert.match(source, /import \{\s*RATE_LIMIT_STORE_UNAVAILABLE_RESULT,\s*reportRateLimitStoreUnavailable,\s*\} from "@\/lib\/auth\/rate-limit-store";/);

  // consumeAuthRateLimit: the UPSERT is inside try/catch and the catch is the
  // documented fail-open (log once, return the shared allow result).
  assert.match(
    source,
    /try \{\s*\n\s*res = await query<\{ count: number; reset_at: string \}>\([\s\S]*?\} catch \(error\) \{[\s\S]*?reportRateLimitStoreUnavailable\("consume", scope, error\);\s*\n\s*return RATE_LIMIT_STORE_UNAVAILABLE_RESULT;\s*\n\s*\}/,
    "the bucket UPSERT must fail open, not throw",
  );
  assert.doesNotMatch(source, /\n {2}const res = await query</, "the old unguarded `const res = await query(` shape must be gone");

  // clearAuthRateLimit: guarded, best-effort, never rethrown.
  assert.match(source, /try \{\s*\n\s*await query\(`DELETE FROM public\.rate_limit_buckets WHERE bucket_key = \$1`[\s\S]*?\} catch \(error\) \{[\s\S]*?reportRateLimitStoreUnavailable\("clear", scope, error\);\s*\n\s*\}/);

  // opportunisticCleanup: its fire-and-forget .catch now reports instead of swallowing silently.
  assert.match(source, /\.catch\(\s*\n?\s*\(error: unknown\) => reportRateLimitStoreUnavailable\("cleanup", "all", error\),?\s*\n?\s*\)/);
  assert.doesNotMatch(source, /\.catch\(\(\) => \{\}\)/, "no rate_limit_buckets query may swallow its error without a log");

  // The rate limiting itself is untouched: same atomic UPSERT, same over-limit check.
  assert.match(source, /ON CONFLICT \(bucket_key\) DO UPDATE SET/);
  assert.match(source, /count = CASE WHEN public\.rate_limit_buckets\.reset_at <= now\(\) THEN 1 ELSE public\.rate_limit_buckets\.count \+ 1 END/);
  assert.match(source, /if \(row\.count > limit\) \{/);
});
