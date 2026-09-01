import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("terms", "es");

export default function TerminosPage() {
  return <LegalDocumentPage name="terms" lang="es" />;
}
