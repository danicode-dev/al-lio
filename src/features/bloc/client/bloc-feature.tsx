"use client";

import { FeaturePage } from "@/shared/ui/feature-page";

import { BlocNotepad } from "./bloc-notepad";

export function BlocFeature() {
  return (
    <FeaturePage
      eyebrow="Bloc"
      title="Bloc de notas"
      subtitle="Escribe, organiza y exporta tus notas a PDF o Word."
      compactHeader
    >
      <BlocNotepad />
    </FeaturePage>
  );
}
