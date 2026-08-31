import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Cookies",
  alternates: { canonical: "/en/cookies", languages: { es: "/cookies", en: "/en/cookies" } },
};

export default function CookiesPageEn() {
  return (
    <LegalPage
      lang="en"
      altHref="/cookies"
      title="Cookie policy"
      kicker="Cookies"
      lead={
        <>
          AL-LÍO uses <strong>only the strictly necessary technical cookies</strong> for the platform to work. There are no
          optional cookies, no third-party analytics, no advertising and no tracking.
        </>
      }
      aside={
        <>
          <p className="al-aside-title">No consent banner</p>
          <p>There is nothing to accept or reject, so you won’t see a window asking permission to install cookies.</p>
        </>
      }
    >
      <h2>Which cookies we use</h2>
      <ul>
        <li>
          <strong>Session</strong> — keeps you signed in while you use the platform. It is cleared when you sign out or when
          it expires.
        </li>
        <li>
          <strong>Interface preference</strong> — remembers whether your sidebar is collapsed. It does not identify anyone.
        </li>
      </ul>

      <h2>Local storage</h2>
      <p>
        We save a few preferences in your browser’s local storage (for example, that you have already seen the cookie
        notice). This information never leaves your device.
      </p>

      <h2>How to remove them</h2>
      <p>
        You can clear cookies and local storage from your browser settings at any time. If you do, you will have to sign in
        again.
      </p>
    </LegalPage>
  );
}
