import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Terms",
  alternates: { canonical: "/en/terminos", languages: { es: "/terminos", en: "/en/terminos" } },
};

export default function TermsPageEn() {
  return (
    <LegalPage
      lang="en"
      altHref="/terminos"
      title="Terms of use"
      kicker="Conditions"
      lead="By using AL-LÍO you accept these terms. It is a non-profit educational project: it is not a commercial product and it is offered as is, without warranties."
      aside={
        <>
          <p className="al-aside-title">Open source</p>
          <p>
            The code is published under the <strong>MIT licence</strong> on{" "}
            <a href="https://github.com/danielgarciaortega-dev/al-lio" target="_blank" rel="noreferrer">GitHub</a>. You can
            use, modify and distribute it under that licence.
          </p>
        </>
      }
    >
      <h2>Using the platform</h2>
      <ul>
        <li>It is intended for vocational-training students and their academic organisation.</li>
        <li>You are responsible for your account activity and the content you add.</li>
        <li>Do not use the platform for unlawful activities or to harm the service or other people.</li>
      </ul>

      <h2>Availability</h2>
      <p>
        We work to keep the service running, but there may be interruptions, changes or data loss. We accept no liability
        for damages arising from use or from being unable to use it.
      </p>

      <h2>Third-party content</h2>
      <p>
        The news, courses and events shown come from public and industry sources. We link to the original source; its
        content belongs to its authors.
      </p>

      <h2>Credit</h2>
      <p>
        Project developed thanks to the Aircury Summer of Code 2026 grant from{" "}
        <a href="https://www.aircury.es" target="_blank" rel="noreferrer">Aircury SL</a>.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. We will publish the date of the latest revision on this page.</p>
    </LegalPage>
  );
}
