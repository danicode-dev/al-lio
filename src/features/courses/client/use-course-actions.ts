"use client";

import { toast } from "sonner";

import type { Course } from "@/components/store/types";
import { completeCourseAction, createCourseAction, toggleCourseFavoriteAction } from "@/features/courses/server/actions";
import { markLearningResourceStatusAction } from "@/features/learning/server/actions";
import { useApplicationStore } from "@/shared/store/application-store";

export type CourseActions = {
  addCourse: (data: Omit<Course, "id" | "created_at">) => Promise<void>;
  completeCourse: (course: Course) => Promise<void>;
  toggleCourseFavorite: (id: string) => void;
};

function patchCourse(items: Course[], id: string, data: Partial<Course>) {
  return items.map((item) => item.id === id ? { ...item, ...data } : item);
}

export function useCourseActions(): CourseActions {
  const { store, setStore } = useApplicationStore();
  return {
    addCourse: async (data) => {
      const id = crypto.randomUUID();
      setStore((current) => ({
        ...current,
        courses: [{ id, created_at: new Date().toISOString(), ...data }, ...current.courses],
      }));
      try {
        const response = await createCourseAction({
          id,
          title: data.title,
          platform: data.platform,
          url: data.url,
          startAt: data.start_at,
          deadlineAt: data.deadline_at,
          status: data.status,
          notes: data.notes,
        });
        if (!response.ok) throw new Error(response.error);
        toast.success("Curso añadido");
      } catch (error) {
        setStore((current) => ({ ...current, courses: current.courses.filter((course) => course.id !== id) }));
        toast.error("Error al añadir el curso");
        throw error;
      }
    },
    completeCourse: async (course) => {
      if (course.sourceTable === "fp_content_items") {
        if (!course.id_slug) throw new Error("Missing id_slug for FP course completion");
        const previous = store.fpContent.find((item) => item.id_slug === course.id_slug);
        setStore((current) => ({
          ...current,
          fpContent: current.fpContent.map((item) => item.id_slug === course.id_slug
            ? { ...item, user_status: "completed", user_completed_at: new Date().toISOString() }
            : item),
        }));
        try {
          const result = await markLearningResourceStatusAction({ idSlug: course.id_slug, status: "completed" });
          if (result.error) throw new Error(result.error);
          toast.success("Curso completado");
        } catch (error) {
          setStore((current) => ({
            ...current,
            fpContent: current.fpContent.map((item) => item.id_slug === course.id_slug
              ? { ...item, user_status: previous?.user_status, user_completed_at: previous?.user_completed_at }
              : item),
          }));
          toast.error("No se pudo completar el curso");
          throw error;
        }
        return;
      }

      if (course.sourceTable === "tech_opportunities") {
        const existing = course.id_slug ? store.courses.find((item) => item.id_slug === course.id_slug) : undefined;
        if (existing) return completeOwnedCourse(existing, store.courses, setStore);

        const id = crypto.randomUUID();
        const notes = [course.notes, "Marcado como terminado desde AL-LÍO."].filter(Boolean).join("\n\n");
        setStore((current) => ({
          ...current,
          courses: [{ ...course, id, created_at: new Date().toISOString(), status: "terminado", sourceTable: undefined, notes }, ...current.courses],
        }));
        try {
          const response = await createCourseAction({
            id,
            idSlug: course.id_slug,
            title: course.title,
            platform: course.platform,
            url: course.url,
            startAt: course.start_at,
            deadlineAt: course.deadline_at,
            status: "terminado",
            notes,
          });
          if (!response.ok) throw new Error(response.error);
          toast.success("Curso completado");
        } catch (error) {
          setStore((current) => ({ ...current, courses: current.courses.filter((item) => item.id !== id) }));
          toast.error("No se pudo completar el curso");
          throw error;
        }
        return;
      }

      await completeOwnedCourse(course, store.courses, setStore);
    },
    toggleCourseFavorite: (id) => {
      const nextValue = !store.courses.find((course) => course.id === id)?.is_favorite;
      setStore((current) => ({
        ...current,
        courses: current.courses.map((course) => course.id === id ? { ...course, is_favorite: nextValue } : course),
      }));
      void toggleCourseFavoriteAction(id).then((result) => {
        if (!result.error) return;
        setStore((current) => ({
          ...current,
          courses: current.courses.map((course) => course.id === id ? { ...course, is_favorite: !nextValue } : course),
        }));
        toast.error("No se pudo guardar el curso");
      });
    },
  };
}

async function completeOwnedCourse(
  course: Course,
  courses: Course[],
  setStore: ReturnType<typeof useApplicationStore>["setStore"],
) {
  const previous = courses.find((item) => item.id === course.id);
  setStore((current) => ({ ...current, courses: patchCourse(current.courses, course.id, { status: "terminado" }) }));
  try {
    const response = await completeCourseAction({ id: course.id });
    if (!response.ok) throw new Error(response.error);
    toast.success("Curso completado");
  } catch (error) {
    if (previous) setStore((current) => ({ ...current, courses: patchCourse(current.courses, course.id, previous) }));
    toast.error("No se pudo completar el curso");
    throw error;
  }
}
