"use client";

import { useCourseActions } from "@/features/courses/client";
import { useLearningActions } from "@/features/learning/client";
import { useApplicationStore } from "@/shared/store/application-store";
import { FeaturePage } from "@/shared/ui/feature-page";
import { Courses } from "./courses-catalogue";

export { CourseDetailView } from "./course-detail-view";
export { canToggleCourseFavorite, toggleCourseFavoriteFor } from "./course-catalogue-model";

export function CoursesFeature() {
  const { store } = useApplicationStore();
  const actions = { ...useCourseActions(), ...useLearningActions() };
  return (
    <FeaturePage eyebrow="Formación" title="Cursos" subtitle="Formación complementaria y recursos para avanzar en tu ciclo." catalogue>
      <Courses store={store} actions={actions} />
    </FeaturePage>
  );
}
