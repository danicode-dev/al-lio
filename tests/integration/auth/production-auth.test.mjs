// Migrated mechanically from tests/security-boundaries.test.mjs for issue #274.
// Source-level assertions temporarily protect a Next.js, browser, or database boundary that the plain Node runner cannot execute; replace them when the corresponding integration harness exists.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { verifySessionToken } from "../../../src/lib/auth/session-token.ts";

test("0009_production_authentication.sql is additive and backfills email_confirmed_at so no pre-existing account is locked out by the new confirmation requirement (issue #132)", async () => {
  const sql = await readFile(new URL("../../../infra/postgres/migrations/0009_production_authentication.sql", import.meta.url), "utf8");

  assert.doesNotMatch(sql, /\bdrop\s+(table|schema)\b/i);
  assert.doesNotMatch(sql, /\btruncate\s+table\b/i);
  assert.match(sql, /alter table public\.users\s*\n\s*add column if not exists email_confirmed_at timestamptz;/);
  assert.match(sql, /update public\.users\s*\n\s*set email_confirmed_at = created_at\s*\n\s*where email_confirmed_at is null;/, "existing accounts must be grandfathered in as confirmed, not locked out");
  assert.match(sql, /add column if not exists security_stamp uuid not null default gen_random_uuid\(\);/);
  assert.match(sql, /create table if not exists public\.auth_tokens/);
  assert.match(sql, /purpose\s+text\s+not null check \(purpose in \('email_confirm', 'password_reset'\)\)/);
  assert.match(sql, /token_hash\s+text\s+not null unique/, "only the hash may be persisted");
  assert.match(sql, /create table if not exists public\.external_identities/);
  assert.match(sql, /unique\(provider, provider_user_id\)/);
  assert.match(sql, /unique\(user_id, provider\)/, "one AL-LÍO account may link at most one identity per provider");
  assert.match(sql, /create table if not exists public\.rate_limit_buckets/);
});

test("createUnconfirmedUser and ensureUserByEmail together implement the decided account policy: unconfirmed by default for passwords, auto-confirmed for a verified Google identity, never un-confirming an existing account (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/db/repositories/users.ts", import.meta.url), "utf8");

  const createFnStart = source.indexOf("export async function createUnconfirmedUser");
  const createFnEnd = source.indexOf("\n}", createFnStart);
  const createFnSource = source.slice(createFnStart, createFnEnd);
  assert.match(createFnSource, /ON CONFLICT \(email\) DO NOTHING/, "must never overwrite an existing account on a duplicate registration attempt");
  assert.doesNotMatch(createFnSource, /email_confirmed_at/, "omitting the column entirely leaves it NULL - unconfirmed by default");

  const ensureFnStart = source.indexOf("export async function ensureUserByEmail");
  const ensureFnEnd = source.indexOf("\n}", ensureFnStart);
  const ensureFnSource = source.slice(ensureFnStart, ensureFnEnd);
  assert.match(ensureFnSource, /VALUES \(\$1, \$2, now\(\)\)/, "a freshly created Google-identity user is confirmed immediately");
  assert.match(ensureFnSource, /email_confirmed_at = COALESCE\(public\.users\.email_confirmed_at, now\(\)\)/, "COALESCE never un-confirms an account that already got there some other way");
});

test("resetPasswordAndRevokeSessions changes the password hash and regenerates security_stamp in one atomic statement - the two can never be applied separately (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/db/repositories/users.ts", import.meta.url), "utf8");
  const fnStart = source.indexOf("export async function resetPasswordAndRevokeSessions");
  const fnEnd = source.indexOf("\n}", fnStart);
  const fnSource = source.slice(fnStart, fnEnd);

  assert.match(fnSource, /SET password_hash = \$1, security_stamp = gen_random_uuid\(\)/);
  assert.match(fnSource, /WHERE id = \$2\s*\n\s*RETURNING security_stamp/);
});

