import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("contact", "en");

export default function ContactPageEn() {
  return <LegalDocumentPage name="contact" lang="en" />;
}
