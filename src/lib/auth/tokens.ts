import "server-only";

import { randomBytes, createHash } from "node:crypto";
import type { AuthTokenPurpose } from "@/lib/db/types";
import {
  createAuthToken,
  findValidAuthToken,
  markAuthTokenUsed,
  invalidateAuthTokensForPurpose,
} from "@/lib/db/repositories/auth_tokens";

// Shared single-use/short-lived/hash-stored discipline for both
// email-confirmation and password-reset links (issue #132). The raw token
// exists only in the emailed URL; only its hash is ever persisted, so a
// database read (or leak) can never be used to forge a valid link.
const TOKEN_BYTES = 32;
const CONFIRM_TTL_MS = 24 * 60 * 60 * 1_000;
const RESET_TTL_MS = 60 * 60 * 1_000;

function ttlForPurpose(purpose: AuthTokenPurpose): number {
  return purpose === "email_confirm" ? CONFIRM_TTL_MS : RESET_TTL_MS;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

// One live token per (user, purpose) at a time - requesting a new
// confirmation/reset link invalidates any earlier unused one instead of
// letting multiple simultaneously-valid links accumulate.
export async function issueAuthToken(userId: string, purpose: AuthTokenPurpose): Promise<string> {
  await invalidateAuthTokensForPurpose(userId, purpose);
  const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");
  await createAuthToken({
    user_id: userId,
    purpose,
    token_hash: hashToken(rawToken),
    expires_at: new Date(Date.now() + ttlForPurpose(purpose)).toISOString(),
  });
  return rawToken;
}

export type AuthTokenState =
  | { status: "valid"; tokenId: string; userId: string }
  | { status: "not_found" | "expired" | "already_used" };

// Read-only classification of a raw token. Lets a page decide whether to
// render an actionable form, and lets a server action reject an invented,
// expired or already-used link before it hashes a password or opens a
// transaction (issue #272). It never mutates the token - claiming stays
// the job of consumeAuthToken and resetPasswordAndRevokeSessions.
export async function inspectAuthToken(rawToken: string, purpose: AuthTokenPurpose): Promise<AuthTokenState> {
  const record = await findValidAuthToken(hashToken(rawToken), purpose);
  if (!record) return { status: "not_found" };
  if (record.used_at) return { status: "already_used" };
  if (new Date(record.expires_at).getTime() < Date.now()) return { status: "expired" };
  return { status: "valid", tokenId: record.id, userId: record.user_id };
}

export type ConsumeTokenResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "not_found" | "expired" | "already_used" };

// Atomically claims a token (marks it used only if it is currently valid),
// so two concurrent requests with the same link can never both succeed.
export async function consumeAuthToken(rawToken: string, purpose: AuthTokenPurpose): Promise<ConsumeTokenResult> {
  const tokenHash = hashToken(rawToken);
  const record = await findValidAuthToken(tokenHash, purpose);
  if (!record) return { ok: false, reason: "not_found" };
  if (record.used_at) return { ok: false, reason: "already_used" };
  if (new Date(record.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  const claimed = await markAuthTokenUsed(record.id);
  if (!claimed) return { ok: false, reason: "already_used" };
  return { ok: true, userId: record.user_id };
}