test("issueAuthToken invalidates any earlier unused token for the same (user, purpose) before issuing a new one, and only ever persists a hash (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/auth/tokens.ts", import.meta.url), "utf8");

  assert.match(source, /await invalidateAuthTokensForPurpose\(userId, purpose\);/);
  const issueStart = source.indexOf("export async function issueAuthToken");
  const issueEnd = source.indexOf("\n}", issueStart);
  const issueSource = source.slice(issueStart, issueEnd);
  assert.ok(issueSource.indexOf("invalidateAuthTokensForPurpose") < issueSource.indexOf("randomBytes"), "invalidation must happen before the new token is generated, not after");
  assert.match(source, /createHash\("sha256"\)\.update\(rawToken\)\.digest\("hex"\)/, "the raw token itself must never be persisted, only its hash");

  assert.match(source, /const CONFIRM_TTL_MS = 24 \* 60 \* 60 \* 1_000;/);
  assert.match(source, /const RESET_TTL_MS = 60 \* 60 \* 1_000;/, "reset links live for a much shorter window than confirmation links");
});

test("consumeAuthToken distinguishes not_found/expired/already_used and claims atomically - markAuthTokenUsed only succeeds if the token is still unused (issue #132)", async () => {
  const tokensSource = await readFile(new URL("../../../src/lib/auth/tokens.ts", import.meta.url), "utf8");
  assert.match(tokensSource, /if \(!record\) return \{ ok: false, reason: "not_found" \};/);
  assert.match(tokensSource, /if \(record\.used_at\) return \{ ok: false, reason: "already_used" \};/);
  assert.match(tokensSource, /if \(new Date\(record\.expires_at\)\.getTime\(\) < Date\.now\(\)\) return \{ ok: false, reason: "expired" \};/);

  const repoSource = await readFile(new URL("../../../src/lib/db/repositories/auth_tokens.ts", import.meta.url), "utf8");
  assert.match(repoSource, /UPDATE public\.auth_tokens SET used_at = now\(\) WHERE id = \$1 AND used_at IS NULL/, "the claim itself is conditioned on still being unused, so two concurrent consumers of the same link can never both succeed");
});

test("registerAction is enumeration-safe: a new email, an existing unconfirmed email, and an existing confirmed email all return the identical generic success state (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/auth/register.ts", import.meta.url), "utf8");

  assert.match(source, /const GENERIC_SUCCESS: RegisterState = \{ error: null, submitted: true \};/);
  const actionStart = source.indexOf("export async function registerAction");
  const actionSource = source.slice(actionStart);

  assert.match(actionSource, /if \(created\) \{\s*\n\s*await sendConfirmationEmail\(created\.id, email\);\s*\n\s*return GENERIC_SUCCESS;/, "fresh registration path");
  assert.match(actionSource, /if \(existing && !existing\.email_confirmed_at\) \{\s*\n\s*await sendConfirmationEmail\(existing\.id, email\);\s*\n\s*\} else if \(existing\) \{\s*\n\s*await sendAlreadyRegisteredNotice\(email\);\s*\n\s*\}\s*\n\s*return GENERIC_SUCCESS;/, "existing-account path, either variant, still returns GENERIC_SUCCESS");
  assert.doesNotMatch(actionSource, /return \{[^}]*submitted: true[^}]*\};(?!.*GENERIC_SUCCESS)/s, "no ad-hoc success object other than the shared GENERIC_SUCCESS constant");
});

test("requestPasswordResetAction only emails a password account, never a Google-only account, but returns the same generic response either way (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/auth/password-reset.ts", import.meta.url), "utf8");
  const fnStart = source.indexOf("export async function requestPasswordResetAction");
  const fnEnd = source.indexOf("\nconst resetSchema", fnStart);
  const fnSource = source.slice(fnStart, fnEnd);

  assert.match(fnSource, /if \(user\?\.password_hash\) \{/, "a Google-only account (null password_hash) must not receive a reset email");
  assert.match(fnSource, /return GENERIC_REQUEST_SUCCESS;/g);
  const returns = fnSource.match(/return GENERIC_REQUEST_SUCCESS;/g) ?? [];
  assert.ok(returns.length >= 3, "malformed input, rate-limited, and both found/not-found branches must all funnel through the same generic return");
});

