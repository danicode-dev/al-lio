import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  Award,
  Clock,
  Filter,
  HeartHandshake,
  Lock,
  MousePointerClick,
  RefreshCw,
  Target,
} from "lucide-react";

import { EcosystemDiagram } from "@/components/landing/ecosystem-diagram";
import { LANDING_MODULES } from "@/components/landing/modules";

const primaryBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E15D2D] bg-[#E15D2D] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#cf5323] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E15D2D]/40 focus-visible:ring-offset-2";
const ghostBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DDD7CE] bg-transparent px-5 text-sm font-semibold text-[#17150f] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E15D2D]/30";
const eyebrow = "text-[12px] font-bold uppercase tracking-[0.16em] text-[#b94720]";
const secTitle = "font-[family-name:var(--font-barlow)] font-extrabold tracking-[-0.01em]";

// Public marketing page served at "/" for signed-out visitors (an
// authenticated visitor is redirected to the dashboard in the route). No
// product screenshots: the animated diagram plus its hover copy is the
// explanation, and the two trust sections separate how content arrives
// from why the project exists.
export function MarketingLanding() {
  return (
    <div className="min-h-screen bg-[#F6F1E6] text-[#17150f]">
      <div className="mx-auto max-w-[1080px] px-6 sm:px-12">
        <header className="flex h-[76px] items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/assets/al_lio_symbol_transparent.png" alt="" width={24} height={23} priority />
            <span className="font-[family-name:var(--font-barlow)] text-[17px] font-black tracking-[0.02em]">AL&nbsp;LÍO</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className={`${ghostBtn} hidden sm:inline-flex`}>Iniciar sesión</Link>
            <Link href="/register" className={primaryBtn}>Crear cuenta</Link>
          </nav>
        </header>
      </div>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_42%_40%_at_50%_8%,rgba(233,162,59,0.15),transparent_60%)]" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1080px] px-6 pb-16 pt-24 text-center sm:px-12">
            <p className={eyebrow}>Plataforma para estudiantes de FP</p>
            <h1 className="mx-auto mt-4 max-w-[16ch] font-[family-name:var(--font-barlow)] text-[44px] font-extrabold leading-[1.03] tracking-[-0.025em] sm:text-[64px]">
              Enfoca. Actúa.<br />
              <span className="text-[#E15D2D]">Logra más.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-[40ch] text-[16px] leading-relaxed text-[#55514a]">
              Tu curso en un panel: tareas, prácticas, cursos, eventos y calendario, con noticias y convocatorias de tu ciclo revisadas cada día.
            </p>
            <div className="mt-7">
              <Link href="/register" className={primaryBtn}>Crear cuenta</Link>
            </div>
            <div className="mt-12 flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#a89f8c]">
              Baja para ver cómo
              <span className="grid h-8 w-8 animate-bounce place-items-center rounded-full border border-[#ddd2bd] text-[#9a8f79] motion-reduce:animate-none">
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1080px] px-6 pb-28 pt-10 sm:px-12">
          <div className="mx-auto max-w-[44ch] text-center">
            <h2 className={`${secTitle} text-[30px]`}>Un panel, todo conectado</h2>
            <p className="mt-2.5 text-[14px] text-[#6b6f72]">
              Cada área habla con las demás. Pasa el ratón por un módulo para ver qué hace.
            </p>
          </div>

          <div className="mt-12">
            <EcosystemDiagram />
          </div>

          {/* Touch fallback for the hover diagram: the same eight modules as a
              plain list, descriptions always visible. */}
          <ul className="mt-2 space-y-3 lg:hidden">
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

          <p className="mt-6 hidden items-center justify-center gap-1.5 text-center text-[12px] text-[#a49d8c] lg:flex">
            <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
            Pasa el ratón por cada módulo para leer qué hace
          </p>
        </section>

        <section className="border-t border-[#ece5d5]">
          <div className="mx-auto grid max-w-[1080px] gap-12 px-6 py-24 sm:px-12 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-16">
            <div>
              <p className={eyebrow}>Cómo llega la info</p>
              <h2 className={`${secTitle} mt-3 max-w-[15ch] text-[30px]`}>Se pone al día solo, cada día</h2>
              <p className="mt-3.5 max-w-[40ch] text-[14.5px] leading-relaxed text-[#55514a]">
                El motor de AL-LÍO revisa fuentes oficiales y del sector. Lo nuevo que pasa el filtro entra en tu panel, listo para leer.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#cfe6d8] bg-[#eaf5ee] px-3 py-1.5 text-[12px] font-semibold text-[#1f7a4d]">
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
          <div
            className="pointer-events-none absolute inset-0 bg-[url('/assets/al_lio_kinetic_background_dark.png')] bg-cover bg-center opacity-[0.09]"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(225,93,45,0.5),transparent)]" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-[1080px] gap-12 px-6 py-24 sm:px-12 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c77a53]">Por qué así</p>
              <h2 className="mt-3.5 max-w-[16ch] font-[family-name:var(--font-barlow)] text-[30px] font-extrabold leading-[1.14] text-[#f1eee9]">
                Una herramienta para el curso, no un feed
              </h2>
              <p className="mt-4 max-w-[38ch] text-[13.5px] leading-[1.85] text-[#93999b]">
                Nació en el Aircury Summer of Code para resolver un problema real de estudiantes de FP: demasiadas apps, demasiado ruido.
              </p>
            </div>
            <div>
              <BandRow icon={Award} title="Proyecto ganador" body="Aircury Summer of Code 2026. Hecho por y para estudiantes de FP." />
              <BandRow icon={Lock} title="Sin anuncios ni terceros" body="No hay seguimiento externo. Tu actividad no se comparte ni se vende." />
              <BandRow icon={HeartHandshake} title="Se sigue construyendo" body="En uso real, con mejoras cada semana a partir de lo que pedís." />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E8E1D2]">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-4 px-6 py-7 text-[12px] sm:px-12">
          <div className="flex items-center gap-2">
            <Image src="/assets/al_lio_symbol_transparent.png" alt="" width={22} height={21} />
            <span className="font-[family-name:var(--font-barlow)] text-[15px] font-black tracking-[0.02em]">AL&nbsp;LÍO</span>
          </div>
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

function BandRow({ icon: Icon, title, body }: { icon: typeof Award; title: string; body: string }) {
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
