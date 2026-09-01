import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("cookies", "en");

export default function CookiesPageEn() {
  return <LegalDocumentPage name="cookies" lang="en" />;
}
