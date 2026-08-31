import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = { title: "Accesibilidad", alternates: { canonical: "/accesibilidad", languages: { es: "/accesibilidad", en: "/en/accesibilidad" } } };

export default function AccesibilidadPage() {
  return (
    <LegalPage
      lang="es"
      altHref="/en/accesibilidad"
      title="Accesibilidad"
      kicker="Compromiso"
      lead={
        <>
          Queremos que AL-LÍO sea usable por todo el mundo. Nuestro objetivo es cumplir las pautas{" "}
          <a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank" rel="noreferrer">WCAG 2.1 nivel AA</a>.
        </>
      }
      aside={
        <>
          <p className="al-aside-title">¿Has encontrado una barrera?</p>
          <p>
            Escríbenos a <strong>[correo del proyecto]</strong> indicando la página y el problema. Lo priorizamos.
          </p>
        </>
      }
    >
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
    </LegalPage>
  );
}
