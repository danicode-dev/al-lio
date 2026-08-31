// Source-level assertion rationale: the reset-request flow needs the Next.js
// request context, the database and a live Resend call to execute; these
// assertions pin the branch and the logging so a refactor cannot bring back
// the silent no-op for accounts without a local password (issue #294).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (p) => readFile(new URL(`../../../${p}`, import.meta.url), "utf8");

test("a reset request is a set-your-password link for a confirmed Google-only account, and skips only when there is no account or an unconfirmed one (issue #294)", async () => {
  const source = await read("src/lib/auth/password-reset.ts");
  const fnStart = source.indexOf("export async function requestPasswordResetAction");
  const fn = source.slice(fnStart, source.indexOf("\nconst resetSchema", fnStart));

  assert.match(fn, /if \(user\?\.email_confirmed_at\) \{/, "eligibility is a confirmed email, not a pre-existing password_hash");
  assert.doesNotMatch(fn, /if \(user\?\.password_hash\)/, "the prior-hash gate that silently dropped Google-only accounts is gone");
  assert.match(fn, /const mode = user\.password_hash \? "reset" : "set";/, "the outcome log records whether this set a first password or reset an existing one");
  assert.match(fn, /await sendTransactionalEmail\(\{ to: email, subject, html, text \}\)/);
  assert.match(fn, /logResetRequestOutcome\(user \? "skipped_unconfirmed" : "skipped_no_account"\)/, "no account and unconfirmed are distinct log outcomes, both still silent to the caller");
});

test("the reset request emits a structured, PII-free outcome for every path and never changes the caller's generic response (issue #294)", async () => {
  const source = await read("src/lib/auth/password-reset.ts");
  const fnStart = source.indexOf("export async function requestPasswordResetAction");
  const fn = source.slice(fnStart, source.indexOf("\nconst resetSchema", fnStart));

  // Every branch still funnels through the one generic return.
  assert.ok((fn.match(/return GENERIC_REQUEST_SUCCESS;/g) ?? []).length >= 3);

  assert.match(fn, /logResetRequestOutcome\(ok \? "sent" : "send_rejected", mode\)/, "the Resend {ok} result is read, not discarded");
  assert.match(fn, /\} catch \{[\s\S]*logResetRequestOutcome\("threw"\);/, "an exception is logged, still without leaking a distinct caller state");

  const helper = source.slice(source.indexOf("function logResetRequestOutcome"));
  assert.doesNotMatch(helper.slice(0, helper.indexOf("\n}")), /email|token|resetUrl|user\.id/, "the outcome log must not contain the email, token, link or user id");
});

test("send.ts logs the Resend error name and message for diagnosis, but never the raw error object or the email body (issue #294)", async () => {
  const source = await read("src/lib/email/send.ts");

  assert.match(source, /result\.error\.name.*result\.error\.message|result\.error\.message.*result\.error\.name/s, "both name and message are logged so 'domain not verified' is visible");
  assert.doesNotMatch(source, /console\.(log|error)\([^)]*result\.error\)/, "never the raw error object");
  assert.doesNotMatch(source, /console\.(log|error)\([^)]*params\.html/, "never the email body");
  assert.match(source, /return \{ ok: false \};/);
});
