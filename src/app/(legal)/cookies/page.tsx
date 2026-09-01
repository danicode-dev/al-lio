import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("cookies", "es");

export default function CookiesPage() {
  return <LegalDocumentPage name="cookies" lang="es" />;
}
