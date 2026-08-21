import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, PlayCircle, Sparkles } from "lucide-react";
import type { LearningCompetencySummary } from "@/lib/db/repositories/learning";

export function CompetenciesView({
  cycleName,
  competencies,
  disclaimer,
}: {
  cycleName: string;
  competencies: LearningCompetencySummary[];
  disclaimer: string;
}) {
  const totalResources = competencies.reduce((total, item) => total + item.resource_count, 0);
  const completedResources = competencies.reduce((total, item) => total + item.completed_count, 0);
  const progress = totalResources > 0 ? Math.round((completedResources / totalResources) * 100) : 0;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 border-b border-[#e8e2d7] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#e15d2d]">Competencias · {cycleName}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[#111111] sm:text-4xl">Elige qué quieres aprender</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#656159]">Cada competencia agrupa cursos en español revisados por AL-LIO. Puedes elegir uno, tomar notas y continuar otro día desde el mismo punto.</p>
        </div>
        <div className="flex min-w-[220px] items-center gap-4 rounded-2xl bg-[#114b3b] px-5 py-4 text-white">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-sm font-extrabold">{progress}%</span>
          <div>
            <p className="text-sm font-bold">Progreso guardado</p>
            <p className="mt-0.5 text-xs text-white/70">{completedResources} de {totalResources} cursos</p>
          </div>
        </div>
      </header>

      {competencies.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-950">
          Todavía no hay competencias publicadas para tu ciclo.
        </div>
      ) : (
        <section className="grid gap-x-7 gap-y-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Competencias disponibles">
          {competencies.map((competency) => {
            const complete = competency.resource_count > 0 && competency.completed_count === competency.resource_count;
            const inProgress = competency.started_count > 0;
            return (
              <Link
                key={competency.id}
                href={`/roadmap/${encodeURIComponent(competency.slug)}`}
                className="group flex min-h-56 flex-col justify-between rounded-[22px] border border-[#e8e2d7] bg-white p-5 shadow-[0_10px_28px_rgba(17,17,17,0.045)] transition hover:-translate-y-0.5 hover:border-[#d8cfc0] hover:shadow-[0_16px_36px_rgba(17,17,17,0.08)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${competency.requirement === "essential" ? "bg-[#fbe7dd] text-[#c94f21]" : "bg-[#edf3fb] text-[#2f5fac]"}`}>
                      {competency.requirement === "essential" ? <BookOpen className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                      {competency.requirement === "essential" ? "Esencial AL-LIO" : "Recomendada"}
                    </span>
                    {complete ? <CheckCircle2 className="h-5 w-5 text-[#1f7a4d]" /> : inProgress ? <Clock3 className="h-5 w-5 text-[#d97706]" /> : <PlayCircle className="h-5 w-5 text-[#8c877d]" />}
                  </div>
                  <h2 className="mt-5 text-xl font-extrabold tracking-[-0.025em] text-[#111111]">{competency.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#6b6f72]">{competency.description}</p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-[#f0ece4] pt-4 text-xs">
                  <span className="font-semibold text-[#6b6f72]">{competency.completed_count}/{competency.resource_count} cursos completados</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#e15d2d]">Ver cursos <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <p className="rounded-xl bg-[#f3f0e9] px-4 py-3 text-xs leading-5 text-[#6b6f72]">{disclaimer}</p>
    </div>
  );
}
