import type { Lang } from "@/components/landing/i18n";
import { legalDocuments } from "@/features/legal/content";
import type { LegalDocumentName } from "@/features/legal/types";

import { LegalPage } from "./legal-page";

export function LegalDocumentPage({ name, lang }: { name: LegalDocumentName; lang: Lang }) {
  const document = legalDocuments[name][lang];

  return (
    <LegalPage
      lang={lang}
      altHref={document.altHref}
      title={document.title}
      kicker={document.kicker}
      lead={document.lead}
      aside={document.aside}
    >
      {document.children}
    </LegalPage>
  );
}