test("resetPasswordAction revokes prior sessions via resetPasswordAndRevokeSessions (not a plain password update) and immediately signs the user into a fresh session carrying the new stamp (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/auth/password-reset.ts", import.meta.url), "utf8");
  const fnStart = source.indexOf("export async function resetPasswordAction");
  const fnSource = source.slice(fnStart);

  assert.doesNotMatch(fnSource, /\bupdatePasswordHash\(/, "must use the revoking variant, not the plain password-only update");
  assert.match(fnSource, /const newStamp = await resetPasswordAndRevokeSessions\(consumed\.userId, passwordHash\);/);
  assert.match(fnSource, /securityStamp: newStamp,/, "the new session must carry the freshly regenerated stamp, not the pre-reset one");
});

test("confirmEmailToken confirms and immediately establishes a session (email confirmation doubles as first login) and distinguishes expired/already_used/invalid outcomes (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/auth/email-confirmation.ts", import.meta.url), "utf8");

  assert.match(source, /if \(result\.reason === "expired"\) return "expired";/);
  assert.match(source, /if \(result\.reason === "already_used"\) return "already_used";/);
  assert.match(source, /await confirmUserEmail\(result\.userId\);/);
  assert.match(source, /await createSession\(\{/);
  assert.match(source, /return "confirmed";/);
});

test("Real session revocation: getGlobalStore compares the session's embedded stamp against the freshly-fetched user row (no extra database round trip) and redirects to the dedicated clearing route on a mismatch (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/data.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /clearSession/, "clearSession must not be called from this Server Component - Next.js only allows cookie mutation from a Server Action or Route Handler (caught live)");
  const fnStart = source.indexOf("export const getGlobalStore");
  const fnSource = source.slice(fnStart, fnStart + 1900);

  assert.match(fnSource, /const \[profile, pgUser\] = await Promise\.all\(\[/, "pgUser must be fetched from the SAME Promise.all already in flight, not a second query");
  assert.match(fnSource, /if \(!pgUser \|\| pgUser\.security_stamp !== session\.sv\) \{/);
  assert.match(fnSource, /redirect\("\/api\/auth\/logout-stale"\);/, "must route through the dedicated Route Handler that can actually clear the cookie - redirect() alone here would leave a stale-but-signature-valid cookie that middleware (no database access) would bounce right back to /dashboard");
});

test("Real session revocation also guards direct Server Action and API calls, not only dashboard navigation (issue #132)", async () => {
  const sessionSource = await readFile(new URL("../../../src/lib/auth/session.ts", import.meta.url), "utf8");
  assert.match(sessionSource, /export async function getValidatedSession\(\): Promise<SessionPayload \| null>/);
  assert.match(sessionSource, /const user = await getUserById\(session\.uid\);/);
  assert.match(sessionSource, /if \(!user \|\| user\.security_stamp !== session\.sv\) \{/);
  assert.match(sessionSource, /redirect\("\/api\/auth\/logout-stale"\);/, "a stale signed cookie must be cleared, not redirected into a middleware loop");

  const guardedBoundaries = [
    "../../../src/app/api/google/calendar/auth/route.ts",
    "../../../src/app/api/google/calendar/callback/route.ts",
    "../../../src/lib/auth/authorization.ts",
    "../../../src/lib/auth/current-user.ts",
    "../../../src/features/bloc/server/actions.ts",
    "../../../src/features/work/server/actions.ts",
    "../../../src/features/courses/server/actions.ts",
    "../../../src/features/events/server/actions.ts",
    "../../../src/features/learning/server/actions.ts",
    "../../../src/features/learning/server/player-actions.ts",
    "../../../src/features/tasks/server/actions.ts",
    "../../../src/lib/profile/onboarding-actions.ts",
  ];
  for (const file of guardedBoundaries) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /getValidatedSession\(\)|getCurrentUserId\(\)/, `${file} must reject a revoked session before reading or mutating user data`);
    assert.doesNotMatch(source, /\bgetSession\(\)/, `${file} must not use signature-only session verification at an authorization boundary`);
  }
});

test("Owner-reported follow-up (caught live in production): /api/auth/logout-stale actually clears the session cookie - the exact capability a Server Component's render is forbidden from doing itself, which is why getGlobalStore redirects here instead of clearing inline (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/app/api/auth/logout-stale/route.ts", import.meta.url), "utf8");
  assert.match(source, /export async function GET\(req: Request\)/);
  assert.match(source, /await clearSession\(\);/);
  assert.match(source, /return NextResponse\.redirect\(new URL\("\/login", req\.url\)\);/);
});

