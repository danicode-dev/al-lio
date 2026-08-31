// Source-level assertion rationale: the onboarding gate is two server-component
// redirects that the plain Node runner cannot execute (they need the Next.js
// request context and a database). Until an integration harness renders the
// (dashboard) layout, these assertions pin the redirect wiring so a refactor
// cannot quietly drop it and let a profile-less student into the app.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (relativePath) => readFile(new URL(`../../../${relativePath}`, import.meta.url), "utf8");

test("the (dashboard) layout redirects every session with an unfinished profile to /onboarding (issue #290)", async () => {
  const layout = await readSource("src/app/(dashboard)/layout.tsx");

  assert.match(layout, /import \{ getProfileByUser \} from "@\/lib\/db\/repositories\/profiles"/);
  assert.match(layout, /import \{ redirect \} from "next\/navigation"/);
  assert.match(
    layout,
    /!profile \|\| !profile\.onboarding_completed_at \|\| !profile\.cycle_code/,
    "an absent profile, a missing completion timestamp or a missing cycle all count as not onboarded",
  );
  assert.match(layout, /redirect\("\/onboarding"\)/);

  // The gate must sit before the layout renders its children, and inside the
  // authenticated branch so it never runs for a request with no session.
  const gateIndex = layout.indexOf('redirect("/onboarding")');
  assert.ok(gateIndex > 0 && gateIndex < layout.indexOf("return ("), "the gate must run before the layout returns markup");
  assert.ok(layout.slice(0, gateIndex).includes("if (session)"), "the gate must be guarded by an authenticated session");
});

test("/onboarding sends an already-onboarded student back to /dashboard (issue #290)", async () => {
  const page = await readSource("src/app/onboarding/page.tsx");

  assert.match(
    page,
    /if \(profile\?\.onboarding_completed_at && profile\.cycle_code\) \{\s*\n\s*redirect\("\/dashboard"\);/,
    "a complete profile is bounced to the dashboard so the questionnaire cannot be re-entered by URL",
  );
});

test("every password/session entry point still lands on /dashboard and lets the gate decide (issue #290)", async () => {
  const [passwordLogin, passwordReset, confirmRoute, googleCallback] = await Promise.all([
    readSource("src/lib/auth/password-login.ts"),
    readSource("src/lib/auth/password-reset.ts"),
    readSource("src/app/(auth)/confirmar/route.ts"),
    readSource("src/app/api/auth/google/callback/route.ts"),
  ]);

  assert.match(passwordLogin, /redirect\("\/dashboard"\)/);
  assert.match(passwordReset, /redirect\("\/dashboard"\)/);
  assert.match(confirmRoute, /NextResponse\.redirect\(new URL\("\/dashboard", baseUrl\)\)/);
  // The Google callback returns to its own normalised path; the gate then
  // catches a brand-new just-in-time account with no profile.
  assert.match(googleCallback, /getGoogleIdentityReturnPath\("connected"\)/);

  // None of them may special-case onboarding themselves - the single gate owns it.
  for (const source of [passwordLogin, passwordReset, confirmRoute, googleCallback]) {
    assert.doesNotMatch(source, /onboarding_completed_at|redirect\("\/onboarding"\)/);
  }
});
