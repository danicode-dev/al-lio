"use client";

import { useCallback, useLayoutEffect, useState } from "react";

import type { ProductTourStep } from "@/lib/onboarding/tour-steps";
import { MOBILE_BREAKPOINT, type Rect } from "@/components/onboarding/tour/tour-spotlight-geometry";

// Several anchors are rendered twice - the header actions exist once for the
// phone layout and once for the desktop one, and CSS hides whichever does not
// apply. Taking the first match would measure the hidden one, which reports
// 0x0 at the top-left corner: that is what pinned the spotlight to the corner
// and left the card stuck in the same place for every step. Take the first
// one that actually occupies space.
function findVisible(selector: string | null): HTMLElement | null {
  if (!selector) return null;
  for (const candidate of document.querySelectorAll<HTMLElement>(selector)) {
    const box = candidate.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) return candidate;
  }
  return null;
}

export type TourTargetGeometry = {
  viewport: { width: number; height: number };
  rect: Rect | null;
  /** True once the viewport is known and narrower than the mobile breakpoint. */
  onPhone: boolean;
};

// Resolves the visible anchor for the current step - the mobile or desktop
// selector, whichever occupies space - and measures it live. The viewport it
// tracks is what decides which selector applies, so measuring feeds back into
// selection: the same measure -> viewport -> selector loop the spotlight has
// always run, kept here in one place.
export function useTourTargetGeometry(step: ProductTourStep): TourTargetGeometry {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [rect, setRect] = useState<Rect | null>(null);
  const onPhone = viewport.width > 0 && viewport.width < MOBILE_BREAKPOINT;
  const selector = step.selector
    ? (onPhone ? step.selector.mobile : step.selector.desktop)
    : null;

  // Measured live: a resize, a rotation, a scroll or a card that changes
  // height all re-measure, so the hole can never drift off its element.
  // Every setState here keeps the previous object when nothing actually
  // moved. Measuring runs on DOM mutations, scroll and resize, and returning
  // a fresh object each time would re-render the overlay on every one of
  // them - which on a phone, where opening the menu fires a burst of
  // mutations, was enough to bring the tour to a crawl.
  const measure = useCallback(() => {
    setViewport((current) =>
      current.width === window.innerWidth && current.height === window.innerHeight
        ? current
        : { width: window.innerWidth, height: window.innerHeight });

    const element = findVisible(selector);
    if (!element) {
      setRect((current) => (current === null ? current : null));
      return;
    }
    const box = element.getBoundingClientRect();
    setRect((current) =>
      current
        && current.top === box.top
        && current.left === box.left
        && current.width === box.width
        && current.height === box.height
        ? current
        : { top: box.top, left: box.left, width: box.width, height: box.height });
  }, [selector]);

  useLayoutEffect(() => {
    measure();

    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    const element = findVisible(selector);
    // The anchor often does not exist yet when a step begins - the phone's
    // navigation sheet, for instance, is opened by the step itself. Watching
    // the tree catches it the moment it lands, and measuring straight away
    // rather than on the next animation frame keeps that working even where
    // frames are throttled.
    const observer = new MutationObserver((mutations) => {
      // The overlay itself lives in the body, so its own re-renders show up
      // here. Reacting to them would be a loop: measure, set state, render,
      // mutate, measure again.
      const fromTheApp = mutations.some((mutation) => {
        const target = mutation.target as HTMLElement | null;
        return !target?.closest?.(".al-tour-layer");
      });
      if (fromTheApp) measure();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // A couple of catch-up measurements for anchors that arrive with an
    // animation, so the hole settles on its final size rather than the one it
    // had halfway through opening.
    const settle = [window.setTimeout(measure, 80), window.setTimeout(measure, 260)];
    const resizeObserver = new ResizeObserver(schedule);
    if (element) resizeObserver.observe(element);
    // Resizing and rotating are one-off events, so they measure straight
    // away - waiting for an animation frame leaves the hole on the geometry
    // of the previous window size wherever frames are throttled. Scrolling
    // can fire continuously, so that one keeps its frame.
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.addEventListener("scroll", schedule, true);

    // Bring the anchor into view when it is off-screen, and never otherwise:
    // the page must not jump under a student who can already see it.
    if (element) {
      const box = element.getBoundingClientRect();
      if (box.top < 0 || box.bottom > window.innerHeight) {
        element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
    }

    return () => {
      window.cancelAnimationFrame(frame);
      for (const timer of settle) window.clearTimeout(timer);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [measure, selector]);

  return { viewport, rect, onPhone };
}
