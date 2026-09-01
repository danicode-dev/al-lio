// Source-level assertion rationale: these boundaries need the Next.js request
// context, a live Google client and a shared browser to execute; the
// assertions pin the account-isolation invariants of issue #280 so a refactor
// cannot silently let one AL-LÍO user inherit another user's Google Calendar
// credential.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (p) => readFile(new URL(`../../../${p}`, import.meta.url), "utf8");

const calendarRoutes = [
  "src/app/api/google/calendar/auth/route.ts",
  "src/app/api/google/calendar/callback/route.ts",
  "src/app/api/google/calendar/status/route.ts",
  "src/app/api/google/calendar/events/route.ts",
];

test("every Google Calendar route validates the AL-LÍO session and never uses signature-only verification (issue #280)", async () => {
  for (const route of calendarRoutes) {
    const source = await read(route);
    assert.match(source, /getValidatedSession\(\)/, `${route} must validate the database-backed session`);
    assert.doesNotMatch(source, /\bgetSession\(\)/, `${route} must not use signature-only session verification`);
    assert.match(
      source,
      /if \(!session\)/,
      `${route} must fail closed when there is no validated session`,
    );
  }
});

test("status and events bail out without a session and pass the session uid into every Calendar call (issue #280)", async () => {
  const status = await read("src/app/api/google/calendar/status/route.ts");
  const events = await read("src/app/api/google/calendar/events/route.ts");

  for (const [name, source] of [["status", status], ["events", events]]) {
    assert.match(source, /const session = await getValidatedSession\(\);/, `${name} must resolve the validated session`);
    assert.match(source, /if \(!session\) return/, `${name} must return early when there is no session`);
  }

  // Every credential call is scoped to the validated session's uid, so the
  // session can never be skipped.
  assert.match(status, /getCalendarCredentialStatus\(session\.uid\)/);
  assert.doesNotMatch(status, /getCalendarCredentialStatus\(\)/);
  assert.match(events, /getGoogleCalendarClient\(session\.uid\)/);
  assert.doesNotMatch(events, /getGoogleCalendarClient\(\)/);
});

test("the encrypted Calendar credential is bound to the AL-LÍO user id (issue #280)", async () => {
  const source = await read("src/lib/google/calendar.ts");

  assert.match(source, /type CalendarCredential = \{\s*\n\s*owner: string;\s*\n\s*tokens: StoredGoogleTokens;/);
  assert.match(source, /export async function saveGoogleTokens\(ownerUid: string, tokens: StoredGoogleTokens\)/);
  assert.match(source, /encryptCredential\(\{ owner: ownerUid, tokens \}\)/);
  assert.match(source, /export async function getGoogleCalendarClient\(ownerUid: string\)/);

  // The owner check distinguishes a legacy unbound cookie from another user's.
  assert.match(source, /return \{ status: "legacy" \};/, "a pre-#280 cookie with no owner must be classified, never guessed");
  assert.match(source, /if \(owner !== ownerUid\) return \{ status: "mismatch" \};/);
  assert.match(source, /if \(read\.status !== "ok"\) return null;/, "only an owner-matched credential yields a usable client");
});

test("the OAuth callback stores the credential under the session that completed it (issue #280)", async () => {
  const source = await read("src/app/api/google/calendar/callback/route.ts");
  assert.match(source, /await saveGoogleTokens\(session\.uid, tokens\)/);
});

test("status clears an unowned or mismatched credential instead of trusting it (issue #280)", async () => {
  const source = await read("src/app/api/google/calendar/status/route.ts");
  assert.match(
    source,
    /if \(status === "legacy" \|\| status === "mismatch"\) \{[\s\S]*?await clearGoogleTokens\(\);[\s\S]*?reconnect: true/,
  );
});

test("sign-out and stale-session cleanup drop the Calendar credential cookie (issue #280)", async () => {
  const source = await read("src/lib/auth/session.ts");
  const fn = source.slice(source.indexOf("export async function clearSession"));
  assert.match(fn, /cookieStore\.delete\("d1os_google_calendar"\)/, "clearSession must also drop the Calendar cookie");
});

test("Calendar provider failures return a generic client error, never the raw provider message (issue #280)", async () => {
  const source = await read("src/app/api/google/calendar/events/route.ts");
  const fn = source.slice(source.indexOf("function friendlyGoogleError"), source.indexOf("export async function GET"));
  assert.doesNotMatch(fn, /\n\s*return message;/, "the raw provider message must not be returned to the client");
});
