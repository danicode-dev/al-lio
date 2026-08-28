// The tour, as data. Four steps, all of them on the dashboard: the tour points
// at the interface and explains it, and never navigates, opens a dialog,
// presses a control or creates content. Driving the app's own surfaces turned
// out to break them, and the value here is the explanation, not the remote
// control - so the tour points, and the student clicks when they want.
//
// No JSX and no DOM access here, so the whole recorrido can be asserted in a
// plain unit test.

export type TourViewport = "desktop" | "mobile";

export type ProductTourStep = {
  id: string;
  title: string;
  body: string;
  /**
   * Anchors, per viewport. Both must resolve to something already on screen:
   * on a phone the destinations live behind the menu button, and the tour
   * points at that button rather than opening the sheet.
   *
   * Omitted on a step that talks about the app as a whole - it then shows a
   * centred card over a plain dimmed page, with nothing spotlighted.
   */
  selector?: Record<TourViewport, string>;
  /** Which side of the anchor the card sits on, per viewport. */
  side?: Record<TourViewport, TourStepSide>;
  /** Spotlight geometry. Small values: these anchors are real controls. */
  pointerPadding?: number;
  pointerRadius?: number;
  /**
   * On a phone, open the navigation sheet before this step and keep it open
   * while it runs. The destinations live behind that button, so pointing at
   * a closed menu explained nothing.
   */
  opensMobileMenu?: boolean;
  /** The closing beat: celebrated, and it ends the recorrido. */
  finale?: boolean;
};

export type TourStepSide =
  | "top" | "bottom" | "left" | "right"
  | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  | "left-top" | "left-bottom" | "right-top" | "right-bottom";

export const PRODUCT_TOUR_NAME = "product-tour";

// On a phone the tour opens the navigation sheet, and then highlights the
// same three blocks the sidebar shows on a desktop - the sheet repeats those
// groups under the same headings, so both formats explain the app the same
// way and the tour points at the same thing in each.

export const productTourSteps: ProductTourStep[] = [
  {
    id: "quick-add",
    title: "Añade lo que necesites",
    body: "Desde aquí puedes crear rápidamente tareas, cursos, eventos y retos sin salir de lo que estés haciendo.",
    selector: { desktop: "[data-tour='quick-add']", mobile: "[data-tour='quick-add-mobile']" },
    // The button lives at the top right corner, so the card hangs below it and
    // aligned to its right edge - centred underneath would overflow the page.
    side: { desktop: "bottom-right", mobile: "bottom-right" },
    pointerPadding: 10,
    pointerRadius: 16,
  },
  {
    id: "nav-principal",
    title: "Tu espacio principal",
    body: "Inicio reúne de un vistazo tu To-do, tu ruta, próximos pasos, calendario y progreso. Desde este bloque también puedes acceder a Competencias, Tareas y Bloc.",
    selector: { desktop: "[data-tour='nav-principal']", mobile: "[data-tour='mobile-nav-principal']" },
    side: { desktop: "right", mobile: "bottom-left" },
    pointerPadding: 12,
    pointerRadius: 18,
    opensMobileMenu: true,
  },
  {
    id: "nav-communication",
    title: "Oportunidades e información",
    body: "En Noticias encontrarás información relevante y en Trabajo podrás consultar oportunidades relacionadas con tu perfil y formación.",
    selector: { desktop: "[data-tour='nav-communication']", mobile: "[data-tour='mobile-nav-communication']" },
    side: { desktop: "right", mobile: "bottom-left" },
    pointerPadding: 12,
    pointerRadius: 18,
    opensMobileMenu: true,
  },
  {
    id: "nav-learning",
    title: "Todo para seguir avanzando",
    body: "Aquí tienes tus cursos, eventos y retos, y el calendario para organizar las próximas fechas importantes.",
    selector: { desktop: "[data-tour='nav-learning']", mobile: "[data-tour='mobile-nav-learning']" },
    side: { desktop: "right", mobile: "bottom-left" },
    pointerPadding: 12,
    pointerRadius: 18,
    opensMobileMenu: true,
  },
  {
    id: "finale",
    title: "¡Listo, ya lo tienes!",
    body: "Has terminado el recorrido. AL-LÍO es tuyo: crea lo que necesites, revisa tu ruta y vuelve a Inicio siempre que quieras ver lo importante de un vistazo.",
    finale: true,
  },
];

export const PRODUCT_TOUR_LENGTH = productTourSteps.length;

// Resuming lands on the stored step; anything unknown starts over rather than
// dropping the student into the middle of a recorrido they never saw.
export function findStepIndex(stepId: string | null | undefined): number {
  if (!stepId) return 0;
  const index = productTourSteps.findIndex((step) => step.id === stepId);
  return index >= 0 ? index : 0;
}

export function stepIdAt(index: number): string {
  return productTourSteps[Math.min(Math.max(index, 0), PRODUCT_TOUR_LENGTH - 1)].id;
}

export function isLastStep(index: number): boolean {
  return index >= PRODUCT_TOUR_LENGTH - 1;
}

// What every control on the card means: which index the tour moves to and
// which piece of state has to be persisted. The provider only executes these
// decisions, so "does finishing mark it completed" is a unit test over this
// module rather than something only a browser could answer. It lives here,
// next to the steps, so the whole recorrido stays one dependency-free file.
export type TourIntent = "next" | "previous" | "skip";

export type TourTransition =
  /** Move the visible step and remember where the student got to. */
  | { kind: "move"; index: number; stepId: string }
  /** The recorrido is over. */
  | { kind: "complete" }
  /** The student stepped out of it. */
  | { kind: "skip" };

export function resolveTransition(intent: TourIntent, currentIndex: number): TourTransition {
  if (intent === "skip") return { kind: "skip" };

  if (intent === "previous") {
    // Already on the first step: there is nowhere back to go, and going back
    // must never close the tour by accident.
    const index = Math.max(0, currentIndex - 1);
    return { kind: "move", index, stepId: stepIdAt(index) };
  }

  const index = currentIndex + 1;
  if (index >= PRODUCT_TOUR_LENGTH) return { kind: "complete" };
  return { kind: "move", index, stepId: stepIdAt(index) };
}
