import { PUBLIC_CONTACT_EMAILS } from "@/lib/public-contact";

import type { LegalDocument } from "../types";

export const accessibilityDocument: LegalDocument = {
  es: {
    metadataTitle: "Accesibilidad",
    href: "/accesibilidad",
    altHref: "/en/accesibilidad",
    title: "Accesibilidad",
    kicker: "Compromiso",
    lead: (
      <>
        Queremos que AL-LÍO sea usable por todo el mundo. Nuestro objetivo es cumplir las pautas{" "}
        <a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank" rel="noreferrer">WCAG 2.1 nivel AA</a>.
      </>
    ),
    aside: (
      <>
        <p className="al-aside-title">¿Has encontrado una barrera?</p>
        <p>
          Escríbenos a{" "}
          <a href={"mailto:" + PUBLIC_CONTACT_EMAILS.support}><strong>{PUBLIC_CONTACT_EMAILS.support}</strong></a>{" "}
          indicando la página y el problema. Lo priorizamos.
        </p>
      </>
    ),
    children: (
      <>
        <h2>Qué tenemos en cuenta</h2>
        <ul>
          <li>Navegación completa con teclado y foco visible.</li>
          <li>Contraste de color suficiente en textos y controles.</li>
          <li>Textos alternativos en las imágenes con significado.</li>
          <li>Respeto de la preferencia de <strong>movimiento reducido</strong> del sistema.</li>
          <li>Estructura de encabezados y etiquetas coherente para lectores de pantalla.</li>
        </ul>

        <h2>Limitaciones conocidas</h2>
        <p>
          Es un proyecto en desarrollo continuo y puede haber partes que aún no cumplan del todo. Si encuentras una barrera,
          cuéntanoslo y lo priorizamos.
        </p>
      </>
    ),
  },
  en: {
    metadataTitle: "Accessibility",
    href: "/en/accesibilidad",
    altHref: "/accesibilidad",
    title: "Accessibility",
    kicker: "Commitment",
    lead: (
      <>
        We want AL-LÍO to be usable by everyone. Our goal is to meet the{" "}
        <a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank" rel="noreferrer">WCAG 2.1 level AA</a>{" "}
        guidelines.
      </>
    ),
    aside: (
      <>
        <p className="al-aside-title">Found a barrier?</p>
        <p>
          Write to us at{" "}
          <a href={"mailto:" + PUBLIC_CONTACT_EMAILS.support}><strong>{PUBLIC_CONTACT_EMAILS.support}</strong></a> with
          the page and the problem. We will prioritise it.
        </p>
      </>
    ),
    children: (
      <>
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
      </>
    ),
  },
};
