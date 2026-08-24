"use client";

import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReturnTypeActions, Store } from "@/components/store/types";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { DashboardFocusCarousel } from "@/components/dashboard/dashboard-focus-carousel";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { DashboardNextStep } from "@/components/dashboard/dashboard-next-step";
import { DashboardProgress } from "@/components/dashboard/dashboard-progress";
import { DashboardTodo } from "@/components/dashboard/dashboard-todo";

type DashboardViewProps = {
  store: Store;
  actions: ReturnTypeActions;
  calendar: ReactNode;
};

export function DashboardView({ store, actions, calendar }: DashboardViewProps) {
  const router = useRouter();
  const loadIssues = store.loadIssues ?? [];
  const issueLabels = {
    tasks: "tareas",
    courses: "cursos",
    hackathons: "hackathons",
    opportunities: "oportunidades",
    companies: "empresas",
    roadmap: "ruta formativa",
  } as const;

  return (
    <div className="space-y-5">
      <DashboardGreeting userName={store.userName} />

      {loadIssues.length > 0 && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold">Parte del Dashboard no se ha podido cargar</p>
              <p className="mt-0.5 text-xs leading-5 text-amber-800">
                Revisa {loadIssues.map((issue) => issueLabels[issue]).join(", ")}. El resto de la información sigue disponible.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => router.refresh()} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 transition hover:bg-amber-100">
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </button>
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(300px,1.08fr)_minmax(350px,1.14fr)_minmax(260px,.78fr)]">
        <DashboardTodo store={store} actions={actions} />
        <DashboardNextStep roadmap={store.roadmap} loadFailed={loadIssues.includes("roadmap")} />
        <DashboardCalendar loadFailed={loadIssues.some((issue) => ["tasks", "courses", "hackathons", "opportunities"].includes(issue))}>{calendar}</DashboardCalendar>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <DashboardFocusCarousel store={store} />
        <DashboardProgress roadmap={store.roadmap} loadFailed={loadIssues.includes("roadmap")} />
      </div>
    </div>
  );
}
