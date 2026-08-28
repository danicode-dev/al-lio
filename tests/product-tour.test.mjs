import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PRODUCT_TOUR_VERSION,
  normalizeProductTourState,
  resumeStepFor,
  shouldOfferProductTour,
} from "../src/lib/onboarding/tour-state.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

// ---------------------------------------------------------------------------
// Issue #194 - who is offered the tour. These are the rules the dashboard
// layout gates on, so they are tested as behaviour rather than as source text.
// ---------------------------------------------------------------------------

test("a brand-new student is offered the tour, and a finished or dismissed one is not", () => {
  const fresh = normalizeProductTourState(null);
  assert.equal(fresh.status, "not_started");
  assert.equal(shouldOfferProductTour(fresh), true);

  assert.equal(
    shouldOfferProductTour({ status: "completed", version: PRODUCT_TOUR_VERSION, step: null }),
    false,
    "finishing the tour must stop the invitation",
  );
  assert.equal(
    shouldOfferProductTour({ status: "skipped", version: PRODUCT_TOUR_VERSION, step: null }),
    false,
    "'Explorar por mi cuenta' is a decision and must be respected",
  );
});

test("an interrupted tour is offered again and resumes at its stored step", () => {
  const interrupted = { status: "in_progress", version: PRODUCT_TOUR_VERSION, step: "bloc" };
  assert.equal(shouldOfferProductTour(interrupted), true, "a reload mid-tour must not lose the tour");
  assert.equal(resumeStepFor(interrupted), "bloc");

  assert.equal(
    resumeStepFor({ status: "completed", version: PRODUCT_TOUR_VERSION, step: "bloc" }),
    null,
    "a finished run has nothing to resume even if a step is still recorded",
  );
});

test("a newer tour version re-offers the tour to someone who already finished the old one", () => {
  const finishedOldVersion = { status: "completed", version: PRODUCT_TOUR_VERSION - 1, step: null };
  assert.equal(shouldOfferProductTour(finishedOldVersion), true);
  assert.equal(
    shouldOfferProductTour({ status: "completed", version: PRODUCT_TOUR_VERSION, step: null }),
    false,
  );
});

test("unknown or corrupt persisted values fall back to a safe default instead of throwing", () => {
  const state = normalizeProductTourState({
    product_tour_status: "something-else",
    product_tour_version: "not-a-number",
    product_tour_step: "   ",
  });
  assert.deepEqual(state, { status: "not_started", version: 0, step: null });
});

// ---------------------------------------------------------------------------
// Engine contract. The two rules that keep the tour from breaking the app are
// structural, so they are pinned against the source.
// ---------------------------------------------------------------------------

