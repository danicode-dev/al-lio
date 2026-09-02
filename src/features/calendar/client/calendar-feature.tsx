"use client";

import { CalendarView } from "@/components/calendar/app-calendar";
import { useApplicationStore } from "@/shared/store/application-store";
import { StudentHeaderActions } from "@/components/student-header-actions";
import { GoogleCalendarStatusControl } from "./google-calendar-status";
import { getCalendarEvents } from "./calendar-event-source";

export function CalendarFeature() {
  const { store } = useApplicationStore();
  return (
    <div className="space-y-6 pb-6">
      <CalendarView
        events={getCalendarEvents(store)}
        completedTasks={store.tasks}
        headerActions={<StudentHeaderActions />}
        calendarStatus={<GoogleCalendarStatusControl />}
      />
    </div>
  );
}
