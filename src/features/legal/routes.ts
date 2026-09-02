import type { Lang } from "@/components/landing/i18n";
import type { LegalDocumentName } from "./types";

/**
 * The structural registry for the twelve legal routes: the metadata title, the
 * canonical path (`href`), the other-language path (`altHref`), the visible
 * title and the kicker, for each document in Spanish and English. This is the
 * single source of truth for the paths and titles - the content modules spread
 * it and only add their bilingual prose, and `getLegalMetadata` reads it
 * directly so canonical/alternate metadata never depends on rendering the
 * document body. Framework- and JSX-free, so
 * tests/unit/legal/routes.test.mjs executes it.
 */

export type LegalRoute = {
  metadataTitle: string;
  /** The canonical path for this language variant. */
  href: string;
  /** The same document in the other language. */
  altHref: string;
  title: string;
  kicker: string;
};

export const LEGAL_ROUTES: Record<LegalDocumentName, Record<Lang, LegalRoute>> = {
  accessibility: {
    es: { metadataTitle: "Accesibilidad", href: "/accesibilidad", altHref: "/en/accesibilidad", title: "Accesibilidad", kicker: "Compromiso" },
    en: { metadataTitle: "Accessibility", href: "/en/accesibilidad", altHref: "/accesibilidad", title: "Accessibility", kicker: "Commitment" },
  },
  contact: {
    es: { metadataTitle: "Contacto", href: "/contacto", altHref: "/en/contacto", title: "Contacto", kicker: "Hablemos" },
    en: { metadataTitle: "Contact", href: "/en/contacto", altHref: "/contacto", title: "Contact", kicker: "Get in touch" },
  },
  cookies: {
    es: { metadataTitle: "Cookies", href: "/cookies", altHref: "/en/cookies", title: "Política de cookies", kicker: "Cookies" },
    en: { metadataTitle: "Cookies", href: "/en/cookies", altHref: "/cookies", title: "Cookie policy", kicker: "Cookies" },
  },
  privacy: {
    es: { metadataTitle: "Privacidad", href: "/privacidad", altHref: "/en/privacidad", title: "Privacidad", kicker: "Protección de datos" },
    en: { metadataTitle: "Privacy", href: "/en/privacidad", altHref: "/privacidad", title: "Privacy", kicker: "Data protection" },
  },
  project: {
    es: { metadataTitle: "El proyecto", href: "/proyecto", altHref: "/en/proyecto", title: "El proyecto", kicker: "Sobre AL-LÍO" },
    en: { metadataTitle: "The project", href: "/en/proyecto", altHref: "/proyecto", title: "The project", kicker: "About AL-LÍO" },
  },
  terms: {
    es: { metadataTitle: "Términos", href: "/terminos", altHref: "/en/terminos", title: "Términos de uso", kicker: "Condiciones" },
    en: { metadataTitle: "Terms", href: "/en/terminos", altHref: "/terminos", title: "Terms of use", kicker: "Conditions" },
  },
};
