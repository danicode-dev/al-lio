import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Clock, Filter, GitBranch, Lock, RefreshCw, ShieldCheck, Target } from "lucide-react";

import { EcosystemDiagram } from "@/components/landing/ecosystem-diagram";
import { LANDING_MODULES } from "@/components/landing/modules";

// Graphite primary, hairline ghost secondary: terracotta stays an accent
// (the mark, the diagram) rather than a loud button fill.
const primaryBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#17150f] bg-[#17150f] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2c2721] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17150f]/25 focus-visible:ring-offset-2";
const ghostBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8cfc0] bg-transparent px-5 text-sm font-semibold text-[#17150f] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17150f]/15";
const eyebrow = "text-[12px] font-bold uppercase tracking-[0.16em] text-[#b94720]";
const secTitle = "font-[family-name:var(--font-barlow)] font-extrabold tracking-[-0.01em]";
const shell = "mx-auto max-w-[1120px] px-6 sm:px-12";

function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/al_lio_logo_horizontal.png"
      alt="AL-LÍO"
      width={2172}
      height={724}
      priority
      className={className}
    />
  );
}

// Public marketing page served at "/" for signed-out visitors (an
// authenticated visitor is redirected to the dashboard in the route). The
// first screen holds only the slogan and a scroll cue; the connected
// diagram and its hover copy are the explanation, and the two trust
// sections separate how content arrives from why the project exists. No
// product screenshots.
export function MarketingLanding() {
  return (
    <div className="min-h-screen bg-[#F6F1E6] text-[#17150f]">
      <style>{`
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
      `}</style>

      <header className={`${shell} flex h-[76px] items-center justify-between`}>
        <LogoMark className="h-7 w-auto sm:h-8" />
        <nav className="flex items-center gap-3">
          <Link href="/login" className={`${ghostBtn} hidden sm:inline-flex`}>Iniciar sesión</Link>
          <Link href="/register" className={primaryBtn}>Crear cuenta</Link>
        </nav>
      </header>

      <main>
        {/* First screen: slogan + a single scroll cue, vertically centred. */}
        <section className="relative flex min-h-[calc(100svh-76px)] items-center overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_40%_38%_at_50%_0%,rgba(233,162,59,0.16),transparent_60%)]" aria-hidden="true" />
          <div className={`${shell} relative w-full pb-20 text-center`}>
            <p className={eyebrow}>Plataforma para estudiantes de FP</p>
            <h1 className="mx-auto mt-5 max-w-[18ch] font-[family-name:var(--font-barlow)] text-[48px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[76px]">
              Enfoca. Actúa.<br />
              <span className="text-[#E15D2D]">Logra más.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[46ch] text-[17px] leading-relaxed text-[#55514a]">
              Tu curso en un panel: tareas, prácticas, cursos, eventos y calendario, con noticias y convocatorias de tu ciclo revisadas cada día.
            </p>
            <a
              href="#panel"
              className="mt-10 inline-flex h-14 items-center justify-center gap-2.5 rounded-full border border-[#17150f] bg-[#17150f] px-8 text-[15px] font-semibold text-white transition-colors hover:bg-[#2c2721] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17150f]/25 focus-visible:ring-offset-2"
            >
              Ver cómo funciona
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Where the scroll cue lands: the connected diagram. */}
        <section id="panel" className="scroll-mt-6 py-24 md:py-32">
          <div className={shell}>
            <div className="mx-auto max-w-[60ch] text-center">
              <h2 className={`${secTitle} text-[34px]`}>Un panel, todo conectado</h2>
              <p className="mx-auto mt-3 max-w-[54ch] text-[15px] leading-relaxed text-[#6b6f72]">
                Cada área habla con las demás. Pasa el ratón por un módulo y te dice qué hace.
              </p>
            </div>
            <div className="mt-16">
              <EcosystemDiagram />
            </div>

            {/* The hover copy from the diagram, spelled out for touch. */}
            <ul className="mx-auto mt-14 grid max-w-[560px] gap-3 lg:hidden">
              {LANDING_MODULES.map((module) => {
                const Icon = module.icon;
                return (
                  <li key={module.label} className="flex gap-3 rounded-2xl border border-[#EBE4D6] bg-white p-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#fbe7dd] text-[#E15D2D]">
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-[#35322c]">{module.label}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-[#77726a]">{module.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="border-t border-[#ece5d5]">
          <div className={`${shell} grid gap-12 py-28 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-20`}>
            <div>
              <p className={eyebrow}>Cómo llega la info</p>
              <h2 className={`${secTitle} mt-3 max-w-[15ch] text-[32px]`}>Se pone al día solo, cada día</h2>
              <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-[#55514a]">
                El motor de AL-LÍO revisa fuentes oficiales y del sector. Lo nuevo que pasa el filtro entra en tu panel, listo para leer.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#cfe6d8] bg-[#eaf5ee] px-3 py-1.5 text-[12px] font-semibold text-[#1f7a4d]">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Actualizado hoy
              </span>
            </div>
            <div>
              <FlowRow icon={Filter} title="Pasa un filtro antes de publicarse" body="Se comprueba la fuente y si de verdad te aplica. Lo que no, no llega." />
              <FlowRow icon={Target} title="Se ordena por tu ciclo" body="DAW, DAM, AF, MP, TSAF: cada uno ve lo suyo, no una lista común." />
              <FlowRow icon={Clock} title="Tiene fecha de caducidad" body="La actualidad se retira sola; el panel no se llena de cosas viejas." />
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#0f1417]">
          <div className="pointer-events-none absolute inset-0 bg-[url('/assets/al_lio_kinetic_background_dark.png')] bg-cover bg-center opacity-[0.09]" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(225,93,45,0.5),transparent)]" aria-hidden="true" />
          <div className={`${shell} relative grid gap-12 py-28 md:grid-cols-[0.85fr_1.15fr] md:gap-20`}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c77a53]">El proyecto</p>
              <h2 className="mt-3.5 max-w-[16ch] font-[family-name:var(--font-barlow)] text-[32px] font-extrabold leading-[1.14] text-[#f1eee9]">
                Una herramienta para el curso, no un feed
              </h2>
              <p className="mt-4 max-w-[40ch] text-[14px] leading-[1.85] text-[#93999b]">
                AL-LÍO responde a un problema concreto de la Formación Profesional: la información y las tareas del curso repartidas en demasiados sitios.
              </p>
            </div>
            <div>
              <BandRow icon={ShieldCheck} title="Contenido con criterio" body="Fuentes verificadas y filtradas antes de aparecer en tu panel." />
              <BandRow icon={Lock} title="Sin anuncios ni terceros" body="No hay seguimiento externo. Tu actividad no se comparte ni se vende." />
              <BandRow icon={GitBranch} title="Desarrollo continuo" body="En uso real, con mejoras basadas en cómo se usa la plataforma." />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E8E1D2]">
        <div className={`${shell} flex flex-wrap items-center justify-between gap-4 py-7 text-[12px]`}>
          <LogoMark className="h-6 w-auto" />
          <p className="text-[#77726a]">
            Proyecto ganador del <span className="font-semibold text-[#55514a]">Aircury Summer of Code</span> · 2026
          </p>
          <div className="flex gap-4 text-[#8a857c]">
            <Link href="/login">Iniciar sesión</Link>
            <span>Privacidad</span>
            <span>Términos</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FlowRow({ icon: Icon, title, body }: { icon: typeof Filter; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[24px_1fr] gap-4 border-t border-[#ece5d5] py-4 first:border-t-0 first:pt-0">
      <Icon className="mt-0.5 h-[17px] w-[17px] text-[#9a958a]" aria-hidden="true" />
      <div>
        <p className="text-[13.5px] font-semibold text-[#35322c]">{title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#77726a]">{body}</p>
      </div>
    </div>
  );
}

function BandRow({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[24px_1fr] gap-4 border-t border-white/10 py-4 first:border-t-0 first:pt-0">
      <Icon className="mt-0.5 h-[17px] w-[17px] text-[#cdd3d4]" aria-hidden="true" />
      <div>
        <p className="text-[13.5px] font-semibold text-[#e9e5e0]">{title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#8b9193]">{body}</p>
      </div>
    </div>
  );
}
