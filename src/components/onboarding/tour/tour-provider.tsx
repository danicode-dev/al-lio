"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { TourCard } from "@/components/onboarding/tour/tour-card";
import { TourInvite } from "@/components/onboarding/tour/tour-invite";
import { TourSpotlight } from "@/components/onboarding/tour/tour-spotlight";
import {
  advanceProductTourAction,
  completeProductTourAction,
  skipProductTourAction,
  startProductTourAction,
} from "@/lib/onboarding/tour-actions";
import {
  PRODUCT_TOUR_LENGTH,
  findStepIndex,
  productTourSteps,
  resolveTransition,
  stepIdAt,
} from "@/lib/onboarding/tour-steps";
import type { ProductTourState } from "@/lib/onboarding/tour-state";

// Short and unfussy, the way a SaaS moves - not the elastic overshoot a
// spring default gives.
const MOTION_MS = 300;

type Phase = "inviting" | "running" | "done";

// The tour has exactly one index, and it lives here. The spotlight is told
// what to point at; the database is told where the student got to. There is
// no second source of truth to drift out of sync.
export function ProductTourShell({ initialState }: { initialState: ProductTourState }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("inviting");
  const [index, setIndex] = useState(() => findStepIndex(initialState.step));
  const [reducedMotion, setReducedMotion] = useState(false);
  const [onPhone, setOnPhone] = useState(false);
  // Whether the sheet on screen was opened by the tour, so leaving can put
  // the interface back exactly as it found it.
  const openedMenuRef = useRef(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phoneQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setReducedMotion(motionQuery.matches);
      setOnPhone(phoneQuery.matches);
    };
    sync();
    motionQuery.addEventListener("change", sync);
    phoneQuery.addEventListener("change", sync);
    return () => {
      motionQuery.removeEventListener("change", sync);
      phoneQuery.removeEventListener("change", sync);
    };
  }, []);

  // The one place the tour touches the interface. On a phone every
  // destination lives behind the menu button, so a step that talks about
  // them opens the sheet and the spotlight covers it whole; any step that
  // does not need it closes it again. The sheet is toggled through its own
  // button, so its component stays the owner of its state.
  const setMobileMenu = useCallback((open: boolean) => {
    const trigger = document.querySelector<HTMLElement>("[data-tour='mobile-menu-trigger']");
    if (!trigger || trigger.getBoundingClientRect().width === 0) return;
    const isOpen = trigger.getAttribute("aria-expanded") === "true";
    if (isOpen === open) return;
    trigger.click();
    openedMenuRef.current = open;
  }, []);

  const begin = useCallback(() => {
    setPhase("running");
    void startProductTourAction(stepIdAt(index));
  }, [index]);

  const leave = useCallback((outcome: "complete" | "skip") => {
    setPhase("done");
    if (openedMenuRef.current) setMobileMenu(false);
    if (outcome === "complete") void completeProductTourAction();
    else void skipProductTourAction();
  }, [setMobileMenu]);

  const move = useCallback((intent: "next" | "previous" | "skip") => {
    const transition = resolveTransition(intent, index);
    if (transition.kind === "complete") return leave("complete");
    if (transition.kind === "skip") return leave("skip");
    setIndex(transition.index);
    void advanceProductTourAction(transition.stepId);
  }, [index, leave]);

  // Escape leaves at any point: an overlay must never be something a student
  // cannot get out of.
  useEffect(() => {
    if (phase !== "running") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") move("skip");
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [phase, move]);

  const motionMs = reducedMotion ? 0 : MOTION_MS;
  const step = productTourSteps[index];

  // Open or close the phone's navigation sheet as the recorrido moves in and
  // out of the steps that describe it.
  useEffect(() => {
    if (phase !== "running" || !onPhone) return;
    setMobileMenu(Boolean(step?.opensMobileMenu));
  }, [phase, onPhone, step, setMobileMenu]);

  // Leaving the page mid-tour must not strand an open sheet either.
  useEffect(() => () => {
    if (openedMenuRef.current) setMobileMenu(false);
  }, [setMobileMenu]);

  // The four steps describe the dashboard, so that is the only place the tour
  // runs - it never interrupts a deep link into another page, and it never
  // navigates anywhere itself.
  const onDashboard = pathname === "/dashboard";

  const card = useMemo(() => (
    function renderCard({ index: cardIndex, total }: { index: number; total: number }) {
      return (
        <TourCard
          step={productTourSteps[cardIndex]}
          index={cardIndex}
          total={total}
          onNext={() => move("next")}
          onBack={() => move("previous")}
          onSkip={() => move("skip")}
        />
      );
    }
  ), [move]);

  return (
    <>
      {onDashboard && phase === "inviting" && (
        <TourInvite onStart={begin} onDecline={() => leave("skip")} />
      )}
      {onDashboard && phase === "running" && step && (
        <TourSpotlight
          step={step}
          index={index}
          total={PRODUCT_TOUR_LENGTH}
          motionMs={motionMs}
          card={card}
        />
      )}
    </>
  );
}
