import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { CookieNotice } from "@/components/landing/cookie-notice";
import { LandingFooter } from "@/components/landing/landing-footer";

// Shell for every static page linked from the landing footer. Not a flat
// column: a kicker + large Barlow title, an optional lead / side note laid
// out asymmetrically, then a readable prose column whose sections each
// carry a short terracotta rule. Same warm cream and Barlow/Inter pairing
// as the landing.
export function LegalPage({
  title,
  kicker,
  lead,
  aside,
  children,
}: {
  title: string;
  kicker?: string;
  lead?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F6F1E6] text-[#2A2018]">
      <header className="mx-auto flex h-[80px] max-w-[1040px] items-center justify-between px-6 sm:px-12">
        <Link href="/" aria-label="Volver al inicio">
          <Image src="/assets/al_lio_wordmark.png" alt="AL-LÍO" width={354} height={96} className="h-7 w-auto" />
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#55514a] hover:text-[#2A2018]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Inicio
        </Link>
      </header>

      <main className="mx-auto max-w-[1040px] px-6 py-16 sm:px-12 sm:py-20">
        <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#b94720]">{kicker ?? "AL-LÍO"}</p>
        <h1 className="mt-4 max-w-[16ch] font-[family-name:var(--font-barlow)] text-[44px] font-extrabold leading-[1.04] tracking-[-0.02em] sm:text-[56px]">
          {title}
        </h1>

        {(lead || aside) && (
          <div className="mt-10 grid gap-x-16 gap-y-10 border-b border-[#e4dbc8] pb-12 lg:grid-cols-[1.35fr_1fr]">
            <div>
              {lead && <p className="text-[19px] leading-[1.6] text-[#4a443b]">{lead}</p>}
            </div>
            {aside && (
              <aside className="border-l-2 border-[#E15D2D]/40 pl-6 text-[15px] leading-[1.7] text-[#5b554a]">
                {aside}
              </aside>
            )}
          </div>
        )}

        <div className="al-legal-prose mt-14 max-w-[680px] text-[16px] leading-[1.78] text-[#3f3a31]">{children}</div>
      </main>

      <LandingFooter />
      <CookieNotice />

      <style>{`
        .al-legal-prose > :first-child { margin-top: 0; }
        .al-legal-prose h2 {
          position: relative;
          font-family: var(--font-barlow);
          font-weight: 800;
          font-size: 23px;
          letter-spacing: -0.01em;
          color: #2A2018;
          margin: 44px 0 12px;
          padding-left: 18px;
        }
        .al-legal-prose h2::before {
          content: "";
          position: absolute;
          left: 0;
          top: 7px;
          bottom: 7px;
          width: 4px;
          border-radius: 2px;
          background: #E15D2D;
        }
        .al-legal-prose p { margin: 0 0 16px; }
        .al-legal-prose ul { margin: 0 0 16px; padding-left: 22px; list-style: disc; }
        .al-legal-prose li { margin: 8px 0; }
        .al-legal-prose li::marker { color: #d69a80; }
        .al-legal-prose a { color: #b94720; text-decoration: underline; text-underline-offset: 2px; }
        .al-legal-prose strong { font-weight: 600; color: #2A2018; }
        .al-aside-title { font-family: var(--font-barlow); font-weight: 800; font-size: 17px; color: #2A2018; margin-bottom: 8px; }
      `}</style>
    </div>
  );
}
