"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "al-lio.cookie-notice.v1";

// AL-LÍO sets only strictly necessary cookies (the session and the sidebar
// preference), so there is nothing to consent to - just a one-time notice
// the visitor dismisses. The choice lives in localStorage, never a cookie.
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Storage can be blocked; showing the notice again is harmless.
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore - the notice simply reappears next visit.
    }
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:left-6 sm:max-w-[420px]">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#e6ddcc] bg-[#fffdf8] p-4 text-[12.5px] leading-relaxed text-[#55514a] shadow-[0_18px_44px_rgba(90,60,25,0.16)] sm:flex-row sm:items-center">
        <p className="flex-1">
          Solo usamos cookies técnicas necesarias para funcionar. Sin analítica, sin publicidad, sin rastreo.{" "}
          <Link href="/cookies" className="font-semibold text-[#b94720] underline underline-offset-2">
            Ver política de cookies
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg border border-[#17150f] bg-[#17150f] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2c2721]"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
