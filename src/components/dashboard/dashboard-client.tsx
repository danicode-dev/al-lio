"use client";

import { TaskCalendar } from "@/components/calendar/app-calendar";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { useTaskActions } from "@/features/tasks/client";
import { useApplicationStore } from "@/shared/store/application-store";
import { getDashboardCalendarEvents } from "@/lib/dashboard/calendar-events";

export function DashboardClient() {
  const { store } = useApplicationStore();
  const actions = useTaskActions();
  return (
    <DashboardView
      store={store}
      actions={actions}
      calendar={<TaskCalendar events={getDashboardCalendarEvents(store)} />}
    />
  );
}
