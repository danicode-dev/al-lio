"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { toggleCourseFavorite } from "@/lib/db/repositories/courses";

export async function toggleCourseFavoriteAction(
  courseId: string
): Promise<{ error: string | null; isFavorite: boolean | null }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const isFavorite = await toggleCourseFavorite(session.uid, courseId);
    if (isFavorite === null) return { error: "course_not_found", isFavorite: null };
    return { error: null, isFavorite };
  } catch {
    return { error: "favorite_save_failed", isFavorite: null };
  }
}
