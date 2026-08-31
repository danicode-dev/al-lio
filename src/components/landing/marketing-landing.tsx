import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { CookieNotice } from "@/components/landing/cookie-notice";
import { EcosystemDiagram } from "@/components/landing/ecosystem-diagram";
import { HtmlLang } from "@/components/landing/html-lang";
import type { Lang } from "@/components/landing/i18n";
import { messages } from "@/components/landing/i18n";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LANDING_MODULES } from "@/components/landing/modules";

// Type system for the whole landing and its legal pages, fixed - do not
// introduce more families or weights:
//   - Display (h1/h2 only): Barlow, weight 800  (var(--font-barlow))
//   - Everything else:       Inter, 400/500/600/700  (the app default)
// Colour (AL-LÍO style guide): no pure black, no orange as an interface
// colour. Warm ink #2F2A24 for headings, green #1F5B46 for every action
// and accent, cream #F7F3EC ground, warm greys for support text.
// Actions are text + arrow, nothing behind them: no fill, no border, no
// highlighter. Hover/focus just underlines.
const linkAction =
  "group inline-flex items-center gap-1.5 font-semibold text-[#1F5B46] underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:underline focus-visible:decoration-2";
const eyebrow = "text-[13px] font-bold uppercase tracking-[0.16em] text-[#1F5B46]";
const secTitle = "font-[family-name:var(--font-barlow)] font-extrabold tracking-[-0.01em]";
const shell = "mx-auto max-w-[1120px] px-6 sm:px-12";

// Public marketing page served at "/" (Spanish) and "/en" (English) for
// signed-out visitors; an authenticated visitor is redirected to the
// dashboard in the route. The first screen holds only the slogan and a
// scroll cue; the connected diagram and the per-cycle section are the
// explanation. No product screenshots, no bordered white cards.
export function MarketingLanding({ lang, altHref }: { lang: Lang; altHref: string }) {
  const t = messages[lang];
  const projectHref = lang === "es" ? "/proyecto" : "/en/proyecto";

  return (
    <div className="relative min-h-screen bg-[#F7F3EC] text-[#2F2A24]">
      <HtmlLang lang={lang} />
      <style>{`
        html { scroll-behavior: smooth; }
        /* The diagram's guided animation carries the module copy; the plain
           list is only a fallback for visitors who turn motion off. */
        .al-rm-fallback { display: none; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .al-rm-fallback { display: block; }
        }
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
        <LandingHeader lang={lang} altHref={altHref} />

        <main>
          {/* First screen: slogan + a single scroll cue, vertically centred. */}
          <section className="relative flex min-h-[calc(100svh-80px)] items-center overflow-hidden">
            <div className={`${shell} relative w-full pb-20 text-center`}>
              <p className={eyebrow}>{t.hero.eyebrow}</p>
              <h1 className="mx-auto mt-5 max-w-[18ch] font-[family-name:var(--font-barlow)] text-[50px] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#2F2A24] sm:text-[78px]">
                {t.hero.titleLines[0]}<br />
                {t.hero.titleLines[1]}
              </h1>
              <p className="mx-auto mt-6 max-w-[46ch] text-[18px] leading-relaxed text-[#4D4842]">
                {t.hero.lead}
              </p>
              <a href="#panel" className={`${linkAction} mt-12 text-[18px]`}>
                {t.hero.scrollCue}
                <ChevronDown className="h-5 w-5 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
              </a>
            </div>
          </section>

          {/* Where the scroll cue lands: the connected diagram. */}
          <section id="panel" className="scroll-mt-6 border-y border-[#E6DED2] py-24 md:py-32">
            <div className={shell}>
              <div className="mx-auto max-w-[60ch] text-center">
                <h2 className={`${secTitle} text-[36px]`}>{t.panel.title}</h2>
                <p className="mx-auto mt-3 max-w-[54ch] text-[16px] leading-relaxed text-[#7A736B]">
                  {t.panel.lead}
                </p>
              </div>
              <div className="mt-16">
                <EcosystemDiagram lang={lang} />
              </div>

              {/* The diagram's animation spells out each module at the hub.
                  This list is only revealed when motion is turned off. */}
              <ul className="al-rm-fallback mx-auto mt-12 max-w-[560px] divide-y divide-[#E6DED2]">
                {LANDING_MODULES.map((module) => {
                  const m = t.modules[module.key];
                  return (
                    <li key={module.key} className="py-4 first:pt-0 last:pb-0">
                      <p className="text-[15px] font-semibold text-[#1F5B46]">{m.label}</p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-[#7A736B]">{m.description}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* Closing section: what each professional family gets. Title on
              the left, a short summary + the project link level with it on
              the right, then the four families with room to breathe. */}
          <section className="border-t border-[#E6DED2]">
            <div className={`${shell} py-24 md:py-28`}>
              <div className="grid gap-x-16 gap-y-8 md:grid-cols-[1fr_0.9fr] md:items-start">
                <div>
                  <p className={eyebrow}>{t.cycle.eyebrow}</p>
                  <h2 className={`${secTitle} mt-3 text-[32px] sm:text-[36px]`}>{t.cycle.title}</h2>
                </div>
                <div className="md:pt-9">
                  <p className="text-[16px] leading-relaxed text-[#4D4842]">{t.cycle.lead}</p>
                  <Link href={projectHref} className={`${linkAction} mt-6 text-[15px]`}>
                    {t.cycle.projectLink}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Marked on one edge, not boxed: a green rule down the left
                  tells each family apart. Name and code share a line so the
                  block never runs to a needless second row. */}
              <div className="mt-16 grid gap-x-14 gap-y-12 sm:grid-cols-2">
                {t.cycle.families.map((cycle) => (
                  <div key={cycle.code} className="border-l-2 border-[#1F5B46]/35 pl-6">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-[19px] font-bold text-[#2F2A24]">{cycle.name}</p>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1F5B46]">{cycle.code}</p>
                    </div>
                    <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#7A736B]">{cycle.line}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <LandingFooter lang={lang} />
      </div>

      <CookieNotice lang={lang} />
    </div>
  );
}
