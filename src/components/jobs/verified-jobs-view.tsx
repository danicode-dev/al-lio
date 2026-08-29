"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bookmark, BriefcaseBusiness, ExternalLink, MapPin, Search, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerifiedJob, VerifiedJobPrivateAction } from "@/lib/jobs/types";

type Filter = "all" | "remote" | "saved";

export function VerifiedJobsView({
  jobs,
  busyId,
  onAction,
}: {
  jobs: VerifiedJob[];
  busyId: string | null;
  onAction: (job: VerifiedJob, action: VerifiedJobPrivateAction) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return jobs.filter((job) => {
      if (filter === "remote" && job.workplaceMode !== "remote") return false;
      if (filter === "saved" && !job.isSaved) return false;
      if (!needle) return true;
      return [job.title, job.employer, job.province, job.municipality, ...job.skills, ...job.topics]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(needle);
    });
  }, [filter, jobs, query]);

  return (
    <section aria-labelledby="verified-jobs-heading" className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-[#e9e3d8] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#c94d22]" aria-hidden="true" />
            <h2 id="verified-jobs-heading" className="text-sm font-semibold text-[#1f1d1a]">Ofertas verificadas para tu ciclo</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Solo vacantes abiertas con empresa, enlace concreto, vigencia y encaje curricular respaldados por la fuente.
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{jobs.length} activas</span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar ofertas verificadas</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Puesto, empresa, ubicación o aptitud"
            className="h-10 w-full rounded-xl border border-[#e4ded3] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#d88668] focus:ring-4 focus:ring-[#e15d2d]/10"
          />
        </label>
        <div className="flex gap-1 rounded-xl bg-[#f4f1ea] p-1" role="group" aria-label="Filtrar ofertas verificadas">
          {(["all", "remote", "saved"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                filter === value ? "bg-white text-[#b94620] shadow-sm" : "text-[#777166] hover:text-[#332f29]",
              )}
            >
              {value === "all" ? "Todas" : value === "remote" ? "Remotas" : "Guardadas"}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#ded7cb] py-12 text-center">
          <BriefcaseBusiness className="mx-auto h-7 w-7 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-semibold">No hay ofertas en este filtro</p>
          <p className="mt-1 text-xs text-muted-foreground">Prueba otra búsqueda o vuelve a Todas.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#e9e3d8] border-y border-[#e9e3d8]">
          {visible.map((job) => {
            const location = [job.municipality, job.province].filter(Boolean).join(" · ") || workplaceLabel(job.workplaceMode);
            return (
              <article key={job.id} className="group grid gap-3 bg-white px-1 py-5 transition-colors hover:bg-[#fffaf7] sm:grid-cols-[1fr_auto] sm:px-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9b704f]">
                    <span>{job.employer}</span>
                    <span aria-hidden="true">·</span>
                    <span>Verificada {formatDate(job.verifiedAt)}</span>
                  </div>
                  <h3 className="mt-1 text-base font-semibold leading-snug text-[#161411] group-hover:text-[#a83d18]">{job.title}</h3>
                  {job.summary && <p className="mt-1.5 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">{job.summary}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6c665c]">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{location || "Ubicación no indicada"}</span>
                    {job.applicationDeadline && <span>Hasta {formatDate(job.applicationDeadline)}</span>}
                    {job.contractType && <span>{job.contractType}</span>}
                  </div>
                  {(job.skills.length > 0 || job.moduleCodes.length > 0) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Encaje: {[...job.skills, ...job.moduleCodes].slice(0, 4).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={busyId === job.id}
                    onClick={() => onAction(job, job.isSaved ? "unsave" : "save")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ded7cb] px-3 text-xs font-semibold text-[#575148] transition hover:border-[#d88668] hover:text-[#a83d18] disabled:opacity-50"
                  >
                    {job.isSaved ? <X className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                    {job.isSaved ? "Guardada" : "Guardar"}
                  </button>
                  <Link
                    href={`/work/jobs/${encodeURIComponent(job.id)}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#e15d2d] px-3 text-xs font-semibold text-white transition hover:bg-[#c94d22] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e15d2d]/20"
                  >
                    Ver detalles <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function workplaceLabel(value: VerifiedJob["workplaceMode"]): string {
  if (value === "remote") return "Remoto";
  if (value === "hybrid") return "Híbrido";
  if (value === "on_site") return "Presencial";
  return "";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
