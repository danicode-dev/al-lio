import { LEGAL_ROUTES } from "../routes";
import type { LegalDocument } from "../types";

export const termsDocument: LegalDocument = {
  es: {
    ...LEGAL_ROUTES.terms.es,
    lead: "Al usar AL-LÍO aceptas estos términos. Es un proyecto educativo sin ánimo de lucro: no es un producto comercial y se ofrece tal cual, sin garantías.",
    aside: (
      <>
        <p className="al-aside-title">Código abierto</p>
        <p>
          El código se publica bajo <strong>licencia MIT</strong> en{" "}
          <a href="https://github.com/danielgarciaortega-dev/al-lio" target="_blank" rel="noreferrer">GitHub</a>. Puedes
          usarlo, modificarlo y distribuirlo según esa licencia.
        </p>
      </>
    ),
    children: (
      <>
        <h2>Uso de la plataforma</h2>
        <ul>
          <li>Está pensada para estudiantes de Formación Profesional y su organización académica.</li>
          <li>Eres responsable de la actividad de tu cuenta y del contenido que introduces.</li>
          <li>No uses la plataforma para actividades ilícitas ni para dañar el servicio o a otras personas.</li>
        </ul>

        <h2>Disponibilidad</h2>
        <p>
          Trabajamos para mantener el servicio en funcionamiento, pero puede haber interrupciones, cambios o pérdida de datos.
          No asumimos responsabilidad por daños derivados del uso o de la imposibilidad de uso.
        </p>

        <h2>Contenido de terceros</h2>
        <p>
          Las noticias, cursos y eventos que se muestran proceden de fuentes públicas y de sector. Enlazamos a la fuente
          original; su contenido pertenece a sus autores.
        </p>

        <h2>Crédito</h2>
        <p>
          Proyecto desarrollado gracias a la beca Aircury Summer of Code 2026 de{" "}
          <a href="https://www.aircury.es" target="_blank" rel="noreferrer">Aircury SL</a>.
        </p>

        <h2>Cambios</h2>
        <p>Podemos actualizar estos términos. Publicaremos la fecha de la última revisión en esta misma página.</p>
      </>
    ),
  },
  en: {
    ...LEGAL_ROUTES.terms.en,
    lead: "By using AL-LÍO you accept these terms. It is a non-profit educational project: it is not a commercial product and it is offered as is, without warranties.",
    aside: (
      <>
        <p className="al-aside-title">Open source</p>
        <p>
          The code is published under the <strong>MIT licence</strong> on{" "}
          <a href="https://github.com/danielgarciaortega-dev/al-lio" target="_blank" rel="noreferrer">GitHub</a>. You can
          use, modify and distribute it under that licence.
        </p>
      </>
    ),
    children: (
      <>
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
      </>
    ),
  },
};
