import { PUBLIC_CONTACT_EMAILS } from "@/lib/public-contact";

import { LEGAL_ROUTES } from "../routes";
import type { LegalDocument } from "../types";

export const contactDocument: LegalDocument = {
  es: {
    ...LEGAL_ROUTES.contact.es,
    lead: "¿Dudas, fallos o ideas? Nos ayuda todo. Escríbenos por correo o abre un issue en el repositorio.",
    aside: (
      <>
        <p className="al-aside-title">La beca</p>
        <p>
          Para asuntos del programa Aircury Summer of Code 2026:{" "}
          <a href="mailto:summerofcode@aircury.es">summerofcode@aircury.es</a>.
        </p>
      </>
    ),
    children: (
      <>
        <h2>El proyecto</h2>
        <p>
          Para dudas e ideas, escríbenos a{" "}
          <a href={"mailto:" + PUBLIC_CONTACT_EMAILS.general}><strong>{PUBLIC_CONTACT_EMAILS.general}</strong></a>. Si
          necesitas ayuda con tu cuenta o con la aplicación, usa{" "}
          <a href={"mailto:" + PUBLIC_CONTACT_EMAILS.support}><strong>{PUBLIC_CONTACT_EMAILS.support}</strong></a>. También
          puedes reportar errores o proponer mejoras en{" "}
          <a href="https://github.com/danielgarciaortega-dev/al-lio/issues" target="_blank" rel="noreferrer">GitHub</a>.
        </p>

        <h2>Protección de datos</h2>
        <p>
          Para ejercer tus derechos sobre tus datos personales, consulta la <a href="/privacidad">política de privacidad</a>{" "}
          o escribe a <a href={"mailto:" + PUBLIC_CONTACT_EMAILS.privacy}><strong>{PUBLIC_CONTACT_EMAILS.privacy}</strong></a>.
        </p>
      </>
    ),
  },
  en: {
    ...LEGAL_ROUTES.contact.en,
    lead: "Questions, bugs or ideas? It all helps. Write to us by email or open an issue in the repository.",
    aside: (
      <>
        <p className="al-aside-title">The grant</p>
        <p>
          For matters about the Aircury Summer of Code 2026 programme:{" "}
          <a href="mailto:summerofcode@aircury.es">summerofcode@aircury.es</a>.
        </p>
      </>
    ),
    children: (
      <>
        <h2>The project</h2>
        <p>
          For questions and ideas, write to us at{" "}
          <a href={"mailto:" + PUBLIC_CONTACT_EMAILS.general}><strong>{PUBLIC_CONTACT_EMAILS.general}</strong></a>. If you
          need help with your account or the application, use{" "}
          <a href={"mailto:" + PUBLIC_CONTACT_EMAILS.support}><strong>{PUBLIC_CONTACT_EMAILS.support}</strong></a>. You can
          also report bugs or suggest improvements on{" "}
          <a href="https://github.com/danielgarciaortega-dev/al-lio/issues" target="_blank" rel="noreferrer">GitHub</a>.
        </p>

        <h2>Data protection</h2>
        <p>
          To exercise your rights over your personal data, see the <a href="/en/privacidad">privacy policy</a> or write to{" "}
          <a href={"mailto:" + PUBLIC_CONTACT_EMAILS.privacy}><strong>{PUBLIC_CONTACT_EMAILS.privacy}</strong></a>.
        </p>
      </>
    ),
  },
};
