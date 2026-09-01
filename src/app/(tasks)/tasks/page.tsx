import { Suspense } from "react";

import { TasksLoading, TasksView } from "@/features/tasks";

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksLoading />}>
      <TasksView />
    </Suspense>
  );
}
