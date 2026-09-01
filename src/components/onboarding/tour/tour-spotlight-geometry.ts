import type { TourStepSide } from "@/lib/onboarding/tour-steps";

// Pure positioning for the tour spotlight: the constants Onborda's per-side
// anchoring needs, the shape of a measured rectangle, and the two functions
// that turn a hole (plus a side) into a card box. No DOM, no React - the
// measurement that feeds these lives in use-tour-target-geometry.

export type Rect = { top: number; left: number; width: number; height: number };

const CARD_WIDTH = 320;
const CARD_GAP = 16;
const EDGE = 12;
export const MOBILE_BREAKPOINT = 768;

// A step with nothing to point at: the card sits in the middle of the screen,
// which is also where the closing beat belongs.
export function centredCard(
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
export function cardPosition({
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
