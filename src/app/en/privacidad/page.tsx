import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";
import { PUBLIC_CONTACT_EMAILS } from "@/lib/public-contact";

export const metadata: Metadata = {
  title: "Privacy",
  alternates: { canonical: "/en/privacidad", languages: { es: "/privacidad", en: "/en/privacidad" } },
};

export default function PrivacyPageEn() {
  return (
    <LegalPage
      lang="en"
      altHref="/privacidad"
      title="Privacy"
      kicker="Data protection"
      lead="AL-LÍO is a platform for vocational-training students. We handle the minimum data needed for the tool to work and we do not share your information with third parties for commercial purposes."
      aside={
        <>
          <p className="al-aside-title">What we don’t do</p>
          <p>
            We don’t sell or share your data for commercial purposes, we don’t build advertising profiles, and there is no
            third-party analytics, advertising or embedded social media. Google is only involved if you choose to sign in or
            sync your calendar with that account.
          </p>
        </>
      }
    >
      <h2>What data we store</h2>
      <ul>
        <li>Your email address and, if you register with Google, your public name.</li>
        <li>Your training programme, so we can tailor the content you see.</li>
        <li>The content you create on the platform: tasks, notes, favourites, course progress.</li>
        <li>Essential technical data: your session and your sidebar preference.</li>
      </ul>

      <h2>What we use it for</h2>
      <p>
        Only to provide the service: to identify you, show you what matches your programme, save your work and keep you
        signed in.
      </p>

      <h2>Legal basis</h2>
      <p>
        Processing is based on delivering the service you request when you create your account and on your consent. You can
        withdraw it at any time by deleting your account.
      </p>

      <h2>Retention</h2>
      <p>
        We keep your data while your account is active. If you delete it, we erase your information except for what we are
        legally required to keep.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access, rectify, erase, restrict or object to the processing of your data, and request its portability.
        Write to us at{" "}
        <a href={`mailto:${PUBLIC_CONTACT_EMAILS.privacy}`}><strong>{PUBLIC_CONTACT_EMAILS.privacy}</strong></a>. You can
        also lodge a complaint with the{" "}
        <a href="https://www.aepd.es" target="_blank" rel="noreferrer">Spanish Data Protection Agency</a>.
      </p>

      <h2>Third parties</h2>
      <p>
        We use <a href="https://www.google.com/policies/privacy/" target="_blank" rel="noreferrer">Google</a> only if you
        choose to sign in or sync your calendar with that account, and with the minimum scope needed. There is no
        third-party analytics, advertising or embedded social media.
      </p>
    </LegalPage>
  );
}
