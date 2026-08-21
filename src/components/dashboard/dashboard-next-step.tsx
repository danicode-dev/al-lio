import Link from "next/link";
import { ArrowRight, CheckCircle2, Route } from "lucide-react";
import type { RoadmapOverview } from "@/lib/fp/roadmap";

export function DashboardNextStep({ roadmap, loadFailed = false }: { roadmap: RoadmapOverview | null; loadFailed?: boolean }) {
  if (!roadmap) {
    return (
      <section className="rounded-[22px] border border-[#e4dfd5] bg-[#114b3b] p-5 text-white shadow-[0_18px_40px_rgba(19,75,59,0.18)]">
        <Route className="h-5 w-5 text-[#ffb08d]" />
        <h2 className="mt-7 text-xl font-extrabold tracking-[-0.025em]">{loadFailed ? "No pudimos cargar tu ruta" : "Prepara tu ruta"}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-white/75">{loadFailed ? "Tus avances siguen guardados. Reintenta la carga para continuar donde lo dejaste." : "Completa tu perfil formativo para recibir un siguiente paso adaptado a ti."}</p>
        <Link href={loadFailed ? "/roadmap" : "/profile"} className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#f06a37] px-4 text-sm font-bold text-white transition hover:bg-[#e15d2d]">
          {loadFailed ? "Abrir ruta" : "Completar perfil"} <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  const { completion, nextStep } = roadmap;

  return (
    <section
      className="relative isolate overflow-hidden rounded-[22px] border border-[#1b6b54] bg-[#0d5a46] p-5 text-white shadow-[0_18px_40px_rgba(19,75,59,0.2)]"
      style={{
        backgroundImage: "linear-gradient(120deg, rgba(8, 83, 63, 0.98), rgba(8, 93, 71, 0.88)), url('/assets/al_lio_kinetic_background_dark.png')",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute -right-10 bottom-[-5.5rem] h-52 w-52 rounded-full border border-white/10" />
      <div className="absolute right-8 top-7 h-12 w-12 rounded-full border border-white/10" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d8f1df]">
          <Route className="h-4 w-4" />
          Sigue con tu ruta
        </div>
        <h2 className="mt-7 text-xl font-extrabold tracking-[-0.03em]">{roadmap.cycleName}</h2>
        <p className="mt-1 text-sm text-white/80">{completion.total ? `Roadmap · ${completion.percent}% completado` : "Tu siguiente paso está preparado"}</p>

        {completion.total > 0 && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-[#f06a37] transition-[width] duration-500" style={{ width: `${completion.percent}%` }} />
          </div>
        )}

        {nextStep ? (
          <>
            <div className="mt-5 border-t border-white/15 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/60">Siguiente competencia obligatoria</p>
              <p className="mt-1 text-sm font-bold leading-5">{nextStep.skillTitle}</p>
              <p className="mt-1 text-xs text-white/65">{nextStep.hasContent ? nextStep.moduleName : `${nextStep.moduleName} · Recursos próximamente`}</p>
            </div>
            <Link href={nextStep.href} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#f06a37] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(240,106,55,0.25)] transition hover:bg-[#e15d2d]">
              {nextStep.hasContent ? "Continuar" : "Ver roadmap"} <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-[#b9e6c6]" />
            Has completado las competencias disponibles.
          </div>
        )}
      </div>
    </section>
  );
}
