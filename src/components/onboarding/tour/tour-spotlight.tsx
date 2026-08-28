"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { ProductTourStep, TourStepSide } from "@/lib/onboarding/tour-steps";

// The spotlight: one dimmed layer with a hole punched over the element being
// explained, and a card anchored to it that glides from target to target.
//
// The geometry is Onborda's (https://github.com/uixmat/onborda, MIT) - the
// oversized box-shadow keyhole, the per-side card anchoring, the padding and
// radius per step. It is implemented here rather than taken as a dependency
// for two reasons found while integrating it:
//
//   1. Onborda nests its animated keyhole inside a second motion element that
//      drives variants. Current Framer Motion versions then stop applying the
//      child's own `animate` prop, so the spotlight lands on the first target
//      and never moves again while the card keeps advancing - reproduced on
//      framer-motion 11, 12 and 13, with the last published Onborda (1.2.5).
//   2. It writes `position: relative` onto every element it highlights and
//      only cleans it up in interactive mode, leaving a permanent change to
//      the app's layout behind. Measuring from a fixed overlay needs no such
//      mutation: the interface is never touched at all.
//
// The movement is a CSS transition rather than a Framer Motion animation. On
// React 19 the library never applied a changed `animate` object here at all -
// the keyhole stayed frozen wherever it first mounted - and interpolating
// transform/width/height is precisely what it would have done anyway, so the
// browser does it directly and the dependency is gone.
//
// Everything here is read-only with respect to the app: it measures, it never
// writes. Nothing is clicked, opened or moved.

type Rect = { top: number; left: number; width: number; height: number };

const CARD_WIDTH = 320;
const CARD_GAP = 16;
const EDGE = 12;
const MOBILE_BREAKPOINT = 768;

export type TourCardRenderProps = {
  step: ProductTourStep;
  index: number;
  total: number;
};

export function TourSpotlight({
  step,
  index,
  total,
  motionMs,
  card: Card,
}: {
  step: ProductTourStep;
  index: number;
  total: number;
  /** Duration of the glide between targets; 0 under reduced motion. */
  motionMs: number;
  card: (props: TourCardRenderProps) => React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [rect, setRect] = useState<Rect | null>(null);
  const selector = viewport.width && viewport.width < MOBILE_BREAKPOINT
    ? step.selector.mobile
    : step.selector.desktop;
  const side = viewport.width && viewport.width < MOBILE_BREAKPOINT
    ? step.side.mobile
    : step.side.desktop;

  useEffect(() => setMounted(true), []);

  // Measured live: a resize, a rotation, a scroll or a card that changes
  // height all re-measure, so the hole can never drift off its element.
  const measure = useCallback(() => {
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) {
      setRect(null);
      return;
    }
    const box = element.getBoundingClientRect();
    setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
  }, [selector]);

  useLayoutEffect(() => {
    measure();

    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    const element = document.querySelector<HTMLElement>(selector);
    // The anchor may not exist yet on the very first paint after a step
    // change; watching the tree picks it up on the frame it lands.
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    const resizeObserver = new ResizeObserver(schedule);
    if (element) resizeObserver.observe(element);
    window.addEventListener("resize", schedule);
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
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [measure, selector]);

  if (!mounted) return null;

  const isMobile = viewport.width > 0 && viewport.width < MOBILE_BREAKPOINT;
  const padding = step.pointerPadding;
  const hole = rect
    ? {
        x: rect.left - padding / 2,
        y: rect.top - padding / 2,
        width: rect.width + padding,
        height: rect.height + padding,
      }
    // No anchor resolved: dim the page and centre the card rather than
    // pointing at nothing, so the recorrido always stays usable.
    : { x: viewport.width / 2, y: viewport.height / 2, width: 0, height: 0 };

  const card = cardPosition({ hole, side, viewport, isMobile });
  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
  const glide = `transform ${motionMs}ms ${ease}, width ${motionMs}ms ${ease}, height ${motionMs}ms ${ease}, top ${motionMs}ms ${ease}, left ${motionMs}ms ${ease}`;

  return createPortal(
    <div className="al-tour-layer" aria-live="polite">
      <style>{`
        .al-tour-layer { position: fixed; inset: 0; z-index: 940; pointer-events: none; }
        /* Catches stray clicks on the app underneath without freezing it:
           every control on the card stays live, and Escape always works. */
        .al-tour-catch { position: fixed; inset: 0; pointer-events: auto; }
        .al-tour-hole { position: fixed; top: 0; left: 0; will-change: transform, width, height; }
        .al-tour-anchor { position: fixed; pointer-events: auto; }
      `}</style>

      <div className="al-tour-catch" aria-hidden="true" />

      <div
        className="al-tour-hole"
        aria-hidden="true"
        style={{
          boxShadow: "0 0 200vw 200vh rgba(35, 29, 24, 0.55)",
          borderRadius: step.pointerRadius,
          transform: `translate3d(${hole.x}px, ${hole.y}px, 0)`,
          width: hole.width,
          height: hole.height,
          transition: glide,
        }}
      />

      <div
        className="al-tour-anchor"
        style={{ top: card.top, left: card.left, width: card.width, transition: glide }}
      >
        {Card({ step, index, total })}
      </div>
    </div>,
    document.body,
  );
}

// Where the card sits relative to the hole - Onborda's per-side anchoring,
// clamped so it can never leave the viewport (the original does not clamp,
// which is what pushed the card off-screen next to a control at the right
// edge). On phones it is pinned to the bottom, where a sheet belongs.
function cardPosition({
  hole,
  side,
  viewport,
  isMobile,
}: {
  hole: { x: number; y: number; width: number; height: number };
  side: TourStepSide;
  viewport: { width: number; height: number };
  isMobile: boolean;
}): { top: number; left: number; width: number } {
  if (isMobile) {
    return { left: EDGE, top: viewport.height - 260, width: viewport.width - EDGE * 2 };
  }

  const width = Math.min(CARD_WIDTH, viewport.width - EDGE * 2);
  const clampX = (value: number) => Math.min(Math.max(value, EDGE), Math.max(viewport.width - width - EDGE, EDGE));
  const clampY = (value: number) => Math.min(Math.max(value, EDGE), Math.max(viewport.height - 240, EDGE));

  const centreX = hole.x + hole.width / 2 - width / 2;
  const centreY = hole.y + hole.height / 2 - 110;

  switch (side) {
    case "left":
    case "left-top":
    case "left-bottom":
      return { left: clampX(hole.x - width - CARD_GAP), top: clampY(centreY), width };
    case "right":
    case "right-top":
    case "right-bottom":
      return { left: clampX(hole.x + hole.width + CARD_GAP), top: clampY(centreY), width };
    case "top":
      return { left: clampX(centreX), top: clampY(hole.y - 220 - CARD_GAP), width };
    case "top-left":
      return { left: clampX(hole.x), top: clampY(hole.y - 220 - CARD_GAP), width };
    case "top-right":
      return { left: clampX(hole.x + hole.width - width), top: clampY(hole.y - 220 - CARD_GAP), width };
    case "bottom-left":
      return { left: clampX(hole.x), top: clampY(hole.y + hole.height + CARD_GAP), width };
    case "bottom-right":
      return { left: clampX(hole.x + hole.width - width), top: clampY(hole.y + hole.height + CARD_GAP), width };
    case "bottom":
    default:
      return { left: clampX(centreX), top: clampY(hole.y + hole.height + CARD_GAP), width };
  }
}
