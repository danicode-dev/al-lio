"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { appendTaskNote, createTask, deleteTask, updateTask } from "@/features/tasks/server/repository";

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().nullable();
const optionalDate = z.union([z.string().date(), z.literal("")]).optional().nullable();
const optionalDateTime = z.union([z.string().datetime(), z.literal("")]).optional().nullable();
const taskStatus = z.enum(["pendiente", "en_progreso", "completada", "pospuesta", "cancelada"]);
const taskPriority = z.enum(["alta", "media", "baja", "critica"]);
const taskCategory = z.enum(["diario", "urgente", "semanal"]);

const createTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  description: optionalText(10_000),
  dueAt: optionalDate,
  reminderAt: optionalDateTime,
  priority: taskPriority.default("media"),
  status: taskStatus.default("pendiente"),
  category: taskCategory.default("diario"),
}).strict();

const updateTaskSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().trim().min(1).max(240).optional(),
    description: optionalText(10_000),
    dueAt: optionalDate,
    reminderAt: optionalDateTime,
    completedAt: optionalDateTime,
    priority: taskPriority.optional(),
    status: taskStatus.optional(),
    category: taskCategory.optional(),
  }).strict().refine((patch) => Object.keys(patch).length > 0, "empty_patch"),
}).strict();

const taskIdSchema = z.string().uuid();
const taskNoteSchema = z.object({ id: taskIdSchema, text: z.string().trim().min(1).max(4_000) }).strict();

export type TaskMutationResult =
  | { ok: true }
  | { ok: false; error: "invalid_input" | "not_found" | "save_failed" };

export async function createTaskAction(input: unknown): Promise<TaskMutationResult> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const userId = await getCurrentUserId();
  try {
    const data = parsed.data;
    await createTask(userId, {
      id: data.id,
      title: data.title,
      description: emptyToNull(data.description),
      due_date: emptyToNull(data.dueAt),
      reminder_at: emptyToNull(data.reminderAt),
      priority: data.priority === "critica" ? "alta" : data.priority,
      status: data.status,
      category: data.category,
    });
    revalidateTasks();
    return { ok: true };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}

export async function updateTaskAction(input: unknown): Promise<TaskMutationResult> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const userId = await getCurrentUserId();
  const { id, patch } = parsed.data;
  try {
    const row = await updateTask(userId, id, {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: emptyToNull(patch.description) } : {}),
      ...(patch.dueAt !== undefined ? { due_date: emptyToNull(patch.dueAt) } : {}),
      ...(patch.reminderAt !== undefined ? { reminder_at: emptyToNull(patch.reminderAt) } : {}),
      ...(patch.completedAt !== undefined ? { completed_at: emptyToNull(patch.completedAt) } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority === "critica" ? "alta" : patch.priority } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
    });
    if (!row) return { ok: false, error: "not_found" };
    revalidateTasks();
    return { ok: true };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}

export async function deleteTaskAction(input: unknown): Promise<TaskMutationResult> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const userId = await getCurrentUserId();
  try {
    if (!(await deleteTask(userId, parsed.data))) return { ok: false, error: "not_found" };
    revalidateTasks();
    return { ok: true };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}

export async function appendTaskNoteAction(input: unknown): Promise<TaskMutationResult> {
  const parsed = taskNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const userId = await getCurrentUserId();
  try {
    if (!(await appendTaskNote(userId, parsed.data.id, parsed.data.text))) {
      return { ok: false, error: "not_found" };
    }
    revalidateTasks();
    return { ok: true };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

function revalidateTasks() {
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}
