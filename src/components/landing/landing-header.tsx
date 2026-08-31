import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Globe } from "lucide-react";

// The one header used on the landing and every static page: wordmark on
// the left, a language switch (placeholder until bilingual routing lands)
// and a single "Entrar" action on the right. Identical everywhere - no
// per-page "back to home" link.
export function LandingHeader() {
  return (
    <header className="mx-auto flex h-[80px] max-w-[1120px] items-center justify-between px-6 sm:px-12">
      <Link href="/" aria-label="AL-LÍO, inicio">
        <Image src="/assets/al_lio_wordmark.png" alt="AL-LÍO" width={354} height={96} priority className="h-7 w-auto sm:h-8" />
      </Link>
      <nav className="flex items-center gap-4 sm:gap-5">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#4D4842] transition-colors hover:text-[#2F2A24]"
          aria-label="Cambiar idioma"
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          ES
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#1F5B46] bg-[#1F5B46] px-5 text-[15px] font-semibold text-white transition-colors hover:border-[#174938] hover:bg-[#174938] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5B46]/30 focus-visible:ring-offset-2"
        >
          Entrar
        </Link>
      </nav>
    </header>
  );
}
