"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useStore } from "@/components/guest-store";
import { publishTourUiCommand, type TourUiCommand } from "@/components/onboarding/tour/tour-ui-bus";
import { TourOverlay } from "@/components/onboarding/tour/tour-overlay";
import { pause, prefersReducedMotion, TourAbortError, waitForCondition, waitForElement } from "@/components/onboarding/tour/wait";
import {
  advanceProductTourAction,
  completeProductTourAction,
  skipProductTourAction,
  startProductTourAction,
} from "@/lib/onboarding/tour-actions";
import { findStepIndex, productTourSteps } from "@/lib/onboarding/tour-steps";
import { ONBOARDING_DEMO_SOURCE, type ProductTourState } from "@/lib/onboarding/tour-state";
import type { TourStepContext, TourViewport } from "@/lib/onboarding/types";

type Phase = "idle" | "invite" | "running";

const MOBILE_QUERY = "(max-width: 767px)";

export function ProductTourProvider({ initialState }: { initialState: ProductTourState | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { actions } = useStore();

  const [phase, setPhase] = useState<Phase>("idle");
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewport, setViewport] = useState<TourViewport>("desktop");

  // Read inside async step bodies that outlive the render they started in.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  // The store rebuilds `actions` as a fresh object on every render, so anything
  // that closes over it changes identity constantly. Reading these through a
  // ref keeps the step runner below keyed on the step alone - otherwise an
  // unrelated re-render (a toast, the optimistic insert the tour itself just
  // made) would abort the running step and leave it stuck mid-flight.
  const liveRef = useRef({ actions, router, viewport });
  liveRef.current = { actions, router, viewport };
  const runRef = useRef<AbortController | null>(null);
  // One id per run, so everything a single tour creates can be cleaned up
  // together later without touching anything else (issue #195).
  const datasetIdRef = useRef<string>("");

  const step = productTourSteps[index];
  const total = productTourSteps.length;

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => setViewport(media.matches ? "mobile" : "desktop");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // The invitation only appears once the student is actually on the dashboard,
  // so it never interrupts a deep link into some other page.
  useEffect(() => {
    if (!initialState) return;
    if (phase !== "idle") return;
    if (pathname !== "/dashboard") return;
    setIndex(findStepIndex(initialState.step));
    setPhase("invite");
  }, [initialState, pathname, phase]);

  const stop = useCallback(() => {
    runRef.current?.abort();
    runRef.current = null;
    setPhase("idle");
    setTarget(null);
    setBusy(false);
    publishTourUiCommand({ type: "quick-add:close" });
    publishTourUiCommand({ type: "mobile-menu:close" });
  }, []);

  // Stable for the lifetime of the provider: everything it needs comes from
  // liveRef at call time, so it never invalidates the step runner.
  const buildContext = useCallback(
    (signal: AbortSignal): TourStepContext => ({
      viewport: liveRef.current.viewport,
      signal,
      navigate: async (href) => {
        if (pathnameRef.current === href) return;
        liveRef.current.router.push(href);
        await waitForCondition(() => pathnameRef.current === href, { signal, timeoutMs: 10_000 });
      },
      ui: async (command: TourUiCommand) => {
        publishTourUiCommand(command);
        // Give React the frame it needs to apply the subscriber's setState
        // before the step looks for whatever that state renders.
        await pause(prefersReducedMotion() ? 0 : 90, signal);
      },
      waitForElement: (selector, timeoutMs) => waitForElement(selector, { signal, timeoutMs }),
      beat: (ms = 700) => pause(prefersReducedMotion() ? 0 : ms, signal),
      createDemoTask: async ({ title, description, dueAt }) => {
        try {
          // The store action the + dialog already calls. The demo columns ride
          // along through insertDb, which passes the payload straight to the
          // allowlisted table - no second create path for the tour.
          return await liveRef.current.actions.addTask({
            title,
            description,
            due_at: dueAt ?? "",
            status: "pendiente",
            priority: "media",
            category: "diario",
            demo_source: ONBOARDING_DEMO_SOURCE,
            demo_dataset_id: datasetIdRef.current,
          });
        } catch {
          return null;
        }
      },
      createDemoNote: async ({ title, body }) => {
        // The Bloc editor owns its note list and its own persistence; it
        // performs this with the same createNote() a click performs.
        publishTourUiCommand({ type: "bloc:create-note", title, body, demoDatasetId: datasetIdRef.current });
        await pause(prefersReducedMotion() ? 0 : 250, signal);
        return null;
      },
    }),
    [],
  );

  // Runs one step: its `enter` effects, then resolving the element to
  // spotlight. Any failure inside a step degrades to "no spotlight, callout
  // still shown" rather than stalling - the overlay must never trap the app.
  //
  // Keyed on the step alone. It must not re-run because something else
  // re-rendered: `enter` has side effects (it opens dialogs and creates the
  // demo rows), so a spurious re-run would both abort the in-flight step and
  // repeat those effects.
  useEffect(() => {
    if (phase !== "running" || !step) return;

    const controller = new AbortController();
    runRef.current?.abort();
    runRef.current = controller;

    (async () => {
      setBusy(true);
      setTarget(null);
      try {
        const context = buildContext(controller.signal);
        if (step.route && pathnameRef.current !== step.route && !step.enter) {
          await context.navigate(step.route);
        }
        await step.enter?.(context);

        const selector = typeof step.target === "function" ? step.target(liveRef.current.viewport) : step.target;
        if (selector) {
          const element = await waitForElement(selector, { signal: controller.signal, timeoutMs: 5_000 });
          if (!controller.signal.aborted && element) {
            element.scrollIntoView({
              behavior: prefersReducedMotion() ? "auto" : "smooth",
              block: "center",
              inline: "nearest",
            });
            setTarget(element);
          }
        }
      } catch (error) {
        if (!(error instanceof TourAbortError)) {
          // A step that throws for any other reason still hands control back:
          // the callout stays, without a spotlight, and Siguiente works.
          console.error("[tour] step failed", step.id, error);
        }
      } finally {
        // Always released, including on abort. Leaving `busy` set was what
        // previously froze the tour on its "Un momento…" state with no way
        // forward.
        setBusy(false);
      }
    })();

    return () => controller.abort();
  }, [phase, step, buildContext]);

  const leaveStep = useCallback(async () => {
    if (!step?.exit) return;
    const controller = new AbortController();
    try {
      await step.exit(buildContext(controller.signal));
    } catch {
      // Leaving must never be able to block the transition.
    }
  }, [step, buildContext]);

  const goTo = useCallback(
    async (nextIndex: number) => {
      await leaveStep();
      if (nextIndex >= total) {
        stop();
        void completeProductTourAction();
        return;
      }
      const clamped = Math.max(0, nextIndex);
      setIndex(clamped);
      void advanceProductTourAction(productTourSteps[clamped].id);
    },
    [leaveStep, stop, total],
  );

  // A step that is pure demonstration moves on by itself once its effects have
  // settled - `busy` going false is the real signal, not a fixed delay.
  useEffect(() => {
    if (phase !== "running" || busy || !step?.autoAdvanceMs) return;
    const timer = window.setTimeout(() => void goTo(index + 1), step.autoAdvanceMs);
    return () => window.clearTimeout(timer);
  }, [phase, busy, step, index, goTo]);

  // Last-resort watchdog. Every wait inside a step already has its own ceiling,
  // so this should never fire; if some future step ever leaves the runner
  // hanging, the student gets their controls back instead of a dead overlay.
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => setBusy(false), 15_000);
    return () => window.clearTimeout(timer);
  }, [busy]);

  const begin = useCallback(() => {
    datasetIdRef.current = crypto.randomUUID();
    setPhase("running");
    void startProductTourAction(productTourSteps[index]?.id ?? productTourSteps[0].id);
  }, [index]);

  const dismiss = useCallback(() => {
    stop();
    void skipProductTourAction();
  }, [stop]);

  useEffect(() => {
    if (phase === "idle") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [phase, dismiss]);

  const value = useMemo(
    () => ({ step, index, total, target, busy, viewport }),
    [step, index, total, target, busy, viewport],
  );

  if (phase === "idle" || !initialState) return null;

  return (
    <TourOverlay
      phase={phase}
      {...value}
      onStart={begin}
      onNext={() => void goTo(index + 1)}
      onPrevious={() => void goTo(index - 1)}
      onSkip={dismiss}
    />
  );
}
