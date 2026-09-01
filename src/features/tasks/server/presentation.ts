import type { Task } from "@/components/store/types";
import type { DbTask } from "@/lib/db/types";

export function serializeTasks(tasks: readonly DbTask[]): Task[] {
  return tasks.map((task) => ({
    ...task,
    description: task.description ?? undefined,
    due_date: ymd(task.due_date),
    due_at: ymd(task.due_date),
    category: task.category ?? "diario",
    status: task.status as Task["status"],
    priority: (task.priority ?? "media") as Task["priority"],
    reminder_at: iso(task.reminder_at),
    progress_notes: Array.isArray(task.progress_notes) ? task.progress_notes as Task["progress_notes"] : [],
    completed_at: iso(task.completed_at),
    created_at: iso(task.created_at),
    updated_at: iso(task.updated_at),
  }));
}

function iso(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }
  return String(value);
}

function ymd(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}