test("SessionPayload requires a security stamp (sv) and verifySessionToken rejects a token missing one, and createSession requires callers to supply it explicitly (issue #132)", async () => {
  const tokenSource = await readFile(new URL("../../../src/lib/auth/session-token.ts", import.meta.url), "utf8");
  assert.match(tokenSource, /sv: string;/);
  assert.match(tokenSource, /if \(!payload\.uid \|\| !payload\.email \|\| !payload\.sv\) return null;/);

  const sessionSource = await readFile(new URL("../../../src/lib/auth/session.ts", import.meta.url), "utf8");
  assert.match(sessionSource, /export async function createSession\(user: \{ id: string; email: string; name\?: string \| null; securityStamp: string \}\)/);
  assert.match(sessionSource, /sv: user\.securityStamp,/);
});

test("Every existing createSession caller (password login, demo login) was updated to pass securityStamp - none were left calling the old two-argument-shaped signature (issue #132)", async () => {
  const passwordSource = await readFile(new URL("../../../src/lib/auth/password-login.ts", import.meta.url), "utf8");
  assert.match(passwordSource, /securityStamp: authenticatedUser\.security_stamp,/);
  assert.match(passwordSource, /if \(!authenticatedUser\.email_confirmed_at\) \{\s*\n\s*return \{ error: "email_not_confirmed" \};\s*\n\s*\}/, "an unconfirmed account must not be able to log in with the right password");

  const demoSource = await readFile(new URL("../../../src/lib/auth/demo-login.ts", import.meta.url), "utf8");
  assert.match(demoSource, /securityStamp: user\.security_stamp,/);
});

test("Calendar consent (src/app/api/google/calendar/*) now requires an existing AL-LÍO session and no longer creates or links an account - identity creation is the separate /api/auth/google/* flow's job (issue #132)", async () => {
  const authRoute = await readFile(new URL("../../../src/app/api/google/calendar/auth/route.ts", import.meta.url), "utf8");
  assert.match(authRoute, /const session = await getValidatedSession\(\);\s*\n\s*if \(!session\) \{/);

  const callbackRoute = await readFile(new URL("../../../src/app/api/google/calendar/callback/route.ts", import.meta.url), "utf8");
  assert.match(callbackRoute, /const session = await getValidatedSession\(\);\s*\n\s*if \(!session\) \{/);
  assert.doesNotMatch(callbackRoute, /ensureUserByEmail/, "the callback must not create/find a user by email any more");
  assert.doesNotMatch(callbackRoute, /createSession/, "the callback must not create a session - one must already exist to reach here");
  assert.doesNotMatch(callbackRoute, /upsertProfile/, "the placeholder 'Usuario AL-LIO'/'Granada' profile hack is gone now that this path never provisions an account");
});

test("The new Google identity sign-in flow (src/lib/google/identity.ts) requests only openid/email/profile, uses PKCE, and keeps its own cookies entirely separate from Calendar's (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/google/identity.ts", import.meta.url), "utf8");

  assert.match(source, /const SCOPES = \["openid", "email", "profile"\];/, "no calendar scope in the login/identity consent screen");
  assert.match(source, /generateCodeVerifierAsync\(\);/);
  assert.match(source, /code_challenge: codeChallenge,/);
  assert.match(source, /code_challenge_method: CodeChallengeMethod\.S256,/);
  assert.match(source, /getToken\(\{ code, codeVerifier \}\)/);

  for (const cookieName of ["d1os_google_identity_state", "d1os_google_identity_verifier", "d1os_google_identity_return"]) {
    assert.match(source, new RegExp(cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${cookieName} must be distinct from Calendar's d1os_google_calendar_* cookies so the two flows can never cross-contaminate state`);
  }

  assert.match(source, /if \(!userInfo\.data\.id \|\| !userInfo\.data\.email \|\| userInfo\.data\.verified_email !== true\) \{\s*\n\s*return null;/, "only an explicitly verified Google email may resolve to an identity");
});

test("resolveOrProvisionGoogleUser links a verified Google identity to an existing password account by email instead of creating a duplicate, and only after Google itself vouches for the email (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/auth/google-signin.ts", import.meta.url), "utf8");

  assert.match(source, /const linked = await findExternalIdentity\("google", identity\.providerUserId\);/);
  assert.match(source, /const user = await getUserById\(linked\.user_id\);/, "an existing link must resolve through its immutable user_id foreign key, never a copied email");
  assert.match(source, /const existingByEmail = await getUserByEmail\(identity\.email\.toLowerCase\(\)\);/);
  assert.match(source, /const user = existingByEmail \?\? \(await ensureUserByEmail\(identity\.email, identity\.displayName\)\);/, "an existing account by email is reused, never duplicated");
  assert.match(source, /await linkExternalIdentity\(\{/);
});

test("Owner-reported follow-up (caught live): resolveOrProvisionGoogleUser confirms the email on every path, not just fresh creation - linking to a password account that registered but never confirmed must not leave it permanently unable to log in with its own password (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/auth/google-signin.ts", import.meta.url), "utf8");
  const confirmCalls = source.match(/await confirmUserEmail\(user\.id\);/g) ?? [];
  assert.equal(confirmCalls.length, 2, "both the already-linked fast path and the resolve-or-create path must confirm - a password account that registered but never confirmed, then signed in with Google, was left permanently unable to log in with its own password otherwise");
});

