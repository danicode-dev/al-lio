"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { ProductTourStep, TourStepSide } from "@/lib/onboarding/tour-steps";
import { cardPosition, centredCard } from "@/components/onboarding/tour/tour-spotlight-geometry";
import { TourFireworks } from "@/components/onboarding/tour/tour-fireworks";
import { useTourTargetGeometry } from "@/components/onboarding/tour/use-tour-target-geometry";

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
// writes. Nothing is clicked, opened or moved. The live DOM measurement lives
// in use-tour-target-geometry; the pure card positioning in
// tour-spotlight-geometry; the finale in tour-fireworks. This file composes
// them into the portal.

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
  // The card's own height, measured rather than assumed, so a centred card is
  // actually centred whatever its text turns out to be.
  const [cardHeight, setCardHeight] = useState(200);
  const cardRef = useRef<HTMLDivElement>(null);

  const { viewport, rect, onPhone } = useTourTargetGeometry(step);
  const side: TourStepSide = step.side
    ? (onPhone ? step.side.mobile : step.side.desktop)
    : "bottom";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      const height = node.getBoundingClientRect().height;
      if (height > 0) setCardHeight(height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted]);

  if (!mounted) return null;

  const padding = step.pointerPadding ?? 12;
  const hole = rect
    ? {
        x: rect.left - padding / 2,
        y: rect.top - padding / 2,
        width: rect.width + padding,
        height: rect.height + padding,
      }
    // No anchor - either a step that talks about the app as a whole, or one
    // whose element is not on screen. The page is dimmed and the card is
    // centred rather than pointing at nothing, so the recorrido stays usable.
    : { x: viewport.width / 2, y: viewport.height / 2, width: 0, height: 0 };

  const centred = !rect;
  const card = centred
    ? centredCard(viewport, cardHeight)
    : cardPosition({ hole, side, viewport, isMobile: onPhone });
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
          borderRadius: step.pointerRadius ?? 18,
          transform: `translate3d(${hole.x}px, ${hole.y}px, 0)`,
          width: hole.width,
          height: hole.height,
          transition: glide,
        }}
      />

      {step.finale && <TourFireworks muted={motionMs === 0} />}

      <div
        ref={cardRef}
        className="al-tour-anchor"
        style={{ top: card.top, left: card.left, width: card.width, transition: glide }}
      >
        {Card({ step, index, total })}
      </div>
    </div>,
    document.body,
  );
}
