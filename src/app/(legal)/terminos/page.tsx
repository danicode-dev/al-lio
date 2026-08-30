import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = { title: "Términos" };

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos de uso"
      kicker="Condiciones"
      lead="Al usar AL-LÍO aceptas estos términos. Es un proyecto educativo sin ánimo de lucro: no es un producto comercial y se ofrece tal cual, sin garantías."
      aside={
        <>
          <p className="al-aside-title">Código abierto</p>
          <p>
            El código se publica bajo <strong>licencia MIT</strong> en{" "}
            <a href="https://github.com/danielgarciaortega-dev/al-lio" target="_blank" rel="noreferrer">GitHub</a>. Puedes
            usarlo, modificarlo y distribuirlo según esa licencia.
          </p>
        </>
      }
    >
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
    </LegalPage>
  );
}
