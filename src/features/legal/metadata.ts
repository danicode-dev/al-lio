import type { Metadata } from "next";

import type { Lang } from "@/components/landing/i18n";
import { legalDocuments } from "@/features/legal/content";
import type { LegalDocumentName } from "@/features/legal/types";

export function getLegalMetadata(name: LegalDocumentName, lang: Lang): Metadata {
  const document = legalDocuments[name];
  const variant = document[lang];

  return {
    title: variant.metadataTitle,
    alternates: {
      canonical: variant.href,
      languages: {
        es: document.es.href,
        en: document.en.href,
      },
    },
  };
}
