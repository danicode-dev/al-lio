import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";
import { PUBLIC_CONTACT_EMAILS } from "@/lib/public-contact";

export const metadata: Metadata = { title: "Contacto", alternates: { canonical: "/contacto", languages: { es: "/contacto", en: "/en/contacto" } } };

export default function ContactoPage() {
  return (
    <LegalPage
      lang="es"
      altHref="/en/contacto"
      title="Contacto"
      kicker="Hablemos"
      lead="¿Dudas, fallos o ideas? Nos ayuda todo. Escríbenos por correo o abre un issue en el repositorio."
      aside={
        <>
          <p className="al-aside-title">La beca</p>
          <p>
            Para asuntos del programa Aircury Summer of Code 2026:{" "}
            <a href="mailto:summerofcode@aircury.es">summerofcode@aircury.es</a>.
          </p>
        </>
      }
    >
      <h2>El proyecto</h2>
      <p>
        Para dudas e ideas, escríbenos a{" "}
        <a href={`mailto:${PUBLIC_CONTACT_EMAILS.general}`}><strong>{PUBLIC_CONTACT_EMAILS.general}</strong></a>. Si
        necesitas ayuda con tu cuenta o con la aplicación, usa{" "}
        <a href={`mailto:${PUBLIC_CONTACT_EMAILS.support}`}><strong>{PUBLIC_CONTACT_EMAILS.support}</strong></a>. También
        puedes reportar errores o proponer mejoras en{" "}
        <a href="https://github.com/danielgarciaortega-dev/al-lio/issues" target="_blank" rel="noreferrer">GitHub</a>.
      </p>

      <h2>Protección de datos</h2>
      <p>
        Para ejercer tus derechos sobre tus datos personales, consulta la <a href="/privacidad">política de privacidad</a>{" "}
        o escribe a <a href={`mailto:${PUBLIC_CONTACT_EMAILS.privacy}`}><strong>{PUBLIC_CONTACT_EMAILS.privacy}</strong></a>.
      </p>
    </LegalPage>
  );
}