test("the tour drives the real UI through the command bus - no synthesised clicks or fake cursor", async () => {
  const [provider, steps, bus, header, mobileNav] = await Promise.all([
    read("../src/components/onboarding/tour/tour-provider.tsx"),
    read("../src/lib/onboarding/tour-steps.ts"),
    read("../src/components/onboarding/tour/tour-ui-bus.ts"),
    read("../src/components/student-header-actions.tsx"),
    read("../src/components/mobile-header-navigation.tsx"),
  ]);

  for (const [label, source] of [["provider", provider], ["steps", steps], ["bus", bus]]) {
    assert.doesNotMatch(source, /dispatchEvent|new MouseEvent|\.click\(\)/, `${label} must not synthesise input events`);
    assert.doesNotMatch(source, /elementFromPoint|clientX/, `${label} must not do cursor coordinate maths`);
  }

  // The + dialog and the mobile menu keep owning their state; the tour only
  // publishes intent and they perform it with their own setter.
  assert.match(header, /useTourUiCommand\("quick-add:open"/);
  assert.match(header, /setQuickAddOpen\(true\)/);
  assert.match(mobileNav, /useTourUiCommand\("mobile-menu:open", useCallback\(\(\) => setOpen\(true\)/);
  assert.match(mobileNav, /useTourUiCommand\("mobile-menu:close", useCallback\(\(\) => setOpen\(false\)/);

  // Both header copies are mounted at once; only the displayed one may react,
  // or the tour would open two stacked dialogs.
  assert.match(header, /offsetParent !== null/);
});

test("steps synchronise on real conditions, with timeouts only as a recovery ceiling", async () => {
  const [wait, provider] = await Promise.all([
    read("../src/components/onboarding/tour/wait.ts"),
    read("../src/components/onboarding/tour/tour-provider.tsx"),
  ]);

  assert.match(wait, /new MutationObserver/, "element waits observe the DOM instead of polling on a timer");
  assert.match(wait, /requestAnimationFrame/, "predicate waits settle on the frame the change lands");
  assert.match(wait, /AbortSignal|signal\?\.addEventListener\("abort"/, "every wait is abortable");

  // Navigation resolves on the committed route, never on a guessed delay.
  assert.match(provider, /waitForCondition\(\(\) => pathnameRef\.current === href/);
  // A failed step must release the overlay rather than strand the student:
  // an abort is expected and silent, anything else is reported, and either
  // way the controls come back.
  assert.match(provider, /if \(!\(error instanceof TourAbortError\)\) \{/);
  assert.match(provider, /finally \{[\s\S]*?setBusy\(false\);/);
});

// Owner-reported: the tour froze on step 2 and again right after creating the
// demo task, stuck on "Un momento…" with Siguiente disabled.
//
// Cause: the store rebuilds `actions` as a fresh object every render, so the
// step runner's dependencies changed identity constantly. Any re-render - the
// toast, or the optimistic insert the tour itself had just made - re-ran the
// effect, which aborted the in-flight step and left `busy` true forever. The
// step's `enter` also has side effects, so a re-run would have repeated them.
test("the step runner is keyed on the step alone and always releases `busy`, so an unrelated re-render cannot freeze the tour", async () => {
  const provider = await read("../src/components/onboarding/tour/tour-provider.tsx");

  const runner = provider.slice(provider.indexOf("// Runs one step:"), provider.indexOf("const leaveStep"));
  assert.match(runner, /\}, \[phase, step, buildContext\]\);/, "the runner must not depend on values that change identity every render");
  assert.doesNotMatch(runner, /\[phase, step, buildContext, viewport\]/);

  // `busy` is released unconditionally - not only when the run was not cancelled.
  assert.match(runner, /finally \{[\s\S]*?setBusy\(false\);/);
  assert.doesNotMatch(runner, /if \(!cancelled\) setBusy\(false\)/, "an aborted run must still hand the controls back");

  // buildContext reads the store and router through a ref, so it stays stable.
  assert.match(provider, /const liveRef = useRef\(\{ actions, router, viewport \}\);/);
  assert.match(provider, /liveRef\.current\.actions\.addTask\(\{/);
  const buildContext = provider.slice(provider.indexOf("const buildContext"), provider.indexOf("// Runs one step:"));
  assert.match(buildContext, /\}\),\s*\[\],\s*\);/, "buildContext must have no dependencies");

  // And a watchdog exists so no future step can strand the overlay either.
  assert.match(provider, /const timer = window\.setTimeout\(\(\) => setBusy\(false\), 15_000\);/);
});

test("Escape leaves the tour and the overlay never blocks the app permanently", async () => {
  const provider = await read("../src/components/onboarding/tour/tour-provider.tsx");
  assert.match(provider, /event\.key === "Escape"/);
  assert.match(provider, /document\.addEventListener\("keydown", onKeyDown\)/);
  // Leaving always clears whatever a step opened.
  assert.match(provider, /publishTourUiCommand\(\{ type: "quick-add:close" \}\)/);
  assert.match(provider, /publishTourUiCommand\(\{ type: "mobile-menu:close" \}\)/);
});

// ---------------------------------------------------------------------------
// Demo data. The whole point of the marking is that cleanup never has to guess.
// ---------------------------------------------------------------------------

test("everything the tour creates is marked by origin, through the existing create paths", async () => {
  const [provider, store, bloc, migration] = await Promise.all([
    read("../src/components/onboarding/tour/tour-provider.tsx"),
    read("../src/components/guest-store.tsx"),
    read("../src/components/bloc/bloc-notepad.tsx"),
    read("../infra/postgres/migrations/0010_product_tour.sql"),
  ]);

  // The task goes through the same store action the + dialog calls.
  assert.match(provider, /await liveRef\.current\.actions\.addTask\(\{/, "no second task-create implementation for the tour");
  assert.match(provider, /demo_source: ONBOARDING_DEMO_SOURCE/);
  assert.match(provider, /demo_dataset_id: datasetIdRef\.current/);
  assert.match(store, /demo_source: data\.demo_source \?\? null/, "a student's own task stays unmarked");

  // The note goes through Bloc's own createNote.
  assert.match(bloc, /useTourUiCommand\("bloc:create-note"/);
  assert.match(bloc, /createNoteRef\.current\?\.\(\{ title: command\.title/);

  // Both tables carry the same two columns, so cleanup is one predicate.
  for (const table of ["public.tasks", "public.bloc_notes"]) {
    assert.match(
      migration,
      new RegExp(`alter table ${table.replace(".", "\\.")}\\s+add column if not exists demo_source text,\\s+add column if not exists demo_dataset_id uuid;`),
      `${table} needs the shared demo origin columns`,
    );
  }
  assert.match(migration, /demo_source is null or demo_source in \('onboarding', 'internal_test'\)/);
});

test("the tour's own state never reuses the profile wizard's onboarding columns", async () => {
  const [migration, repository, data] = await Promise.all([
    read("../infra/postgres/migrations/0010_product_tour.sql"),
    read("../src/lib/db/repositories/product_tour.ts"),
    read("../src/lib/data.ts"),
  ]);

  assert.match(migration, /product_tour_status/);
  assert.doesNotMatch(repository, /\bonboarding_completed_at\b/, "the tour must not read or write the wizard's column");
  // The wizard's gate is untouched: skipping the tour must never lock a
  // student out of the dashboard.
  assert.match(data, /if \(!profile \|\| !profile\.onboarding_completed_at\) redirect\("\/onboarding"\);/);
});

test("tour server actions resolve the user from the session and accept no user id", async () => {
  const actions = await read("../src/lib/onboarding/tour-actions.ts");
  assert.match(actions, /^"use server";/);
  assert.match(actions, /const session = await getValidatedSession\(\);/);
  assert.doesNotMatch(actions, /userId: string/, "no action may take a caller-supplied user id");
  assert.doesNotMatch(actions, /formData/, "these are called from the provider, not from a form");
  for (const action of ["startProductTourAction", "completeProductTourAction", "skipProductTourAction", "resetProductTourAction"]) {
    assert.match(actions, new RegExp(`export async function ${action}`));
  }
});

test("the step list is data, and every navigation step has a mobile path through the menu", async () => {
  const steps = await read("../src/lib/onboarding/tour-steps.ts");
  assert.doesNotMatch(steps, /document\.|window\./, "steps must not reach for the DOM themselves");
  assert.doesNotMatch(steps, /from "react"|\/>/, "the step list is data, not a component");
  // The same goal needs a different sequence on a phone: open the menu, point
  // inside it, navigate, close it.
  assert.match(steps, /if \(context\.viewport === "mobile"\) \{\s*await context\.ui\(\{ type: "mobile-menu:open" \}\);/);
  assert.match(steps, /await context\.ui\(\{ type: "mobile-menu:close" \}\);/);
});

test("the overlay measures its target live so a resize or rotation cannot strand the spotlight", async () => {
  const overlay = await read("../src/components/onboarding/tour/tour-overlay.tsx");
  assert.match(overlay, /new ResizeObserver\(measure\)/);
  assert.match(overlay, /window\.addEventListener\("resize", measure\)/);
  assert.match(overlay, /window\.addEventListener\("scroll", measure, true\)/);
  // Animation stays on cheap properties, and reduced motion removes it.
  assert.match(overlay, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(overlay, /transition: all/);
});
