# ADR-0007: Gate the application behind completed onboarding

**Status:** Accepted

## Context

Four authentication paths establish a session and redirect to `/dashboard`:
password login, password reset, email confirmation and Google sign-in. None of
them checks whether the student has completed the onboarding questionnaire
(vocational cycle and academic year), which is what tailors every catalogue,
feed and filter in the app.

The only redirect to `/onboarding` lived in `src/app/(dashboard)/profile/page.tsx`,
so the questionnaire was reachable only by opening **Ver perfil**. A newly
registered student, a just-in-time Google account or a user who reset their
password could land in the app with `profiles.onboarding_completed_at` and
`profiles.cycle_code` still null. Several API routes already reject that state
with a 409, but the pages rendered anyway.

`src/middleware.ts` cannot perform this check: it runs on the Edge runtime with
signature-only session verification and no PostgreSQL connection.

## Decision

Every private route renders through `src/app/(dashboard)/layout.tsx`. That
layout is the single onboarding gate: it loads the caller's profile with the
already-validated session and, when there is no profile or either
`onboarding_completed_at` or `cycle_code` is null, redirects to `/onboarding`
before rendering any children.

`src/app/onboarding/page.tsx` is the other half of the pair: a profile that is
already complete is redirected to `/dashboard`, so the questionnaire cannot be
re-entered by typing the URL. `/onboarding` sits outside the `(dashboard)`
route group, so the two redirects cannot loop.

The authentication actions keep redirecting to `/dashboard`. They do not know
or care about onboarding state; the gate owns that decision in one place.

## Consequences

- A student cannot reach the app with an unfinished profile, regardless of how
  the session was created.
- A returning, fully-onboarded student is unaffected: the gate reads the
  profile and passes straight through. This includes returning via a password
  reset.
- A user who never finished onboarding is sent to the questionnaire after a
  reset or confirmation, which is the intended behaviour.
- The gate adds one indexed `profiles` lookup per private navigation, issued in
  parallel with the existing product-tour state query, so it does not add a
  serial round-trip.
- `middleware.ts` stays signature-only; the database-backed checks remain in
  server components, actions and route handlers.
- The redirect is not executable by the plain Node test runner. Until an
  integration harness renders the layout, `tests/integration/onboarding/gate.test.mjs`
  pins the wiring at the source level.

## Evidence

- `src/app/(dashboard)/layout.tsx`
- `src/app/onboarding/page.tsx`
- `src/lib/db/repositories/profiles.ts`
- `tests/integration/onboarding/gate.test.mjs`
- `docs/architecture/AUTH_AND_ONBOARDING_FLOWS.md`
