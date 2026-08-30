import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = { title: "El proyecto" };

export default function ProyectoPage() {
  return (
    <LegalPage
      title="El proyecto"
      kicker="Sobre AL-LÍO"
      lead="AL-LÍO responde a un problema concreto de la Formación Profesional: la información y las tareas del curso repartidas en demasiados sitios. Es una herramienta para el curso, no un feed más."
      aside={
        <>
          <p className="al-aside-title">Código abierto</p>
          <p>
            Publicado bajo licencia <strong>MIT</strong> en{" "}
            <a href="https://github.com/danielgarciaortega-dev/al-lio" target="_blank" rel="noreferrer">GitHub</a>, escrito en
            inglés y en funcionamiento al menos hasta agosto de 2027.
          </p>
        </>
      }
    >
      <h2>Cómo está pensado</h2>
      <ul>
        <li><strong>Contenido con criterio</strong> — noticias, cursos y eventos pasan un control de fuente y relevancia antes de aparecer en tu panel.</li>
        <li><strong>Ajustado a tu ciclo</strong> — ves lo que corresponde a tu familia profesional, no un catálogo genérico.</li>
        <li><strong>Sin anuncios ni terceros</strong> — no hay seguimiento externo; tu actividad no se comparte ni se vende.</li>
        <li><strong>Desarrollo continuo</strong> — en uso real, con mejoras basadas en cómo se usa la plataforma.</li>
      </ul>

      <h2>Beca y crédito</h2>
      <p>
        AL-LÍO se desarrolla gracias a la beca Aircury Summer of Code 2026 de{" "}
        <a href="https://www.aircury.es" target="_blank" rel="noreferrer">Aircury SL</a> — tres becas para proyectos de
        código abierto con impacto social, propuestas por estudiantes.
      </p>
    </LegalPage>
  );
}
