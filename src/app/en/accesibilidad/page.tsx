import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("accessibility", "en");

export default function AccessibilityPageEn() {
  return <LegalDocumentPage name="accessibility" lang="en" />;
}
