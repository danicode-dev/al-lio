import { accessibilityDocument } from "./accessibility";
import { contactDocument } from "./contact";
import { cookiesDocument } from "./cookies";
import { privacyDocument } from "./privacy";
import { projectDocument } from "./project";
import { termsDocument } from "./terms";

import type { LegalDocument, LegalDocumentName } from "../types";

export const legalDocuments = {
  accessibility: accessibilityDocument,
  contact: contactDocument,
  cookies: cookiesDocument,
  privacy: privacyDocument,
  project: projectDocument,
  terms: termsDocument,
} satisfies Record<LegalDocumentName, LegalDocument>;
