import type { LegalDocument } from "../types";

export const projectDocument: LegalDocument = {
  es: {
    metadataTitle: "El proyecto",
    href: "/proyecto",
    altHref: "/en/proyecto",
    title: "El proyecto",
    kicker: "Sobre AL-LÍO",
    lead: "AL-LÍO responde a un problema concreto de la Formación Profesional: la información y las tareas del curso repartidas en demasiados sitios. Es una herramienta para el curso, no un feed más.",
    aside: (
      <>
        <p className="al-aside-title">Código abierto</p>
        <p>
          Publicado bajo licencia <strong>MIT</strong> en{" "}
          <a href="https://github.com/danielgarciaortega-dev/al-lio" target="_blank" rel="noreferrer">GitHub</a>, escrito en
          inglés y en funcionamiento al menos hasta agosto de 2027.
        </p>
      </>
    ),
    children: (
      <>
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
      </>
    ),
  },
  en: {
    metadataTitle: "The project",
    href: "/en/proyecto",
    altHref: "/proyecto",
    title: "The project",
    kicker: "About AL-LÍO",
    lead: "AL-LÍO answers a concrete problem in vocational training: course information and tasks scattered across too many places. It is a tool for the course, not one more feed.",
    aside: (
      <>
        <p className="al-aside-title">Open source</p>
        <p>
          Published under the <strong>MIT</strong> licence on{" "}
          <a href="https://github.com/danielgarciaortega-dev/al-lio" target="_blank" rel="noreferrer">GitHub</a>, written
          in English and kept running at least until August 2027.
        </p>
      </>
    ),
    children: (
      <>
        <h2>How it is designed</h2>
        <ul>
          <li><strong>Content with judgement</strong> — news, courses and events pass a source and relevance check before they appear on your panel.</li>
          <li><strong>Tailored to your programme</strong> — you see what matches your vocational field, not a generic catalogue.</li>
          <li><strong>No ads or third parties</strong> — there is no external tracking; your activity is neither shared nor sold.</li>
          <li><strong>Continuous development</strong> — in real use, with improvements based on how the platform is used.</li>
        </ul>

        <h2>Grant and credit</h2>
        <p>
          AL-LÍO is developed thanks to the Aircury Summer of Code 2026 grant from{" "}
          <a href="https://www.aircury.es" target="_blank" rel="noreferrer">Aircury SL</a> — three grants for open-source
          projects with social impact, proposed by students.
        </p>
      </>
    ),
  },
};
