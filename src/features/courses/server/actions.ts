"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth/current-user";
import { createCourse, toggleCourseFavorite, updateCourseStatus } from "@/features/courses/server/repository";

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().nullable();
const optionalUrl = z.union([z.string().trim().url().max(2_000), z.literal("")]).optional().nullable();
const optionalDate = z.union([z.string().date(), z.literal("")]).optional().nullable();
const courseStatus = z.enum(["pendiente", "empezado", "terminado", "pausado", "descartado"]);

const createCourseSchema = z.object({
  id: z.string().uuid(),
  idSlug: optionalText(240),
  title: z.string().trim().min(1).max(300),
  platform: optionalText(200),
  url: optionalUrl,
  category: optionalText(120),
  status: courseStatus.default("pendiente"),
  startAt: optionalDate,
  deadlineAt: optionalDate,
  notes: optionalText(20_000),
}).strict();

const completeCourseSchema = z.object({ id: z.string().uuid() }).strict();
const courseIdSchema = z.string().uuid();

export type CourseMutationResult =
  | { ok: true }
  | { ok: false; error: "invalid_input" | "not_found" | "save_failed" };

export async function createCourseAction(input: unknown): Promise<CourseMutationResult> {
  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const userId = await getCurrentUserId();
  try {
    const data = parsed.data;
    await createCourse(userId, {
      id: data.id,
      id_slug: emptyToNull(data.idSlug),
      title: data.title,
      platform: emptyToNull(data.platform),
      url: emptyToNull(data.url),
      category: emptyToNull(data.category),
      status: data.status,
      start_date: emptyToNull(data.startAt),
      deadline: emptyToNull(data.deadlineAt),
      notes: emptyToNull(data.notes),
    });
    revalidateCourses();
    return { ok: true };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}

export async function completeCourseAction(input: unknown): Promise<CourseMutationResult> {
  const parsed = completeCourseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const userId = await getCurrentUserId();
  try {
    if (!(await updateCourseStatus(userId, parsed.data.id, "terminado"))) {
      return { ok: false, error: "not_found" };
    }
    revalidateCourses();
    return { ok: true };
  } catch {
    return { ok: false, error: "save_failed" };
  }
}

export async function toggleCourseFavoriteAction(
  input: unknown,
): Promise<{ error: string | null; isFavorite: boolean | null }> {
  const parsed = courseIdSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input", isFavorite: null };
  const userId = await getCurrentUserId();
  try {
    const isFavorite = await toggleCourseFavorite(userId, parsed.data);
    if (isFavorite === null) return { error: "course_not_found", isFavorite: null };
    revalidateCourses();
    return { error: null, isFavorite };
  } catch {
    return { error: "favorite_save_failed", isFavorite: null };
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

function revalidateCourses() {
  revalidatePath("/courses");
  revalidatePath("/calendar");
}
