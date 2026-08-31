import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Lang } from "@/components/landing/i18n";
import { messages } from "@/components/landing/i18n";

// The one header used on the landing and every static page: wordmark on
// the left, a language toggle and a single "Sign in" action on the right.
// Identical everywhere - no per-page "back to home" link.
export function LandingHeader({ lang, altHref }: { lang: Lang; altHref: string }) {
  const t = messages[lang];
  return (
    <header className="mx-auto flex h-[80px] max-w-[1120px] items-center justify-between px-6 sm:px-12">
      <Link href={lang === "es" ? "/" : "/en"} aria-label="AL-LÍO">
        <Image src="/assets/al_lio_wordmark.png" alt="AL-LÍO" width={354} height={96} priority className="h-7 w-auto sm:h-8" />
      </Link>
      <nav className="flex items-center gap-4 sm:gap-5">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold" aria-label={t.nav.langMenu}>
          {lang === "es" ? (
            <>
              <span className="text-[#2F2A24]">ES</span>
              <span aria-hidden="true" className="text-[#c7bda9]">/</span>
              <Link href={altHref} hrefLang="en" className="text-[#7A736B] underline-offset-4 transition-colors hover:text-[#1F5B46] hover:underline">
                EN
              </Link>
            </>
          ) : (
            <>
              <Link href={altHref} hrefLang="es" className="text-[#7A736B] underline-offset-4 transition-colors hover:text-[#1F5B46] hover:underline">
                ES
              </Link>
              <span aria-hidden="true" className="text-[#c7bda9]">/</span>
              <span className="text-[#2F2A24]">EN</span>
            </>
          )}
        </span>
        <Link
          href="/login"
          className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1F5B46] underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:underline focus-visible:decoration-2"
        >
          {t.nav.signIn}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}
