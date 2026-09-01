import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("privacy", "en");

export default function PrivacyPageEn() {
  return <LegalDocumentPage name="privacy" lang="en" />;
}
