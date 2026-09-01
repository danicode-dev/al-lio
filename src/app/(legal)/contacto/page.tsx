import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("contact", "es");

export default function ContactoPage() {
  return <LegalDocumentPage name="contact" lang="es" />;
}
