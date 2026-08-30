import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Clock, Code2, Dumbbell, Filter, Landmark, Megaphone, RefreshCw, Target } from "lucide-react";

import { CookieNotice } from "@/components/landing/cookie-notice";
import { EcosystemDiagram } from "@/components/landing/ecosystem-diagram";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LANDING_MODULES } from "@/components/landing/modules";

// Type system for the whole landing and its legal pages, fixed - do not
// introduce more families or weights:
//   - Display (h1/h2 only): Barlow, weight 800  (var(--font-barlow))
//   - Everything else:       Inter, 400/500/600/700  (the app default)
const primaryBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#17150f] bg-[#17150f] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2c2721] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17150f]/25 focus-visible:ring-offset-2";
const ghostBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8cfc0] bg-transparent px-5 text-sm font-semibold text-[#17150f] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17150f]/15";
const eyebrow = "text-[12px] font-bold uppercase tracking-[0.16em] text-[#b94720]";
const secTitle = "font-[family-name:var(--font-barlow)] font-extrabold tracking-[-0.01em]";
const shell = "mx-auto max-w-[1120px] px-6 sm:px-12";

const CYCLES = [
  { code: "DAW · DAM", name: "Desarrollo", icon: Code2, line: "Tecnología, hackathons y ofertas de desarrollo web y multiplataforma." },
  { code: "AF", name: "Administración y Finanzas", icon: Landmark, line: "Gestión, prácticas y convocatorias del ámbito administrativo." },
  { code: "MP", name: "Marketing y Publicidad", icon: Megaphone, line: "Comunicación, eventos y ofertas del sector del marketing." },
  { code: "TSAF", name: "Actividades Físico-deportivas", icon: Dumbbell, line: "Formación y salidas profesionales del ámbito deportivo." },
] as const;

// Public marketing page served at "/" for signed-out visitors (an
// authenticated visitor is redirected to the dashboard in the route). The
// first screen holds only the slogan and a scroll cue; the connected
// diagram and its hover copy are the explanation. No product screenshots.
export function MarketingLanding() {
  return (
    <div className="relative min-h-screen bg-[#F6F1E6] text-[#17150f]">
      <style>{`
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
      `}</style>

      {/* Faint dot grid + paper grain so the cream has some body. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-60 [background-image:radial-gradient(#00000008_1px,transparent_1px)] [background-size:24px_24px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10">
        <header className={`${shell} flex h-[76px] items-center justify-between`}>
          <Image src="/assets/al_lio_logo_horizontal.png" alt="AL-LÍO" width={2172} height={724} priority className="h-7 w-auto sm:h-8" />
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
                Logra más.
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
          <section id="panel" className="scroll-mt-6 border-y border-[#efe7d7] bg-[#FAF6EC] py-24 md:py-32">
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
            <div className={`${shell} grid gap-12 py-24 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-20 md:py-28`}>
              <div>
                <p className={eyebrow}>Cómo llega la info</p>
                <h2 className={`${secTitle} mt-3 max-w-[15ch] text-[30px] sm:text-[32px]`}>Se pone al día solo, cada día</h2>
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

          {/* Closing section: what each professional family gets. */}
          <section className="border-t border-[#ece5d5] bg-[#FAF6EC]">
            <div className={`${shell} py-24 md:py-28`}>
              <div className="max-w-[46ch]">
                <p className={eyebrow}>Para tu ciclo</p>
                <h2 className={`${secTitle} mt-3 text-[30px] sm:text-[32px]`}>Lo que ves depende de lo que estudias</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-[#55514a]">
                  Cada familia profesional recibe sus cursos, prácticas y eventos. Nada de un catálogo común.
                </p>
              </div>
              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {CYCLES.map((cycle) => {
                  const Icon = cycle.icon;
                  return (
                    <div key={cycle.code} className="rounded-2xl border border-[#EBE4D6] bg-white p-5">
                      <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#fbe7dd] text-[#E15D2D]">
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <p className="mt-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9a958a]">{cycle.code}</p>
                      <p className="mt-0.5 text-[14px] font-semibold text-[#35322c]">{cycle.name}</p>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-[#77726a]">{cycle.line}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-12 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className={`${primaryBtn} h-12 px-6`}>Crear cuenta</Link>
                <Link href="/proyecto" className={`${ghostBtn} h-12 px-6`}>Sobre el proyecto</Link>
              </div>
            </div>
          </section>
        </main>

        <LandingFooter />
      </div>

      <CookieNotice />
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
