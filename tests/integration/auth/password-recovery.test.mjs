// Source-level assertion rationale: the password-recovery hardening in issue
// #272 lives in a Next.js Server Component (the /restablecer pre-render check),
// two "use server" actions and a PostgreSQL transaction, none of which the
// plain Node test runner can execute. These assertions pin the lifecycle
// guarantees against the source until an auth server-action + database harness
// exists; replace them with an executed boundary when it does.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the /restablecer page classifies the reset link before rendering an actionable form (issue #272)", async () => {
  const page = await read("../../../src/app/(auth)/restablecer/page.tsx");

  // A dead link never reaches the password form: the page inspects the token
  // server-side and renders a dedicated note with a way to ask for a new one.
  assert.match(page, /inspectAuthToken\(token, "password_reset"\)/);
  assert.match(page, /tokenStatus === "expired"/);
  assert.match(page, /tokenStatus === "already_used"/);
  assert.match(page, /tokenStatus !== "valid"/);
  assert.match(page, /<Link href="\/recuperar">/, "every dead-link state offers a path to request another email");

  // The <ResetPasswordForm> is only rendered on the valid branch, after the
  // three rejections and the not-found fallthrough.
  const formAt = page.indexOf("<ResetPasswordForm");
  assert.ok(formAt > page.indexOf('tokenStatus !== "valid"'), "the form must render only after every invalid state is handled");

  // An unreachable token store must not fall through to the form either.
  assert.match(page, /catch \{[\s\S]*?No podemos comprobar el enlace/);
});

test("inspectAuthToken is a read-only classifier and does not claim the token (issue #272)", async () => {
  const tokens = await read("../../../src/lib/auth/tokens.ts");
  const fnStart = tokens.indexOf("export async function inspectAuthToken");
  const fnEnd = tokens.indexOf("\n}", fnStart);
  const fnSource = tokens.slice(fnStart, fnEnd);

  assert.ok(fnStart !== -1, "inspectAuthToken must exist for the page and action to reuse");
  assert.match(fnSource, /return \{ status: "not_found" \};/);
  assert.match(fnSource, /return \{ status: "already_used" \};/);
  assert.match(fnSource, /return \{ status: "expired" \};/);
  assert.match(fnSource, /return \{ status: "valid", tokenId: record\.id, userId: record\.user_id \};/);
  assert.doesNotMatch(fnSource, /markAuthTokenUsed|used_at = now\(\)|UPDATE /, "inspection must never mutate the token");
});

test("a failing hash cannot burn a valid reset link, and the token claim is atomic with the password write (issue #272)", async () => {
  const action = await read("../../../src/lib/auth/password-reset.ts");
  const users = await read("../../../src/lib/db/repositories/users.ts");

  const resetStart = action.indexOf("export async function resetPasswordAction");
  const resetSource = action.slice(resetStart);
  assert.ok(
    resetSource.indexOf("bcrypt.hash(") < resetSource.indexOf('inspectAuthToken(parsed.data.token'),
    "the password is hashed before the token is inspected",
  );
  assert.ok(
    resetSource.indexOf("bcrypt.hash(") < resetSource.indexOf("resetPasswordAndRevokeSessions("),
    "the password is hashed before the token is claimed",
  );
  assert.match(resetSource, /if \(!applied \|\| !securityStamp\) return \{ error: "reset_token_used" \};/, "losing the claim race is surfaced, not treated as success");
  assert.doesNotMatch(resetSource, /redirect\(/, "a completed reset no longer auto-redirects; it returns an explicit success state");
  assert.match(resetSource, /return \{ error: null, ok: true \};/);

  // The revoking write claims the token and sets password + stamp in one
  // transaction; a lost `used_at IS NULL` race commits nothing.
  const revokeStart = users.indexOf("export async function resetPasswordAndRevokeSessions");
  const revokeSource = users.slice(revokeStart, users.indexOf("\n}", revokeStart));
  assert.match(revokeSource, /return withTransaction\(async \(client\) => \{/);
  assert.match(revokeSource, /UPDATE public\.auth_tokens SET used_at = now\(\) WHERE id = \$1 AND used_at IS NULL/);
  assert.match(revokeSource, /if \(\(claim\.rowCount \?\? 0\) === 0\) return \{ applied: false, securityStamp: null \};/);
  assert.match(revokeSource, /SET password_hash = \$1, security_stamp = gen_random_uuid\(\)/);
  assert.ok(
    revokeSource.indexOf("auth_tokens SET used_at") < revokeSource.indexOf("SET password_hash"),
    "the token must be claimed before the password is written, inside the same transaction",
  );
});

test("a completed reset shows an explicit confirmation instead of a silent redirect (issue #272)", async () => {
  const form = await read("../../../src/components/auth/reset-password-form.tsx");

  assert.match(form, /if \(state\.ok\) \{/, "the form branches on the action's success flag");
  assert.match(form, /Contraseña actualizada/);
  assert.match(form, /cerrado la sesión en los demás dispositivos/, "the confirmation states that other sessions were revoked");
  assert.match(form, /<Link href="\/dashboard">/, "the user continues from the confirmation, not via an automatic redirect");
  assert.match(form, /reset_token_used:/, "the already-used link has its own copy");
});

test("the recovery request stays enumeration-safe while guiding Google users, and still records delivery failures (issue #272)", async () => {
  const [form, action] = await Promise.all([
    read("../../../src/components/auth/request-reset-form.tsx"),
    read("../../../src/lib/auth/password-reset.ts"),
  ]);

  // The generic confirmation reveals neither account existence nor its type,
  // and points Google-only users somewhere useful.
  const submitted = form.slice(form.indexOf("state.submitted"));
  assert.doesNotMatch(submitted, /cuenta con contraseña/, "the copy must not disclose that the account has a password");
  assert.match(submitted, /Si ese correo tiene una cuenta/);
  assert.match(submitted, /Google/, "Google-only users are told they can keep signing in with Google");

  // A rejected or thrown send is still logged at error level without leaking
  // provider detail to the caller (kept from #132, must not regress).
  const reqStart = action.indexOf("export async function requestPasswordResetAction");
  const reqSource = action.slice(reqStart, action.indexOf("\nconst resetSchema", reqStart));
  assert.match(reqSource, /const \{ ok \} = await sendTransactionalEmail\(/);
  assert.match(reqSource, /logResetRequestOutcome\(ok \? "sent" : "send_rejected", mode\);/);
  const returns = reqSource.match(/return GENERIC_REQUEST_SUCCESS;/g) ?? [];
  assert.ok(returns.length >= 3, "every branch still funnels through the one generic response");
});
