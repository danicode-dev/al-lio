"use client";

import { toast } from "sonner";

import type { Hackathon } from "@/components/store/types";
import { completeEventAction, createEventAction, toggleHackathonFavoriteAction } from "@/features/events/server/actions";
import { markLearningResourceStatusAction } from "@/features/learning/server/actions";
import { useApplicationStore } from "@/shared/store/application-store";

export type EventActions = {
  addHackathon: (data: Omit<Hackathon, "id" | "created_at">) => Promise<void>;
  toggleHackathonFavorite: (id: string) => void;
  completeHackathon: (item: Hackathon) => Promise<void>;
};

export function useEventActions(): EventActions {
  const { store, setStore } = useApplicationStore();
  return {
    addHackathon: async (data) => {
      const id = crypto.randomUUID();
      setStore((current) => ({
        ...current,
        hackathons: [{ id, created_at: new Date().toISOString(), ...data }, ...current.hackathons],
      }));
      try {
        const response = await createEventAction({
          id,
          name: data.name,
          organizer: data.organizer,
          province: data.province,
          city: data.city,
          status: data.status || "revisar_futura_edicion",
          startAt: data.start_at,
          endAt: data.end_at,
          registrationDeadlineAt: data.registration_deadline_at,
          url: data.url,
          notes: data.notes,
          priority: data.priority,
        });
        if (!response.ok) throw new Error(response.error);
        toast.success("Evento o reto añadido");
      } catch (error) {
        setStore((current) => ({ ...current, hackathons: current.hackathons.filter((item) => item.id !== id) }));
        toast.error("Error al añadir el evento o reto");
        throw error;
      }
    },
    toggleHackathonFavorite: (id) => {
      const nextValue = !store.hackathons.find((item) => item.id === id)?.is_favorite;
      setStore((current) => ({
        ...current,
        hackathons: current.hackathons.map((item) => item.id === id ? { ...item, is_favorite: nextValue } : item),
      }));
      void toggleHackathonFavoriteAction(id).then((result) => {
        if (!result.error) return;
        setStore((current) => ({
          ...current,
          hackathons: current.hackathons.map((item) => item.id === id ? { ...item, is_favorite: !nextValue } : item),
        }));
        toast.error("No se pudo guardar el evento o reto");
      });
    },
    completeHackathon: async (item) => {
      if (item.sourceTable === "fp_content_items") {
        if (!item.id_slug) throw new Error("Missing id_slug for FP event completion");
        const previous = store.fpContent.find((content) => content.id_slug === item.id_slug);
        setStore((current) => ({
          ...current,
          fpContent: current.fpContent.map((content) => content.id_slug === item.id_slug
            ? { ...content, user_status: "completed", user_completed_at: new Date().toISOString() }
            : content),
        }));
        try {
          const result = await markLearningResourceStatusAction({ idSlug: item.id_slug, status: "completed" });
          if (result.error) throw new Error(result.error);
          toast.success("Evento marcado como realizado");
        } catch (error) {
          setStore((current) => ({
            ...current,
            fpContent: current.fpContent.map((content) => content.id_slug === item.id_slug
              ? { ...content, user_status: previous?.user_status, user_completed_at: previous?.user_completed_at }
              : content),
          }));
          toast.error("No se pudo marcar el evento como realizado");
          throw error;
        }
        return;
      }

      const previous = store.hackathons.find((event) => event.id === item.id);
      setStore((current) => ({
        ...current,
        hackathons: current.hackathons.map((event) => event.id === item.id ? { ...event, status: "realizado" } : event),
      }));
      try {
        const response = await completeEventAction({ id: item.id });
        if (!response.ok) throw new Error(response.error);
        toast.success("Evento marcado como realizado");
      } catch (error) {
        if (previous) setStore((current) => ({
          ...current,
          hackathons: current.hackathons.map((event) => event.id === item.id ? previous : event),
        }));
        toast.error("No se pudo marcar el evento como realizado");
        throw error;
      }
    },
  };
}