test("Owner-reported follow-up (caught live in production): /confirmar is a Route Handler, not a page - Next.js only allows setting cookies (session creation) from a Server Action or Route Handler, never a Server Component's render, and the old page-based /confirmar crashed with exactly that error on a real click (issue #132)", async () => {
  const routeSource = await readFile(new URL("../../../src/app/(auth)/confirmar/route.ts", import.meta.url), "utf8");
  assert.match(routeSource, /export async function GET\(req: Request\)/);
  assert.match(routeSource, /const result = await confirmEmailToken\(token\);/);
  assert.match(routeSource, /return NextResponse\.redirect\(new URL\("\/dashboard", baseUrl\)\);/, "success lands the visitor straight in the app - no intermediate page, matching how every other confirmation flow like this works");
  assert.match(routeSource, /return NextResponse\.redirect\(new URL\(`\/login\?error=confirm_\$\{result\}`, baseUrl\)\);/, "failure reuses the login page's existing error banner instead of a bespoke error page");

  const oldPageExists = await readFile(new URL("../../../src/app/(auth)/confirmar/page.tsx", import.meta.url), "utf8").then(() => true).catch(() => false);
  assert.equal(oldPageExists, false, "the broken Server Component page must be fully removed, not left alongside the route handler");

  const loginSource = await readFile(new URL("../../../src/components/auth/login-form.tsx", import.meta.url), "utf8");
  for (const code of ["confirm_invalid", "confirm_expired", "confirm_already_used"]) {
    assert.match(loginSource, new RegExp(`${code}: "`), `${code} must have Spanish copy in the login page's error dictionary`);
  }
});

test("GoogleLoginButton on the login page points at the new minimal-scope identity route, not the Calendar OAuth route (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/components/auth/google-login-button.tsx", import.meta.url), "utf8");
  assert.match(source, /href="\/api\/auth\/google\/start\?next=\/dashboard"/);
  assert.doesNotMatch(source, /\/api\/google\/calendar\/auth/, "the login button must never request Calendar scope");
});

test("login-rate-limit.ts is backed by the shared rate_limit_buckets table, not an in-process Map - a bucket_key is always a digest, never a raw email or IP (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/auth/login-rate-limit.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /globalThis/, "the old in-process Map storage must be fully gone, not left as an unused fallback");
  assert.doesNotMatch(source, /new Map\(/);
  assert.match(source, /INSERT INTO public\.rate_limit_buckets/);
  assert.match(source, /const key = digest\(`\$\{scope\}:\$\{address\}:\$\{identity\.trim\(\)\.toLowerCase\(\)\}`\);/);
  assert.match(source, /createHmac\("sha256", secret\)/, "bucket digests must be keyed so a database leak cannot be brute-forced as raw email/IP hashes");

  for (const scope of ["register", "email_confirm_resend", "password_reset_request", "password_reset_consume"]) {
    assert.match(source, new RegExp(`"${scope}"`), `${scope} must be a recognized rate-limit scope for the new endpoints`);
  }
});

