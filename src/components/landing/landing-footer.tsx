import Image from "next/image";
import Link from "next/link";
import { Github } from "lucide-react";

import type { Lang } from "@/components/landing/i18n";
import { messages } from "@/components/landing/i18n";

// Shared footer for the landing and every legal page: the mark, the
// required Aircury SL credit + the open-source (MIT) link, and two short
// link columns. One flowing row on desktop, stacked on a phone.
export function LandingFooter({ lang }: { lang: Lang }) {
  const t = messages[lang].footer;
  // Localise an ES landing path to the current language.
  const p = (path: string) => (lang === "es" ? path : `/en${path}`);
  const GH = "https://github.com/danielgarciaortega-dev/al-lio";

  return (
    <footer className="relative z-10 border-t border-[#E6DED2]">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-6 py-12 text-[14px] sm:px-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-[36ch]">
          <Image src="/assets/al_lio_wordmark.png" alt="AL-LÍO" width={354} height={96} className="h-6 w-auto" />
          <p className="mt-3 leading-relaxed text-[#7A736B]">
            {t.creditBefore}
            <a
              href="https://www.aircury.es"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#4D4842] underline underline-offset-2 hover:text-[#2F2A24]"
            >
              {t.creditLink}
            </a>
            {t.creditAfter}
          </p>
          <a
            href={GH}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[#4D4842] hover:text-[#2F2A24]"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            {t.openSource}
          </a>
        </div>

        <div className="flex gap-12">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7A736B]">{t.productHeading}</p>
            <ul className="space-y-2.5 text-[#4D4842]">
              <li><Link href={p("/proyecto")} className="hover:text-[#2F2A24]">{t.links.project}</Link></li>
              <li><Link href="/login" className="hover:text-[#2F2A24]">{t.links.signIn}</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7A736B]">{t.legalHeading}</p>
            <ul className="space-y-2.5 text-[#4D4842]">
              <li><Link href={p("/privacidad")} className="hover:text-[#2F2A24]">{t.links.privacy}</Link></li>
              <li><Link href={p("/cookies")} className="hover:text-[#2F2A24]">{t.links.cookies}</Link></li>
              <li><Link href={p("/terminos")} className="hover:text-[#2F2A24]">{t.links.terms}</Link></li>
              <li><Link href={p("/accesibilidad")} className="hover:text-[#2F2A24]">{t.links.accessibility}</Link></li>
              <li><Link href={p("/contacto")} className="hover:text-[#2F2A24]">{t.links.contact}</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
