"use client";

import { useEventActions } from "@/features/events/client";
import { useLearningActions } from "@/features/learning/client";
import { useTaskActions } from "@/features/tasks/client";
import { useApplicationStore } from "@/shared/store/application-store";
import { FeaturePage } from "@/shared/ui/feature-page";
import { Hackathons } from "./hackathons-catalogue";

export { HackathonDetailView } from "./hackathon-detail-view";

export function EventsFeature() {
  const { store } = useApplicationStore();
  const actions = { ...useEventActions(), ...useLearningActions(), ...useTaskActions() };
  return (
    <FeaturePage eyebrow="Comunidad" title="Eventos y retos" subtitle="Hackathons, retos y convocatorias para poner a prueba lo que sabes." catalogue>
      <Hackathons store={store} actions={actions} />
    </FeaturePage>
  );
}
