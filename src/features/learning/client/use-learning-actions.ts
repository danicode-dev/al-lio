"use client";

import { toast } from "sonner";

import type { FpCatalogItem } from "@/components/store/types";
import {
  markLearningCompetencyCompletedAction,
  markLearningResourceStatusAction,
  toggleLearningFavoriteAction,
} from "@/features/learning/server/actions";
import { useApplicationStore } from "@/shared/store/application-store";

export type LearningActions = {
  toggleFpFavorite: (idSlug: string, nextValue: boolean) => void;
  markLearningItemDone: (idSlug: string) => void;
  markCompetencyCompleted: (skillId: string) => void;
};

export function useLearningActions(): LearningActions {
  const { setStore } = useApplicationStore();
  return {
    toggleFpFavorite: (idSlug, nextValue) => {
      setStore((current) => ({
        ...current,
        fpContent: current.fpContent.map((item) => item.id_slug === idSlug ? { ...item, is_favorite: nextValue } : item),
      }));
      void toggleLearningFavoriteAction({ idSlug, isFavorite: nextValue }).then((result) => {
        if (!result.error) return;
        setStore((current) => ({
          ...current,
          fpContent: current.fpContent.map((item) => item.id_slug === idSlug ? { ...item, is_favorite: !nextValue } : item),
        }));
        toast.error("No se pudo guardar");
      });
    },
    markLearningItemDone: (idSlug) => {
      const patchLearningItems = (fpContent: FpCatalogItem[], status: string | null) => fpContent.map((item) => ({
        ...item,
        requiredCompetencies: item.requiredCompetencies?.map((competency) => ({
          ...competency,
          learningItems: competency.learningItems.map((learningItem) => learningItem.id_slug === idSlug ? { ...learningItem, user_status: status } : learningItem),
        })),
      }));
      setStore((current) => ({ ...current, fpContent: patchLearningItems(current.fpContent, "completed") }));
      void markLearningResourceStatusAction({ idSlug, status: "completed" }).then((result) => {
        if (!result.error) return;
        setStore((current) => ({ ...current, fpContent: patchLearningItems(current.fpContent, null) }));
        toast.error("No se pudo guardar");
      });
    },
    markCompetencyCompleted: (skillId) => {
      const patchCompetencies = (fpContent: FpCatalogItem[], completed: boolean) => fpContent.map((item) => ({
        ...item,
        requiredCompetencies: item.requiredCompetencies?.map((competency) => competency.id === skillId ? { ...competency, completed } : competency),
        courseAptitudes: item.courseAptitudes?.map((aptitude) => aptitude.id === skillId ? { ...aptitude, completed } : aptitude),
      }));
      setStore((current) => ({ ...current, fpContent: patchCompetencies(current.fpContent, true) }));
      void markLearningCompetencyCompletedAction({ skillId }).then((result) => {
        if (!result.error) return;
        setStore((current) => ({ ...current, fpContent: patchCompetencies(current.fpContent, false) }));
        toast.error("No se pudo guardar");
      });
    },
  };
}
