import type { Metadata } from "next";

import type { Lang } from "@/components/landing/i18n";
import { LEGAL_ROUTES } from "@/features/legal/routes";
import type { LegalDocumentName } from "@/features/legal/types";

export function getLegalMetadata(name: LegalDocumentName, lang: Lang): Metadata {
  const route = LEGAL_ROUTES[name];

  return {
    title: route[lang].metadataTitle,
    alternates: {
      canonical: route[lang].href,
      languages: {
        es: route.es.href,
        en: route.en.href,
      },
    },
  };
}
