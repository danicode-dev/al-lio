import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PRODUCT_TOUR_VERSION,
  normalizeProductTourState,
  resumeStepFor,
  shouldOfferProductTour,
} from "../src/lib/onboarding/tour-state.ts";
import {
  PRODUCT_TOUR_LENGTH,
  findStepIndex,
  isLastStep,
  productTourSteps,
  resolveTransition,
  stepIdAt,
} from "../src/lib/onboarding/tour-steps.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

// ---------------------------------------------------------------------------
// Issue #194 - who is offered the tour. These are the rules the dashboard
// layout gates on.
// ---------------------------------------------------------------------------

test("a brand-new student is offered the tour, and a finished or dismissed one is not", () => {
  const fresh = normalizeProductTourState(null);
  assert.equal(fresh.status, "not_started");
  assert.equal(shouldOfferProductTour(fresh), true);

  const completed = { status: "completed", version: PRODUCT_TOUR_VERSION, step: null };
  assert.equal(shouldOfferProductTour(completed), false);

  const skipped = { status: "skipped", version: PRODUCT_TOUR_VERSION, step: null };
  assert.equal(shouldOfferProductTour(skipped), false);
});

test("an interrupted tour is offered again and resumes at its stored step", () => {
  const interrupted = { status: "in_progress", version: PRODUCT_TOUR_VERSION, step: "nav-communication" };
  assert.equal(shouldOfferProductTour(interrupted), true);
  assert.equal(resumeStepFor(interrupted), "nav-communication");
  assert.equal(findStepIndex(resumeStepFor(interrupted)), 2);
});

test("a newer tour version re-offers the tour to someone who already finished the old one", () => {
  const oldRun = { status: "completed", version: PRODUCT_TOUR_VERSION - 1, step: null };
  assert.equal(shouldOfferProductTour(oldRun), true);
});

test("unknown or corrupt persisted values fall back to a safe default instead of throwing", () => {
  const corrupt = normalizeProductTourState({
    product_tour_status: "banana",
    product_tour_version: "not-a-number",
    product_tour_step: "   ",
  });
  assert.deepEqual(corrupt, { status: "not_started", version: 0, step: null });
  assert.equal(findStepIndex("a-step-that-no-longer-exists"), 0);
});

// ---------------------------------------------------------------------------
// The recorrido itself. Asserted against the step data, not against how the
// components happen to be written.
// ---------------------------------------------------------------------------

test("the tour is four explained steps plus the closing one, in the agreed order", () => {
  assert.equal(PRODUCT_TOUR_LENGTH, 5);
  assert.deepEqual(
    productTourSteps.map((step) => step.id),
    ["quick-add", "nav-principal", "nav-communication", "nav-learning", "finale"],
  );

  // Exactly one closing beat, and it is the last thing that happens.
  const finales = productTourSteps.filter((step) => step.finale);
  assert.equal(finales.length, 1);
  assert.equal(finales[0], productTourSteps.at(-1));
});

test("every step that points at something uses a stable data-tour anchor on both viewports", () => {
  for (const step of productTourSteps) {
    if (step.finale) {
      // The closing card talks about the app as a whole; it has nothing to
      // spotlight and must not claim otherwise.
      assert.equal(step.selector, undefined, "the finale must not anchor to an element");
      continue;
    }
    for (const viewport of ["desktop", "mobile"]) {
      const selector = step.selector[viewport];
      assert.match(selector, /^\[data-tour='[a-z-]+'\]$/, `${step.id}/${viewport}: ${selector}`);
    }
    assert.ok(step.side.desktop, `${step.id} has no desktop side`);
    assert.ok(step.side.mobile, `${step.id} has no mobile side`);
    // A loose padding swallows a button whole; these anchors are real
    // controls and the spotlight has to hug them.
    assert.ok(step.pointerPadding <= 16, `${step.id} pointerPadding too loose`);
  }
});

test("the first step names what the app can actually create", () => {
  const [first] = productTourSteps;
  assert.equal(first.id, "quick-add");
  for (const feature of ["tareas", "cursos", "eventos", "retos"]) {
    assert.ok(first.body.includes(feature), `the quick-add step never mentions ${feature}`);
  }
  // Hackathons are part of "eventos y retos" in the interface; naming them
  // separately promised a section that does not exist by that name.
  assert.ok(!/hackathon/i.test(first.body));
});

test("the tour never navigates and never creates content", () => {
  const serialised = JSON.stringify(productTourSteps);
  for (const forbidden of ["nextRoute", "prevRoute", "route", "enter", "exit"]) {
    assert.ok(!serialised.includes(forbidden), `step data still carries ${forbidden}`);
  }
  assert.ok(!productTourSteps.some((step) => step.id === "demo-task"), "the demo-task step is gone");
  assert.ok(!productTourSteps.some((step) => step.id === "welcome"), "the welcome step is gone");
});

