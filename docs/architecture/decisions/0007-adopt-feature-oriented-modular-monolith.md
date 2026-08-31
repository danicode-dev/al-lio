# ADR-0007: Adopt a feature-oriented modular monolith

**Status:** Accepted

## Context

The App Router already provides stable URL and authentication boundaries, but
most product UI was assembled by `GuestApp` through a `view` string. That
component owned unrelated task, work, course, event, calendar, resource,
settings and Bloc concerns. `StoredGuestApp` then hid the dependency behind a
second routing wrapper. Bloc had the same problem internally: editor state,
lists, formatting controls, export and persistence helpers lived in one file.

This made ownership unclear, coupled unrelated changes and encouraged tests to
inspect the text of central files instead of the module that owned a behavior.
AL-LIO remains one Next.js application and does not need a monorepo or runtime
microservices to solve that problem.

## Decision

Use a feature-oriented modular monolith with these boundaries:

- `src/app` owns URLs, layouts, route handlers, metadata and route-level access
  control. A route composes UI through a feature's root `index.ts` and may use
  an explicit `server`, `domain`, or `presentation` public boundary when the
  route itself owns that composition.
- `src/features/<feature>` owns product-specific UI, client orchestration,
  domain behavior and feature-specific server entry points.
- `src/shared` owns UI composition and utilities that have multiple consumers
  and no product-specific meaning.
- Existing `src/components` and `src/lib` modules remain valid shared and
  server infrastructure while they are incrementally moved to an unambiguous
  owner. New product behavior must start in a feature.
- A feature may consume another feature only through a documented public entry
  point: the feature root or its `client`, `domain`, `presentation`, or `server`
  barrel. A `server/actions` module is also public when a client must invoke
  explicit Next.js Server Actions without importing a barrel that exposes
  repositories. Other concrete files below those boundaries remain private.
- Client modules may invoke explicit Next.js server actions, but server-only
  repositories, sessions and secrets are not re-exported by client barrels.
- Authentication and authorisation remain route/server responsibilities.
  Moving UI must never weaken per-operation user scoping in server actions.

`GuestApp`, its `View` switch and `StoredGuestApp` are removed. The Bloc feature
separates orchestration, editor helpers, toolbar, note list, menus, persistence
normalisation and export code. Automated boundary checks prevent these shells
and oversized feature modules from returning.

The cross-feature data container lives under `src/shared/store`; it remains one
authenticated context mounted by the dashboard layout. It owns only the loaded
snapshot and state replacement. Product mutations, optimistic updates and
rollback behavior live in feature-owned client hooks, so `shared` does not
import product features or server actions.

## Consequences

- A product change has a named owner and a smaller review surface.
- App Router pages describe route composition directly instead of passing
  string discriminators into a client god component.
- Feature public APIs are deliberate dependencies; internal file movement does
  not require route or consumer changes.
- Some established shared infrastructure remains in `src/components` and
  `src/lib`. It should move only when ownership is clear, avoiding speculative
  abstractions or compatibility facades.
- Source-inspection tests follow the owning feature. Architecture tests enforce
  direction, public entry points and maximum module size.

## Evidence

- `src/features/`
- `src/shared/ui/feature-page.tsx`
- `scripts/check-feature-boundaries.mjs`
- `tests/architecture/features/boundaries.test.mjs`
- App Router pages under `src/app/(dashboard)/`
