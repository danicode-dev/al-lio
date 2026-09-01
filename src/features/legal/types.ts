import type { ReactNode } from "react";

import type { Lang } from "@/components/landing/i18n";

export type LegalDocumentName =
  | "accessibility"
  | "contact"
  | "cookies"
  | "privacy"
  | "project"
  | "terms";

export type LegalDocumentVariant = {
  metadataTitle: string;
  href: string;
  altHref: string;
  title: string;
  kicker?: string;
  lead?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
};

export type LegalDocument = Record<Lang, LegalDocumentVariant>;
