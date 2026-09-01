import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("accessibility", "es");

export default function AccesibilidadPage() {
  return <LegalDocumentPage name="accessibility" lang="es" />;
}
