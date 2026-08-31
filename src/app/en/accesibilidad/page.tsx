import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";
import { PUBLIC_CONTACT_EMAILS } from "@/lib/public-contact";

export const metadata: Metadata = {
  title: "Accessibility",
  alternates: { canonical: "/en/accesibilidad", languages: { es: "/accesibilidad", en: "/en/accesibilidad" } },
};

export default function AccessibilityPageEn() {
  return (
    <LegalPage
      lang="en"
      altHref="/accesibilidad"
      title="Accessibility"
      kicker="Commitment"
      lead={
        <>
          We want AL-LÍO to be usable by everyone. Our goal is to meet the{" "}
          <a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank" rel="noreferrer">WCAG 2.1 level AA</a>{" "}
          guidelines.
        </>
      }
      aside={
        <>
          <p className="al-aside-title">Found a barrier?</p>
          <p>
            Write to us at{" "}
            <a href={`mailto:${PUBLIC_CONTACT_EMAILS.support}`}><strong>{PUBLIC_CONTACT_EMAILS.support}</strong></a> with
            the page and the problem. We will prioritise it.
          </p>
        </>
      }
    >
      <h2>What we take into account</h2>
      <ul>
        <li>Full keyboard navigation with a visible focus indicator.</li>
        <li>Sufficient colour contrast in text and controls.</li>
        <li>Alternative text on meaningful images.</li>
        <li>Respect for the system’s <strong>reduced motion</strong> preference.</li>
        <li>A consistent heading and label structure for screen readers.</li>
      </ul>

      <h2>Known limitations</h2>
      <p>
        This is a continuously developed project and some parts may not fully comply yet. If you hit a barrier, tell us and
        we will prioritise it.
      </p>
    </LegalPage>
  );
}
