import type { TourUiCommand } from "@/components/onboarding/tour/tour-ui-bus";

export type TourViewport = "desktop" | "mobile";

// What a step can do. Everything a step is allowed to touch arrives here, so
// the step list stays declarative data and never reaches for the DOM, the
// router or the store on its own.
export type TourStepContext = {
  viewport: TourViewport;
  signal: AbortSignal;
  /** Navigates and resolves once the new route has actually committed. */
  navigate: (href: string) => Promise<void>;
  /** Asks a subscribed component to perform a real UI action. */
  ui: (command: TourUiCommand) => Promise<void>;
  /** Resolves with the node, or null once the recovery ceiling is reached. */
  waitForElement: (selector: string, timeoutMs?: number) => Promise<HTMLElement | null>;
  /** Deliberate pacing beat. Collapses to zero under prefers-reduced-motion. */
  beat: (ms?: number) => Promise<void>;
  /** Creates a task through the same store action the + dialog uses. */
  createDemoTask: (input: { title: string; description?: string; dueAt?: string }) => Promise<string | null>;
  /** Creates a Bloc note through the same action the Bloc editor uses. */
  createDemoNote: (input: { title: string; body: string }) => Promise<string | null>;
};

export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export type TourStep = {
  id: string;
  title: string;
  body: string;
  /** Route the step needs. The engine navigates and waits before running it. */
  route?: string;
  /**
   * CSS selector for the element to spotlight. Resolved after `enter`, so a
   * step can open a menu first and then point inside it. Omitted (or never
   * found) means a centred callout with no spotlight.
   */
  target?: string | ((viewport: TourViewport) => string | undefined);
  placement?: TourPlacement;
  /** Runs before the callout appears - open menus, create data, scroll. */
  enter?: (context: TourStepContext) => Promise<void>;
  /** Runs when leaving in either direction - close what `enter` opened. */
  exit?: (context: TourStepContext) => Promise<void>;
  /**
   * Advances by itself once `enter` resolves, with no Siguiente button. Used
   * for the beats that are pure demonstration.
   */
  autoAdvanceMs?: number;
};
