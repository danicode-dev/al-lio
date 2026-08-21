import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, PlayCircle } from "lucide-react";
import type { LearningCompetencyDetail } from "@/lib/db/repositories/learning";
import { formatTimestamp } from "@/lib/learning/time";

export function CompetencyCoursesView({ competency }: { competency: LearningCompetencyDetail }) {
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/roadmap" className="inline-flex items-center gap-2 text-sm font-bold text-[#6b6f72] hover:text-[#111111]">
        <ArrowLeft className="h-4 w-4" /> Todas las competencias
      </Link>

      <header className="mt-6 border-b border-[#e8e2d7] pb-6">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${competency.requirement === "essential" ? "bg-[#fbe7dd] text-[#c94f21]" : "bg-[#edf3fb] text-[#2f5fac]"}`}>
          {competency.requirement === "essential" ? "Competencia esencial AL-LIO" : "Competencia recomendada"}
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#111111]">{competency.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#656159]">{competency.description}</p>
      </header>

      <section className="mt-7 space-y-3" aria-label={`Cursos de ${competency.title}`}>
        {competency.resources.map((resource, index) => {
          const progressDuration = resource.saved_duration_seconds ?? resource.duration_seconds;
          const progress = resource.status === "completed"
            ? 100
            : progressDuration && resource.last_position_seconds > 0
              ? Math.min(99, Math.round((resource.last_position_seconds / progressDuration) * 100))
              : 0;
          return (
            <Link
              key={resource.id}
              href={`/aprende/${encodeURIComponent(resource.slug)}`}
              className="group grid gap-4 rounded-2xl border border-[#e8e2d7] bg-white p-5 transition hover:border-[#d4cabb] hover:shadow-[0_12px_30px_rgba(17,17,17,0.06)] md:grid-cols-[52px_minmax(0,1fr)_auto] md:items-center"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3f0e9] text-sm font-extrabold text-[#8a8378]">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-[#111111]">{resource.title}</h2>
                  {resource.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1f7a4d]"><CheckCircle2 className="h-3.5 w-3.5" /> Completado</span>
                  ) : resource.status === "started" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#b66517]"><Clock3 className="h-3.5 w-3.5" /> En progreso</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs font-semibold text-[#6b6f72]">{resource.provider} · Español · Nivel {resource.level}</p>
                <p className="mt-2 text-sm leading-5 text-[#6b6f72]">{resource.description}</p>
                {progress > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f0ece4]"><div className="h-full rounded-full bg-[#1f7a4d]" style={{ width: `${progress}%` }} /></div>
                    <span className="text-[11px] font-bold text-[#6b6f72]">{resource.status === "completed" ? "100%" : `Continúa en ${formatTimestamp(resource.last_position_seconds)}`}</span>
                  </div>
                )}
              </div>
              <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#e15d2d] px-4 text-sm font-bold text-white transition group-hover:bg-[#c94f21]">
                {resource.status === "started" ? "Continuar" : resource.status === "completed" ? "Repasar" : "Empezar"}
                {resource.status ? <ArrowRight className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
