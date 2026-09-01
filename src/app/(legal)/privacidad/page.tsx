import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("privacy", "es");

export default function PrivacidadPage() {
  return <LegalDocumentPage name="privacy" lang="es" />;
}
