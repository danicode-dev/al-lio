"use client";

import { toast } from "sonner";

import { toggleCompanyFavoriteAction } from "@/features/work/server/actions";
import { useApplicationStore } from "@/shared/store/application-store";

export type WorkActions = {
  toggleCompanyFavorite: (companyId: string) => void;
};

export function useWorkActions(): WorkActions {
  const { setStore } = useApplicationStore();
  return {
    toggleCompanyFavorite: (companyId) => {
      setStore((current) => ({
        ...current,
        companies: current.companies.map((company) => company.id === companyId ? { ...company, is_favorite: !company.is_favorite } : company),
      }));
      void toggleCompanyFavoriteAction(companyId).then((result) => {
        if (!result.error) return;
        setStore((current) => ({
          ...current,
          companies: current.companies.map((company) => company.id === companyId ? { ...company, is_favorite: !company.is_favorite } : company),
        }));
        toast.error("No se pudo guardar el favorito");
      });
    },
  };
}