test("on a phone the navigation steps open the menu and spotlight the panel behind it", () => {
  const navigationSteps = productTourSteps.filter((step) => step.id.startsWith("nav-"));
  assert.equal(navigationSteps.length, 3);

  for (const step of navigationSteps) {
    // Every destination lives behind the menu button on a phone, so these
    // steps open the sheet and point at the panel, not at the button.
    assert.equal(step.opensMobileMenu, true, `${step.id} does not open the menu`);
    assert.equal(step.selector.mobile, "[data-tour='mobile-menu-panel']");
  }

  // Nothing else touches the interface: the quick-add step only points, and
  // the closing card has nothing to open.
  for (const step of productTourSteps) {
    if (step.id.startsWith("nav-")) continue;
    assert.ok(!step.opensMobileMenu, `${step.id} must not open the menu`);
  }
});

// ---------------------------------------------------------------------------
// What each control does. The provider only executes these decisions, so the
// whole start -> next -> next -> next -> finish flow is checked here without
// needing a browser.
// ---------------------------------------------------------------------------

test("walking the whole tour forward ends in completed, one persisted step at a time", () => {
  const persisted = [];
  let index = 0;
  let outcome = null;

  for (let guard = 0; guard < 10; guard += 1) {
    const transition = resolveTransition("next", index);
    if (transition.kind !== "move") {
      outcome = transition.kind;
      break;
    }
    index = transition.index;
    persisted.push(transition.stepId);
  }

  assert.equal(outcome, "complete");
  assert.deepEqual(persisted, ["nav-principal", "nav-communication", "nav-learning", "finale"]);
  assert.equal(index, PRODUCT_TOUR_LENGTH - 1);
  assert.equal(isLastStep(index), true);
});

test("skipping marks it skipped from any step, and going back never closes the tour", () => {
  for (let index = 0; index < PRODUCT_TOUR_LENGTH; index += 1) {
    assert.deepEqual(resolveTransition("skip", index), { kind: "skip" });
  }

  assert.deepEqual(resolveTransition("previous", 2), { kind: "move", index: 1, stepId: "nav-principal" });
  // On the first step there is nowhere back to go: it must stay put rather
  // than fall off the start and end the run.
  assert.deepEqual(resolveTransition("previous", 0), { kind: "move", index: 0, stepId: "quick-add" });
  assert.equal(stepIdAt(99), "finale");
});

// ---------------------------------------------------------------------------
// Integration: the anchors the steps name have to exist in the components the
// tour runs against, or the spotlight has nothing to land on.
// ---------------------------------------------------------------------------

test("every anchor the steps ask for exists in the sidebar, the header or the mobile navigation", async () => {
  const markup = (await Promise.all([
    read("../src/components/app-sidebar.tsx"),
    read("../src/components/student-header-actions.tsx"),
    read("../src/components/mobile-header-navigation.tsx"),
  ])).join("\n");

  for (const step of productTourSteps) {
    if (!step.selector) continue;
    for (const viewport of ["desktop", "mobile"]) {
      const anchor = step.selector[viewport].replace("[data-tour='", "").replace("']", "");
      assert.ok(
        markup.includes(`"${anchor}"`) || markup.includes(`'${anchor}'`),
        `no element carries data-tour="${anchor}" (${step.id}/${viewport})`,
      );
    }
  }
});

test("the tour's own state never reuses the profile wizard's onboarding columns", async () => {
  const [actions, repository] = await Promise.all([
    read("../src/lib/onboarding/tour-actions.ts"),
    read("../src/lib/db/repositories/product_tour.ts"),
  ]);

  // Sharing them would make "finished choosing my cycle" and "watched the
  // tour" the same fact, and skipping the tour would lock the student out.
  for (const source of [actions, repository]) {
    assert.doesNotMatch(source, /onboarding_completed_at|onboarding_version/);
  }
  assert.match(repository, /product_tour_status/);
});

test("tour server actions resolve the user from the session and accept no user id", async () => {
  const source = await read("../src/lib/onboarding/tour-actions.ts");
  const exported = source.matchAll(/export async function (\w+)\(([^)]*)\)/g);

  for (const [, name, parameters] of exported) {
    assert.ok(
      !/userId|user_id/.test(parameters),
      `${name} takes a user id; it must read the caller from the session instead`,
    );
  }
  assert.match(source, /getValidatedSession/);
});
