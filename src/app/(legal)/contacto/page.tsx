import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = { title: "Contacto" };

export default function ContactoPage() {
  return (
    <LegalPage title="Contacto">
      <p>¿Dudas, fallos o ideas? Nos ayuda todo.</p>

      <h2>El proyecto</h2>
      <p>
        Escríbenos a <strong>[correo del proyecto]</strong>. Para reportar errores o proponer mejoras también puedes abrir un
        issue en <a href="https://github.com/danielgarciaortega-dev/al-lio/issues" target="_blank" rel="noreferrer">GitHub</a>.
      </p>

      <h2>La beca</h2>
      <p>
        AL-LÍO se desarrolla con la beca Aircury Summer of Code 2026. Para asuntos relacionados con el programa:{" "}
        <a href="mailto:summerofcode@aircury.es">summerofcode@aircury.es</a>.
      </p>

      <h2>Protección de datos</h2>
      <p>
        Para ejercer tus derechos sobre tus datos personales, consulta la <a href="/privacidad">política de privacidad</a>.
      </p>
    </LegalPage>
  );
}
