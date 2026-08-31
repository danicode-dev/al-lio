# Authentication and onboarding flows

How a visitor becomes an authenticated student inside the app, and where each
redirect happens. Executable definitions live in `src/lib/auth/`,
`src/middleware.ts` and `src/app/(dashboard)/layout.tsx`; this document explains
how they fit together.

## Session

- A signed, `HttpOnly`, `SameSite=Lax` cookie (`SESSION_COOKIE`), 30 days,
  issued by `createSession` in `src/lib/auth/session.ts`.
- `src/middleware.ts` performs **signature-only** verification (Edge runtime, no
  database). It redirects an unauthenticated request for a private path to
  `/login`, and an authenticated request for `/login`, `/register` or
  `/recuperar` to `/dashboard`.
- Server components, server actions and route handlers additionally call
  `getValidatedSession`, which compares the database `security_stamp` so a
  password reset revokes direct action and API calls, not just navigation.

## Entry points

All four establish a session and hand off to `/dashboard`. None of them decides
anything about onboarding.

| Flow | Action / handler | Ends with |
|---|---|---|
| Password login | `loginWithPasswordAction` (`src/lib/auth/password-login.ts`) | `redirect("/dashboard")` |
| Registration | `registerAction` (`src/lib/auth/register.ts`) sends a confirmation email; the account is unconfirmed until the link is clicked | `submitted` panel, then the confirmation flow |
| Email confirmation | `GET /confirmar` (`src/app/(auth)/confirmar/route.ts`) → `confirmEmailToken` | `redirect("/dashboard")` |
| Password reset request | `requestPasswordResetAction` (`src/lib/auth/password-reset.ts`) sends a reset email | `submitted` panel |
| Password reset | `resetPasswordAction` (`src/lib/auth/password-reset.ts`) sets the hash, rotates the stamp, revokes other sessions | `redirect("/dashboard")` |
| Google sign-in | `GET /api/auth/google/callback` → `resolveOrProvisionGoogleUser` (links or provisions just-in-time) | redirect to the normalised `connected` return path → `/dashboard` |

Registration and reset request always return the same generic "check your
email" state regardless of whether the address exists, to stay
enumeration-safe.

## The onboarding gate

The questionnaire (`/onboarding`, `OnboardingForm`) collects the vocational
cycle and academic year, which drive every catalogue, feed and filter. The
signal that it is done is `profiles.onboarding_completed_at` **and**
`profiles.cycle_code`, both non-null.

Every private route renders through `src/app/(dashboard)/layout.tsx`. That
layout is the single gate:

1. Resolve the validated session (middleware has already excluded anonymous
   callers from these paths).
2. Load the profile (`getProfileByUser`), in parallel with the product-tour
   state query.
3. If there is no profile, or `onboarding_completed_at` is null, or
   `cycle_code` is null → `redirect("/onboarding")` before rendering children.

`src/app/onboarding/page.tsx` is the complement: a profile that is already
complete is redirected to `/dashboard`, so the questionnaire cannot be
re-entered by URL. `/onboarding` is outside the `(dashboard)` route group, so
it does not run the layout and the two redirects cannot loop.

`completeOnboardingAction` (`src/lib/profile/onboarding-actions.ts`) writes
`onboarding_completed_at` and `cycle_code`, then `redirect("/dashboard")`,
which now passes the gate.

### Why it lives in the layout

`middleware.ts` runs on the Edge runtime with no PostgreSQL connection, so it
cannot read profile state. The layout is the narrowest place that (a) has a
database-backed session and (b) is on the path of every private route.

### Effect by caller

- **New registration / just-in-time Google account** — no profile yet → gate
  sends them to the questionnaire.
- **Returning, fully-onboarded student** — profile complete → gate passes
  through, including when they return via a password reset.
- **User who never finished onboarding** — sent to the questionnaire after a
  reset or confirmation. Intended.

## Related

- ADR-0007: gate the application behind completed onboarding.
- `tests/integration/onboarding/gate.test.mjs` — source-level pin of the
  redirect wiring until an integration harness can render the layout.
