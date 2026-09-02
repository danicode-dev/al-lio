import Link from "next/link";
import { ArrowRight, Clock3, Route } from "lucide-react";
import type { RoadmapOverview } from "@/lib/fp/roadmap";

export function DashboardProgress({ roadmap, loadFailed = false }: { roadmap: RoadmapOverview | null; loadFailed?: boolean }) {
  if (!roadmap) {
    if (!loadFailed) return null;
    return (
      <section className="rounded-[20px] border border-[var(--al-warning-border)] bg-[var(--al-warning-surface)] p-5 text-[var(--al-warning-text)] shadow-[0_10px_26px_rgba(17,17,17,0.045)]">
        <p className="text-sm font-bold">Progreso temporalmente no disponible</p>
        <p className="mt-1 text-xs leading-5">No hemos podido consultar tu ruta. Tus datos guardados no se han modificado.</p>
      </section>
    );
  }
  const hasTrackableProgress = roadmap.completion.total > 0;

  return (
    <section className="rounded-[20px] border border-[#ece7dc] bg-white p-5 shadow-[0_10px_26px_rgba(17,17,17,0.045)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#111111]">Tu progreso</p>
          <p className="mt-1 text-xs text-[#6b6f72]">
            {hasTrackableProgress
              ? `${roadmap.completion.completed} de ${roadmap.completion.total} cursos completados.`
              : "El progreso se activará al vincular recursos."}
          </p>
        </div>
        <div
          className="grid h-14 w-14 place-items-center rounded-full"
          style={{ background: `conic-gradient(#f06a37 ${hasTrackableProgress ? roadmap.completion.percent * 3.6 : 0}deg, #f1eee8 0deg)` }}
          aria-label={hasTrackableProgress ? `${roadmap.completion.percent}% completado` : "Progreso pendiente de recursos"}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-xs font-extrabold text-[#111111]">{hasTrackableProgress ? `${roadmap.completion.percent}%` : "—"}</span>
        </div>
      </div>

      <div className="mt-5 border-t border-[#f0ece2] pt-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-[#6b6f72]"><Route className="h-3.5 w-3.5 text-[#1f7a4d]" /> Competencias en curso</p>
        <div className="mt-3 space-y-3">
          {roadmap.focusModules.length ? roadmap.focusModules.map((module) => (
            <div key={module.code}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-semibold text-[#333029]">{module.name}</span>
                <span className="shrink-0 font-bold text-[#6b6f72]">{module.percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#f0ece2]">
                <div className="h-full rounded-full bg-[#f06a37] transition-[width] duration-500" style={{ width: `${module.percent}%` }} />
              </div>
            </div>
          )) : <p className="text-xs text-[#6b6f72]">{hasTrackableProgress ? "No quedan competencias pendientes." : "Tus competencias aparecerán cuando tengan cursos vinculados."}</p>}
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-[#f8f6f1] p-3">
        <div className="flex gap-2">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#9a958a]" />
          <div>
            <p className="text-xs font-bold text-[#333029]">Horas por módulo · Próximamente</p>
            <p className="mt-1 text-xs leading-5 text-[#6b6f72]">Cuando activemos el seguimiento, aquí verás el tiempo dedicado en cada módulo.</p>
          </div>
        </div>
      </div>

      <Link href="/roadmap" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#e15d2d] transition hover:text-[#c6491d]">
        Ver todas las competencias <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
