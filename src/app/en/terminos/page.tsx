import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("terms", "en");

export default function TermsPageEn() {
  return <LegalDocumentPage name="terms" lang="en" />;
}
