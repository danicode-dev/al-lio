"use client";

import { TaskCalendar } from "@/components/calendar/app-calendar";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { MobileHeaderActions } from "@/components/mobile-header-actions";
import { StoreProvider, useStore } from "@/components/guest-store";
import type { Store } from "@/components/guest-app";
import { getDashboardCalendarEvents } from "@/lib/dashboard/calendar-events";

export function DashboardClient({ initialStore }: { initialStore: Store }) {
  return (
    <StoreProvider initialStore={initialStore}>
      <DashboardContent />
    </StoreProvider>
  );
}

function DashboardContent() {
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
