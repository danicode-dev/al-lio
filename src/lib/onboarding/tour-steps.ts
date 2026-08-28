import type { TourStep, TourViewport } from "@/lib/onboarding/types";

// The tour, as data. No JSX and no DOM access here - every effect a step needs
// arrives through TourStepContext, so reordering, adding or removing a beat is
// an edit to this array and nothing else.
//
// Everything happens on the dashboard and nothing is opened or navigated: the
// pointer moves over the real interface and explains it. Driving the app's own
// dialogs and menus turned out to break them (a menu that opens under an
// overlay it did not expect), and the value here is the explanation, not the
// remote control - so the tour points, and the student clicks when they want.
// The single exception is the example task, which is genuinely created.

const DEMO_TASK_TITLE = "Preparar la entrega de esta semana";

function inThreeDays(): string {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
}

export const productTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Bienvenido a AL-LÍO",
    body: "Te enseñamos en un minuto lo que puedes hacer aquí. No tocamos nada tuyo.",
    placement: "center",
    route: "/dashboard",
  },
  {
    id: "dashboard",
    title: "Tu punto de partida",
    body: "El inicio reúne lo que tienes pendiente, lo que viene por fecha y por dónde ibas en tu ciclo. Si solo abres una pantalla al día, que sea esta.",
    route: "/dashboard",
    target: "[data-tour='dashboard-main']",
    placement: "bottom",
  },
  {
    id: "todo",
    title: "Lo que tienes pendiente",
    body: "Aquí aparece lo último que has añadido. Puedes completarlo o abrirlo sin salir del inicio.",
    target: "[data-tour='dashboard-todo']",
    placement: "top",
  },
  {
    id: "quick-add",
    title: "Añadir a mano",
    body: "Con este botón das de alta una tarea, un curso o un evento en cualquier momento, estés en la pantalla que estés.",
    target: (viewport: TourViewport) =>
      viewport === "mobile" ? "[data-tour='quick-add-mobile']" : "[data-tour='quick-add']",
    placement: "bottom",
    pointerClick: true,
  },
  {
    id: "navigation",
    title: "Todo lo demás",
    body: "Competencias es tu ciclo y lo que se espera de ti. Tareas y Bloc, para organizarte y escribir. Cursos, Eventos y Trabajo traen lo que sale fuera. Calendario lo junta todo por fecha.",
    target: (viewport: TourViewport) =>
      viewport === "mobile" ? "[data-tour='mobile-menu-trigger']" : "[data-tour='nav-roadmap']",
    placement: "right",
  },
  {
    id: "demo-task",
    title: "Te dejamos una para empezar",
    body: "Esta tarea es de ejemplo: edítala, complétala o bórrala cuando quieras. Ya sabes moverte por AL-LÍO.",
    target: "[data-tour='dashboard-todo']",
    placement: "top",
    pointerClick: true,
    async enter(context) {
      // Created through the same store action the + dialog calls, and marked
      // by origin so it is never confused with the student's own work.
      await context.createDemoTask({
        title: DEMO_TASK_TITLE,
        description: "Revisa lo que tienes que entregar y repártelo en lo que queda de semana.",
        dueAt: inThreeDays(),
      });
      await context.beat(400);
    },
  },
];

export function findStepIndex(stepId: string | null): number {
  if (!stepId) return 0;
  const index = productTourSteps.findIndex((step) => step.id === stepId);
  return index >= 0 ? index : 0;
}
