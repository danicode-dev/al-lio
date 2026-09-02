import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { StudentHeaderActions } from "@/components/student-header-actions";
import { VerifiedJobActions } from "@/components/jobs/verified-job-actions";
import type { VerifiedJob } from "@/lib/jobs/types";

export function VerifiedJobDetailView({ job, nextJob }: { job: VerifiedJob; nextJob: VerifiedJob | null }) {
  const location = [job.municipality, job.province, job.autonomousCommunity].filter(Boolean).join(" · ");
  const active = job.lifecycle === "open" && (!job.applicationDeadline || Date.parse(job.applicationDeadline) > Date.now());

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/work" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a Trabajo
          </Link>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.12em] text-[#d55226]">Oferta verificada</p>
          <h1 className="mt-1 max-w-4xl text-3xl font-bold tracking-[-0.035em] text-[#111] md:text-4xl">{job.title}</h1>
          <p className="mt-2 text-base text-muted-foreground">{job.employer}</p>
        </div>
        <div className="hidden md:flex md:items-center md:gap-2"><StudentHeaderActions /></div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <main className="min-w-0 space-y-7 rounded-[22px] border border-[#e7e1d7] bg-white p-5 shadow-[0_18px_45px_rgba(36,27,17,0.05)] md:p-7">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#eee8df] pb-5">
            <span className={active ? "rounded-full bg-[#e7f5ed] px-3 py-1 text-xs font-semibold text-[#267a4c]" : "rounded-full bg-[#f1eee8] px-3 py-1 text-xs font-semibold text-[#6e675c]"}>
              {active ? "Abierta" : job.lifecycle === "closed" ? "Cerrada" : job.lifecycle === "expired" ? "Finalizada" : "Estado por confirmar"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2ec] px-3 py-1 text-xs font-semibold text-[#a83d18]">
              <ShieldCheck className="h-3.5 w-3.5" /> Verificada {formatDate(job.verifiedAt)}
            </span>
            {job.workplaceMode && <span className="rounded-full bg-[#f4f1ea] px-3 py-1 text-xs font-semibold text-[#625c52]">{workplaceLabel(job.workplaceMode)}</span>}
          </div>

          {job.summary && (
            <section>
              <h2 className="text-base font-semibold">Sobre la oferta</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[#5f594f]">{job.summary}</p>
            </section>
          )}

          <section>
            <h2 className="text-base font-semibold">Datos confirmados por la fuente</h2>
            <p className="mt-1 text-xs text-muted-foreground">Los campos no publicados por la empresa se omiten; AL LÍO no los completa ni los estima.</p>
            <dl className="mt-4 grid gap-x-8 gap-y-5 border-y border-[#eee8df] py-5 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Empresa" value={job.employer} />
              <Fact label="Ubicación" value={location || null} />
              <Fact label="Modalidad" value={workplaceLabel(job.workplaceMode)} />
              <Fact label="Fecha límite" value={job.applicationDeadline ? formatDate(job.applicationDeadline) : null} />
              <Fact label="Contrato" value={job.contractType} />
              <Fact label="Jornada" value={job.workingTime} />
              <Fact label="Horario" value={job.schedule} />
              <Fact label="Salario" value={salaryLabel(job)} />
              <Fact label="Formación mínima" value={job.minimumEducation} />
              <Fact label="Experiencia" value={job.experienceRequirements} />
              <Fact label="Idiomas" value={job.languages.length ? job.languages.join(" · ") : null} />
            </dl>
          </section>

          {job.otherEligibility.length > 0 && (
            <section>
              <h2 className="text-base font-semibold">Otros requisitos publicados</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5f594f]">
                {job.otherEligibility.map((entry) => <li key={entry} className="border-l-2 border-[#e8a98f] pl-3">{entry}</li>)}
              </ul>
            </section>
          )}

          {(job.skills.length > 0 || job.moduleCodes.length > 0 || job.topics.length > 0) && (
            <section className="rounded-2xl bg-[#f8f5ef] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9b704f]">Orientación de AL LÍO</p>
              <h2 className="mt-1 text-base font-semibold">Por qué encaja con tu ciclo</h2>
              <p className="mt-1 text-xs text-muted-foreground">Esta relación es curricular y está separada de los requisitos publicados por la empresa.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[...job.skills, ...job.moduleCodes, ...job.topics].map((entry) => (
                  <span key={entry} className="rounded-full border border-[#dfd7ca] bg-white px-3 py-1 text-xs font-medium text-[#5f594f]">{entry}</span>
                ))}
              </div>
            </section>
          )}

          <section className="border-t border-[#eee8df] pt-5">
            <h2 className="text-base font-semibold">Fuente y trazabilidad</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span>{job.sourceName}</span>
              <span>Referencia {job.sourceVacancyId}</span>
              <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-[#a83d18] hover:underline">
                Consultar fuente <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            {job.evidence && <p className="mt-2 text-xs text-muted-foreground">{job.evidence.length} evidencias de campo conservadas para esta revisión.</p>}
          </section>
        </main>

        <aside className="space-y-4">
          <div className="rounded-[20px] border border-[#e7e1d7] bg-white p-5 shadow-[0_14px_35px_rgba(36,27,17,0.05)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9a907f]">Estado de la oferta</p>
            <p className="mt-2 text-sm font-semibold">{active ? "Disponible en la fuente" : "Ya no está activa"}</p>
            {job.applicationDeadline && <p className="mt-1 text-xs text-muted-foreground">Cierre publicado: {formatDate(job.applicationDeadline)}</p>}
            {active && (
              <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#edb59f] bg-[#fff8f4] text-sm font-semibold text-[#b94620] transition hover:bg-[#fff0e9]">
                Abrir oferta oficial <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {active ? (
              <div className="mt-3"><VerifiedJobActions job={job} /></div>
            ) : job.privateApplicationId ? (
              <p className="mt-4 text-xs leading-5 text-muted-foreground">Tu historial privado sigue disponible en la pestaña Candidaturas aunque la fuente haya cerrado la oferta.</p>
            ) : null}
          </div>

          {nextJob && nextJob.id !== job.id && (
            <div className="rounded-[20px] border border-[#e7e1d7] bg-white p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9a907f]">Siguiente oferta</p>
              <p className="mt-3 text-sm font-semibold leading-6">{nextJob.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{nextJob.employer}</p>
              <Link href={`/work/jobs/${encodeURIComponent(nextJob.id)}`} className="mt-3 inline-flex text-xs font-semibold text-[#b94620] hover:underline">Ver oferta →</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <div><dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#9a907f]">{label}</dt><dd className="mt-1 text-sm font-medium text-[#26221d]">{value}</dd></div>;
}

function workplaceLabel(value: VerifiedJob["workplaceMode"]): string | null {
  if (value === "remote") return "Remoto";
  if (value === "hybrid") return "Híbrido";
  if (value === "on_site") return "Presencial";
  return null;
}

function salaryLabel(job: VerifiedJob): string | null {
  if ((job.salaryMinMinor === null && job.salaryMaxMinor === null) || !job.salaryCurrency || !job.salaryPeriod) return null;
  const format = (minor: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: job.salaryCurrency! }).format(minor / 100);
  const amount = job.salaryMinMinor !== null && job.salaryMaxMinor !== null
    ? `${format(job.salaryMinMinor)} – ${format(job.salaryMaxMinor)}`
    : format((job.salaryMinMinor ?? job.salaryMaxMinor)!);
  const period = job.salaryPeriod === "hour" ? "hora" : job.salaryPeriod === "month" ? "mes" : "año";
  return `${amount} / ${period}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
