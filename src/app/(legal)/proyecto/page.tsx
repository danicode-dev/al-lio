import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("project", "es");

export default function ProyectoPage() {
  return <LegalDocumentPage name="project" lang="es" />;
}
