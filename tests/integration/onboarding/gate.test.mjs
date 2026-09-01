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
  const [layout, context] = await Promise.all([
    readSource("src/app/(dashboard)/layout.tsx"),
    readSource("src/lib/auth/authenticated-student-context.ts"),
  ]);

  assert.match(layout, /import \{ getAuthenticatedStudentContext \} from "@\/lib\/auth\/authenticated-student-context"/);
  assert.match(layout, /import \{ redirect \} from "next\/navigation"/);
  assert.match(context, /if \(!profile \|\| !profile\.onboarding_completed_at\) redirect\("\/onboarding"\)/);
  assert.match(layout, /if \(!profile\.cycle_code\) \{/);
  assert.match(layout, /redirect\("\/onboarding"\)/);

  // Both halves of the gate must run before either server boundary returns.
  const contextGateIndex = context.indexOf('redirect("/onboarding")');
  const gateIndex = layout.indexOf('redirect("/onboarding")');
  assert.ok(contextGateIndex > 0 && contextGateIndex < context.indexOf("return {"), "the profile gate must run before the context returns");
  assert.ok(gateIndex > 0 && gateIndex < layout.indexOf("return ("), "the gate must run before the layout returns markup");
  assert.match(context, /if \(!session\) redirect\("\/login"\)/, "the private context must reject an absent session before loading profile data");

  assert.match(layout, /getProductTourState\(session\.uid\)/);
  assert.match(layout, /shouldOfferProductTour\(state\)/);
  assert.match(layout, /tourState && <ProductTourShell initialState=\{tourState\} \/>/);
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
