import { getLegalMetadata, LegalDocumentPage } from "@/features/legal";

export const metadata = getLegalMetadata("project", "en");

export default function ProjectPageEn() {
  return <LegalDocumentPage name="project" lang="en" />;
}
