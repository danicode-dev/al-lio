import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "The project",
  alternates: { canonical: "/en/proyecto", languages: { es: "/proyecto", en: "/en/proyecto" } },
};

export default function ProjectPageEn() {
  return (
    <LegalPage
      lang="en"
      altHref="/proyecto"
      title="The project"
      kicker="About AL-LÍO"
      lead="AL-LÍO answers a concrete problem in vocational training: course information and tasks scattered across too many places. It is a tool for the course, not one more feed."
      aside={
        <>
          <p className="al-aside-title">Open source</p>
          <p>
            Published under the <strong>MIT</strong> licence on{" "}
            <a href="https://github.com/danielgarciaortega-dev/al-lio" target="_blank" rel="noreferrer">GitHub</a>, written
            in English and kept running at least until August 2027.
          </p>
        </>
      }
    >
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
    </LegalPage>
  );
}
