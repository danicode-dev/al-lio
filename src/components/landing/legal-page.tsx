import type { ReactNode } from "react";

import { CookieNotice } from "@/components/landing/cookie-notice";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";

// Shell for every static page linked from the landing footer. Not a flat
// column: a kicker + large Barlow title, an optional lead / side note laid
// out asymmetrically, then a readable prose column whose sections each
// carry a short green rule. Same warm cream and Barlow/Inter pairing
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
    <div className="min-h-screen bg-[#F7F3EC] text-[#2F2A24]">
      <LandingHeader />

      <main className="mx-auto max-w-[1120px] px-6 py-16 sm:px-12 sm:py-20">
        <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#1F5B46]">{kicker ?? "AL-LÍO"}</p>
        <h1 className="mt-4 max-w-[16ch] font-[family-name:var(--font-barlow)] text-[44px] font-extrabold leading-[1.04] tracking-[-0.02em] sm:text-[56px]">
          {title}
        </h1>

        {(lead || aside) && (
          <div className="mt-10 grid max-w-[920px] gap-x-16 gap-y-10 border-b border-[#E6DED2] pb-12 lg:grid-cols-[1.3fr_1fr]">
            <div>
              {lead && <p className="text-[19px] leading-[1.6] text-[#4D4842]">{lead}</p>}
            </div>
            {aside && (
              <aside className="border-l-2 border-[#1F5B46]/40 pl-6 text-[15px] leading-[1.7] text-[#7A736B]">
                {aside}
              </aside>
            )}
          </div>
        )}

        <div className="al-legal-prose mt-14 max-w-[680px] text-[16px] leading-[1.78] text-[#4D4842]">{children}</div>
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
          color: #2F2A24;
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
          background: #1F5B46;
        }
        .al-legal-prose p { margin: 0 0 16px; }
        .al-legal-prose ul { margin: 0 0 16px; padding-left: 22px; list-style: disc; }
        .al-legal-prose li { margin: 8px 0; }
        .al-legal-prose li::marker { color: #8FB3A5; }
        .al-legal-prose a { color: #1F5B46; text-decoration: underline; text-underline-offset: 2px; }
        .al-legal-prose strong { font-weight: 600; color: #2F2A24; }
        .al-aside-title { font-family: var(--font-barlow); font-weight: 800; font-size: 17px; color: #2F2A24; margin-bottom: 8px; }
      `}</style>
    </div>
  );
}
