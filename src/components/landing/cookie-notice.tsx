"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Lang } from "@/components/landing/i18n";
import { messages } from "@/components/landing/i18n";

const STORAGE_KEY = "al-lio.cookie-notice.v1";

type Phase = "hidden" | "in" | "out";

// AL-LÍO sets only strictly necessary cookies, so there is nothing to
// consent to - just a one-time notice. Not a dialog and not a card: a
// small line at the foot of the page, centred, that rises into view once
// (first visit only), waits a few seconds and slips away. It is marked as
// seen the moment it shows, so it never comes back even if ignored.
export function CookieNotice({ lang }: { lang: Lang }) {
  const t = messages[lang].cookie;
  const [phase, setPhase] = useState<Phase>("hidden");
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      seen = false;
    }
    if (seen) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // Ignore - worst case it shows again next visit.
      }
      setPhase("in");
    }, 500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase === "in") {
      const r = requestAnimationFrame(() => setArmed(true));
      const t = window.setTimeout(() => setPhase("out"), 8000);
      return () => {
        cancelAnimationFrame(r);
        window.clearTimeout(t);
      };
    }
    setArmed(false);
    if (phase === "out") {
      const t = window.setTimeout(() => setPhase("hidden"), 400);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-4"
      role="status"
      aria-label={t.aria}
    >
      <p
        className={`pointer-events-auto max-w-[640px] text-center text-[12px] leading-relaxed text-[#7A736B] transition-all duration-[350ms] ease-out [text-shadow:0_0_6px_#F7F3EC,0_0_6px_#F7F3EC,0_0_12px_#F7F3EC] motion-reduce:translate-y-0 motion-reduce:transition-none ${
          phase === "in" && armed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {t.text}{" "}
        <Link href={lang === "es" ? "/cookies" : "/en/cookies"} className="font-semibold text-[#1F5B46] underline underline-offset-2">
          {t.policy}
        </Link>
        {" · "}
        <button
          type="button"
          onClick={() => setPhase("out")}
          className="font-semibold text-[#1F5B46] underline underline-offset-2"
        >
          {t.dismiss}
        </button>
      </p>
    </div>
  );
}
