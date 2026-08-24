"use client";

import { TaskCalendar } from "@/components/calendar/app-calendar";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { MobileHeaderActions } from "@/components/mobile-header-actions";
import { useStore } from "@/components/guest-store";
import { getDashboardCalendarEvents } from "@/lib/dashboard/calendar-events";

export function DashboardClient() {
  const { store, actions } = useStore();
  return (
    <DashboardView
      store={store}
      actions={actions}
      headerActions={<MobileHeaderActions />}
      calendar={<TaskCalendar events={getDashboardCalendarEvents(store)} />}
    />
  );
}
