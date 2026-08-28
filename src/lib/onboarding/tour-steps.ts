import type { TourStep, TourViewport } from "@/lib/onboarding/types";

// The tour, as data. No JSX and no DOM access here - every effect a step needs
// arrives through TourStepContext, so reordering, adding or removing a beat is
// an edit to this array and nothing else.
//
// Desktop highlights a sidebar entry directly; on a phone the sidebar does not
// exist, so the same goal needs the menu opened first, the spotlight moved
// inside it, and the menu closed afterwards. That difference is expressed per
// step rather than by shrinking the desktop flow.

const DEMO_TASK_TITLE = "Entregar proyecto de programación";
const DEMO_NOTE_TITLE = "Idea para el proyecto";

function inFiveDays(): string {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return date.toISOString().slice(0, 10);
}

// Opens the phone menu, points at a destination inside it, then navigates and
// closes it. On desktop the sidebar entry is already on screen, so this is a
// plain navigation.
async function goToSection(
  context: Parameters<NonNullable<TourStep["enter"]>>[0],
  href: string,
  navSelector: string,
) {
  if (context.viewport === "mobile") {
    await context.ui({ type: "mobile-menu:open" });
    await context.waitForElement(navSelector, 3_000);
    await context.beat(600);
  }
  await context.navigate(href);
  if (context.viewport === "mobile") {
    await context.ui({ type: "mobile-menu:close" });
  }
}

export const productTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Bienvenido a AL-LÍO",
    body: "Antes de empezar te enseñamos cómo funciona usándolo contigo. Tardamos un minuto.",
    placement: "center",
    route: "/dashboard",
  },
  {
    id: "dashboard",
    title: "Este es tu punto de partida",
    body: "AL-LÍO reúne aquí lo que necesitas para seguir: lo que tienes pendiente, lo que viene y por dónde ibas.",
    route: "/dashboard",
    target: "[data-tour='dashboard-main']",
    placement: "bottom",
  },
  {
    id: "quick-add",
    title: "Todo se crea desde aquí",
    body: "Este botón da de alta una tarea, un curso o un reto sin salir de donde estás. Vamos a usarlo.",
    target: (viewport: TourViewport) =>
      viewport === "mobile" ? "[data-tour='quick-add-mobile']" : "[data-tour='quick-add']",
    placement: "bottom",
  },
  {
    id: "create-task",
    title: "Creando tu primera tarea",
    body: "Rellenamos el formulario real y la guardamos. Es exactamente lo que harías tú.",
    placement: "center",
    async enter(context) {
      // The real dialog, opened through the same state a click sets, so the
      // student watches the actual flow rather than a mock-up.
      await context.ui({
        type: "quick-add:open",
        prefill: { title: DEMO_TASK_TITLE, notes: "Repasar la parte de autenticación y preparar la demo." },
      });
      await context.waitForElement("[data-tour='quick-add-dialog']", 4_000);
      await context.beat(1_200);
      // Persisted through the store action the dialog's own submit calls -
      // one create path, not a second one written for the tour.
      await context.createDemoTask({
        title: DEMO_TASK_TITLE,
        description: "Repasar la parte de autenticación y preparar la demo.",
        dueAt: inFiveDays(),
      });
      await context.ui({ type: "quick-add:close" });
    },
    autoAdvanceMs: 900,
  },
  {
    id: "task-created",
    title: "Listo, ya tienes tu primera tarea",
    body: "Puedes editarla, completarla o borrarla cuando quieras. Es una tarea de ejemplo, así que no pasa nada por trastear con ella.",
    route: "/tasks",
    target: "[data-tour='tasks-list']",
    placement: "top",
    async enter(context) {
      await goToSection(context, "/tasks", "[data-tour='nav-tasks']");
      await context.waitForElement("[data-tour='tasks-list']", 5_000);
    },
  },
  {
    id: "competencias",
    title: "Aquí ves lo que estás aprendiendo",
    body: "Competencias reúne lo que tu ciclo espera de ti y por dónde vas. Es tu mapa para saber qué toca después.",
    route: "/roadmap",
    target: "[data-tour='roadmap-main']",
    placement: "top",
    async enter(context) {
      await goToSection(context, "/roadmap", "[data-tour='nav-roadmap']");
      await context.waitForElement("[data-tour='roadmap-main']", 5_000);
    },
  },
  {
    id: "bloc",
    title: "Y esto es para escribir rápido",
    body: "Cuando necesites guardar algo sin pensarlo, el Bloc. Te dejamos una nota de ejemplo creada.",
    route: "/bloc",
    target: "[data-tour='bloc-main']",
    placement: "top",
    async enter(context) {
      await goToSection(context, "/bloc", "[data-tour='nav-bloc']");
      await context.waitForElement("[data-tour='bloc-main']", 5_000);
      await context.beat(500);
      await context.createDemoNote({
        title: DEMO_NOTE_TITLE,
        body: "Revisar autenticación y preparar la presentación.",
      });
    },
  },
  {
    id: "finish",
    title: "Ya sabes moverte por AL-LÍO",
    body: "Ahora empieza a organizarlo a tu manera. Puedes repetir este recorrido cuando quieras desde tu perfil.",
    placement: "center",
    route: "/dashboard",
    async enter(context) {
      await goToSection(context, "/dashboard", "[data-tour='nav-dashboard']");
    },
  },
];

export function findStepIndex(stepId: string | null): number {
  if (!stepId) return 0;
  const index = productTourSteps.findIndex((step) => step.id === stepId);
  return index >= 0 ? index : 0;
}
