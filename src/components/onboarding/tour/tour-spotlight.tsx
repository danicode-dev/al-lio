"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  // The card's own height, measured rather than assumed, so a centred card is
  // actually centred whatever its text turns out to be.
  const [cardHeight, setCardHeight] = useState(200);
  const cardRef = useRef<HTMLDivElement>(null);
  const onPhone = viewport.width > 0 && viewport.width < MOBILE_BREAKPOINT;
  const selector = step.selector
    ? (onPhone ? step.selector.mobile : step.selector.desktop)
    : null;
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
      for (const timer of settle) window.clearTimeout(timer);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [measure, selector]);

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

// Three bursts of sparks behind the closing card. Pure CSS, drawn on a layer
// that ignores the pointer, and skipped entirely under reduced motion - a
// celebration should never be the thing that makes the app unusable.
function TourFireworks({ muted }: { muted: boolean }) {
  if (muted) return null;

  const bursts = [
    { left: "18%", top: "22%", delay: 0, hue: "#E15D2D", size: 16 },
    { left: "80%", top: "18%", delay: 0.35, hue: "#e8b04b", size: 14 },
    { left: "50%", top: "12%", delay: 0.7, hue: "#1f7a4d", size: 15 },
    { left: "26%", top: "74%", delay: 1.05, hue: "#e8b04b", size: 14 },
    { left: "76%", top: "70%", delay: 1.4, hue: "#E15D2D", size: 16 },
  ];
  const sparks = 18;

  return (
    <div className="al-tour-fireworks" aria-hidden="true">
      <style>{`
        .al-tour-fireworks { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
        .al-tour-burst { position: absolute; width: 0; height: 0; }
        .al-tour-flash {
          position: absolute;
          width: 26px; height: 26px; margin: -13px 0 0 -13px;
          border-radius: 999px;
          opacity: 0;
          animation: al-tour-flash 2200ms ease-out infinite;
        }
        .al-tour-spark {
          position: absolute;
          border-radius: 999px;
          opacity: 0;
          animation: al-tour-spark 2200ms cubic-bezier(0.1, 0.75, 0.25, 1) infinite;
        }
        @keyframes al-tour-flash {
          0%   { transform: scale(0.2); opacity: 0; }
          6%   { transform: scale(1.6); opacity: .95; }
          22%  { transform: scale(2.4); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes al-tour-spark {
          0%   { transform: translate3d(0, 0, 0) scale(1); opacity: 0; }
          6%   { opacity: 1; }
          55%  { opacity: 1; }
          100% { transform: translate3d(var(--dx), var(--dy), 0) scale(0.5); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .al-tour-fireworks { display: none; } }
      `}</style>
      {bursts.map((burst) => (
        <div key={burst.left} className="al-tour-burst" style={{ left: burst.left, top: burst.top }}>
          <span
            className="al-tour-flash"
            style={{
              background: `radial-gradient(circle, ${burst.hue} 0%, transparent 70%)`,
              animationDelay: `${burst.delay}s`,
            }}
          />
          {Array.from({ length: sparks }, (_, index) => {
            const angle = (index / sparks) * Math.PI * 2;
            const distance = 150 + (index % 3) * 55;
            const size = burst.size - (index % 3) * 3;
            return (
              <span
                key={index}
                className="al-tour-spark"
                style={{
                  width: size,
                  height: size,
                  margin: `${-size / 2}px 0 0 ${-size / 2}px`,
                  background: burst.hue,
                  boxShadow: `0 0 14px 3px ${burst.hue}`,
                  animationDelay: `${burst.delay + (index % 3) * 0.04}s`,
                  ["--dx" as string]: `${Math.cos(angle) * distance}px`,
                  ["--dy" as string]: `${Math.sin(angle) * distance}px`,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// A step with nothing to point at: the card sits in the middle of the screen,
// which is also where the closing beat belongs.
function centredCard(
  viewport: { width: number; height: number },
  cardHeight: number,
): { top: number; left: number; width: number } {
  const width = Math.min(380, Math.max(viewport.width - EDGE * 2, 240));
  return {
    left: Math.max((viewport.width - width) / 2, EDGE),
    top: Math.max((viewport.height - cardHeight) / 2, EDGE),
    width,
  };
}

// Where the card sits relative to the hole - Onborda's per-side anchoring,
// clamped so it can never leave the viewport (the original does not clamp,
// which is what pushed the card off-screen next to a control at the right
// edge).
//
// On a phone the card follows the hole too, instead of being parked at the
// bottom of the screen for every step: it sits under the highlighted control
// when there is room below it, and above it otherwise, so the student can see
// what is being pointed at and the card never covers it.
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
    const width = viewport.width - EDGE * 2;
    const below = hole.y + hole.height + CARD_GAP;
    const roomBelow = viewport.height - below;
    const top = roomBelow > 250
      ? below
      : Math.max(hole.y - 250 - CARD_GAP, EDGE);
    return { left: EDGE, top, width };
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
