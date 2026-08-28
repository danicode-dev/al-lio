import { Suspense } from "react";
import { TasksView } from "@/components/tasks/tasks-view";

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksView />
    </Suspense>
  );
}
