import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/en/contacto", languages: { es: "/contacto", en: "/en/contacto" } },
};

export default function ContactPageEn() {
  return (
    <LegalPage
      lang="en"
      altHref="/contacto"
      title="Contact"
      kicker="Get in touch"
      lead="Questions, bugs or ideas? It all helps. Write to us by email or open an issue in the repository."
      aside={
        <>
          <p className="al-aside-title">The grant</p>
          <p>
            For matters about the Aircury Summer of Code 2026 programme:{" "}
            <a href="mailto:summerofcode@aircury.es">summerofcode@aircury.es</a>.
          </p>
        </>
      }
    >
      <h2>The project</h2>
      <p>
        Write to us at <strong>[project email]</strong>. To report bugs or suggest improvements you can also open an issue
        on <a href="https://github.com/danielgarciaortega-dev/al-lio/issues" target="_blank" rel="noreferrer">GitHub</a>.
      </p>

      <h2>Data protection</h2>
      <p>
        To exercise your rights over your personal data, see the <a href="/en/privacidad">privacy policy</a>.
      </p>
    </LegalPage>
  );
}
