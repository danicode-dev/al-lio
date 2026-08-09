"use client";

import type { ReactNode } from "react";
import type { Store } from "@/components/guest-app";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { DashboardFocusCarousel } from "@/components/dashboard/dashboard-focus-carousel";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { DashboardNextStep } from "@/components/dashboard/dashboard-next-step";
import { DashboardProgress } from "@/components/dashboard/dashboard-progress";
import { DashboardTodo } from "@/components/dashboard/dashboard-todo";

type DashboardViewProps = {
  store: Store;
  headerActions: ReactNode;
  todo: ReactNode;
  calendar: ReactNode;
  opportunities: ReactNode;
};

export function DashboardView({ store, headerActions, todo, calendar, opportunities }: DashboardViewProps) {
  return (
    <div className="space-y-5">
      <DashboardGreeting userName={store.userName} actions={headerActions} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,1.05fr)_minmax(255px,.78fr)]">
        <DashboardTodo>{todo}</DashboardTodo>
        <DashboardNextStep roadmap={store.roadmap} />
        <DashboardCalendar>{calendar}</DashboardCalendar>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <DashboardFocusCarousel store={store} />
        <DashboardProgress roadmap={store.roadmap} />
      </div>

      {opportunities}
    </div>
  );
}