test("The atomic rate-limit UPSERT resets the counter on an expired window and increments it otherwise, in one statement - no read-then-write race between concurrent requests (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/auth/login-rate-limit.ts", import.meta.url), "utf8");
  assert.match(source, /ON CONFLICT \(bucket_key\) DO UPDATE SET/);
  assert.match(source, /count = CASE WHEN public\.rate_limit_buckets\.reset_at <= now\(\) THEN 1 ELSE public\.rate_limit_buckets\.count \+ 1 END/);
  assert.match(source, /if \(row\.count > limit\) \{/);
});

test("/recuperar redirects an already-authenticated visitor away, matching /login and /register (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/middleware.ts", import.meta.url), "utf8");
  assert.match(source, /const authPaths = \["\/login", "\/register", "\/recuperar"\];/);
  assert.match(source, /"\/recuperar",\s*\n\s*\],\s*\n\};/, "must also be in the middleware matcher, or the authPaths check above would never even run for it");
});

test("Email templates never interpolate raw user-supplied HTML - the recipient email is the only dynamic value and it is always escaped, and every template ships a plain-text alternative (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/email/templates.ts", import.meta.url), "utf8");
  assert.match(source, /function escapeHtml\(value: string\): string \{/);
  const escapeCalls = source.match(/const safeEmail = escapeHtml\(email\);/g) ?? [];
  assert.equal(escapeCalls.length, 2, "both the confirmation and reset templates must escape the email they embed");
  const htmlUsages = source.match(/\$\{safeEmail\}/g) ?? [];
  assert.equal(htmlUsages.length, 2, "the HTML body must render the escaped variable, not the raw email, in both templates");

  const textFields = source.match(/text: `/g) ?? [];
  assert.equal(textFields.length, 3, "confirmEmailTemplate, passwordResetTemplate and alreadyRegisteredTemplate must each return a plain-text alternative - a missing text/plain part is itself a spam signal");
});

test("sendTransactionalEmail never throws a provider error up to a caller and never logs the email body (which carries a one-time link) (issue #132)", async () => {
  const source = await readFile(new URL("../../../src/lib/email/send.ts", import.meta.url), "utf8");
  assert.match(source, /return \{ ok: false \};/);
  assert.doesNotMatch(source, /console\.(log|error)\([^)]*params\.html/, "the email body must never be logged");
  assert.doesNotMatch(source, /console\.(log|error)\([^)]*result\.error\)/, "logs the error's name/category, not the raw provider error object which could carry request detail");
});

test("Owner-reported follow-up: sendTransactionalEmail requires a text alternative and forwards it to Resend, and every template embeds the app's real public logo via an absolute production URL, not a bare text wordmark (issue #132)", async () => {
  const sendSource = await readFile(new URL("../../../src/lib/email/send.ts", import.meta.url), "utf8");
  assert.match(sendSource, /text: string;/, "text must be a required field on the params type, not optional - every caller must supply one");
  assert.match(sendSource, /text: params\.text,/, "must actually be forwarded to resend.emails.send, not just accepted and dropped");

  const templatesSource = await readFile(new URL("../../../src/lib/email/templates.ts", import.meta.url), "utf8");
  assert.match(templatesSource, /import \{ absolutePublicAssetUrl \} from "@\/lib\/auth\/app-url";/);
  assert.match(templatesSource, /const logoUrl = absolutePublicAssetUrl\("\/assets\/al_lio_wordmark\.png"\);/);

  const appUrlSource = await readFile(new URL("../../../src/lib/auth/app-url.ts", import.meta.url), "utf8");
  assert.match(appUrlSource, /const base = process\.env\.PUBLIC_ASSET_BASE_URL \?\? process\.env\.BASE_URL \?\? "http:\/\/localhost:3000";/, "must fall back to BASE_URL when unset, so production needs no extra config for this to work");
  assert.match(templatesSource, /<img src="\$\{logoUrl\}" alt="AL-LÍO"/);

  for (const templateFn of ["confirmEmailTemplate", "passwordResetTemplate", "alreadyRegisteredTemplate"]) {
    assert.match(templatesSource, new RegExp(`export function ${templateFn}\\(`), `${templateFn} must exist and be exported`);
  }
});
