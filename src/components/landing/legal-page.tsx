import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { CookieNotice } from "@/components/landing/cookie-notice";
import { LandingFooter } from "@/components/landing/landing-footer";

// Shell for every static page linked from the landing footer: a slim
// header back to "/", a readable prose column, and the shared footer.
// Same warm cream and Barlow/Inter pairing as the landing.
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F6F1E6] text-[#17150f]">
      <header className="mx-auto flex h-[76px] max-w-[1120px] items-center justify-between px-6 sm:px-12">
        <Link href="/" aria-label="Volver al inicio">
          <Image src="/assets/al_lio_wordmark.png" alt="AL-LÍO" width={354} height={96} className="h-6 w-auto" />
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#55514a] hover:text-[#17150f]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Inicio
        </Link>
      </header>

      <main className="mx-auto max-w-[720px] px-6 py-16 sm:px-12">
        <h1 className="font-[family-name:var(--font-barlow)] text-[40px] font-extrabold leading-[1.05] tracking-[-0.02em]">{title}</h1>
        <div className="al-legal-prose mt-10 text-[15px] leading-[1.75] text-[#3f3a31]">{children}</div>
      </main>

      <LandingFooter />
      <CookieNotice />

      <style>{`
        .al-legal-prose h2 { font-family: var(--font-barlow); font-weight: 800; font-size: 20px; letter-spacing: -0.01em; color: #17150f; margin: 34px 0 10px; }
        .al-legal-prose p { margin: 0 0 14px; }
        .al-legal-prose ul { margin: 0 0 14px; padding-left: 20px; list-style: disc; }
        .al-legal-prose li { margin: 6px 0; }
        .al-legal-prose a { color: #b94720; text-decoration: underline; text-underline-offset: 2px; }
        .al-legal-prose strong { font-weight: 600; color: #17150f; }
      `}</style>
    </div>
  );
}
