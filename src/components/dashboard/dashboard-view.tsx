"use client";

import type { ReactNode } from "react";
import type { ReturnTypeActions, Store } from "@/components/guest-app";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { DashboardFocusCarousel } from "@/components/dashboard/dashboard-focus-carousel";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { DashboardNextStep } from "@/components/dashboard/dashboard-next-step";
import { DashboardProgress } from "@/components/dashboard/dashboard-progress";
import { DashboardTodo } from "@/components/dashboard/dashboard-todo";

type DashboardViewProps = {
  store: Store;
  actions: ReturnTypeActions;
  headerActions: ReactNode;
  calendar: ReactNode;
};

export function DashboardView({ store, actions, headerActions, calendar }: DashboardViewProps) {
  return (
    <div className="space-y-5">
      <DashboardGreeting userName={store.userName} actions={headerActions} />

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,1.08fr)_minmax(350px,1.14fr)_minmax(260px,.78fr)]">
        <DashboardTodo store={store} actions={actions} />
        <DashboardNextStep roadmap={store.roadmap} />
        <DashboardCalendar>{calendar}</DashboardCalendar>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <DashboardFocusCarousel store={store} />
        <DashboardProgress roadmap={store.roadmap} />
      </div>
    </div>
  );
}
