import { Suspense } from "react";
import { TasksView } from "@/features/tasks";

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksView />
    </Suspense>
  );
}
