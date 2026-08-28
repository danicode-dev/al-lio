export type TourViewport = "desktop" | "mobile";

// What a step can do. Everything a step is allowed to touch arrives here, so
// the step list stays declarative data and never reaches for the DOM, the
// router or the store on its own.
//
// Deliberately small: the tour explains the interface rather than operating
// it, so there is nothing here for opening menus or dialogs. The one real
// side effect is creating the example task.
export type TourStepContext = {
  viewport: TourViewport;
  signal: AbortSignal;
  /** Navigates and resolves once the new route has actually committed. */
  navigate: (href: string) => Promise<void>;
  /** Resolves with the node, or null once the recovery ceiling is reached. */
  waitForElement: (selector: string, timeoutMs?: number) => Promise<HTMLElement | null>;
  /** Deliberate pacing beat. Collapses to zero under prefers-reduced-motion. */
  beat: (ms?: number) => Promise<void>;
  /** Creates a task through the same store action the + dialog uses. */
  createDemoTask: (input: { title: string; description?: string; dueAt?: string }) => Promise<string | null>;
};

export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export type TourStep = {
  id: string;
  title: string;
  body: string;
  /** Route the step needs. The engine navigates and waits before running it. */
  route?: string;
  /**
   * CSS selector for the element to point at. Omitted (or never found) means a
   * centred callout with no pointer and no spotlight.
   */
  target?: string | ((viewport: TourViewport) => string | undefined);
  placement?: TourPlacement;
  /**
   * Plays the pointer's press animation on arrival. Purely visual - it never
   * dispatches an event, so it cannot break whatever it is pointing at.
   */
  pointerClick?: boolean;
  /** Runs before the callout appears. Only the example task uses it. */
  enter?: (context: TourStepContext) => Promise<void>;
  /** Runs when leaving in either direction. */
  exit?: (context: TourStepContext) => Promise<void>;
};
