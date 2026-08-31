"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "al-lio.cookie-notice.v1";

// AL-LÍO sets only strictly necessary cookies, so there is nothing to
// consent to - just a one-time notice. Not a dialog and not a card: a
// single small line at the foot of the page, centred, that lifts off the
// background with a cream halo. The choice lives in localStorage.
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

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore - the notice simply reappears next visit.
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-4"
      role="region"
      aria-label="Aviso de cookies"
    >
      <p className="pointer-events-auto max-w-[640px] text-center text-[12px] leading-relaxed text-[#7A736B] [text-shadow:0_0_6px_#F7F3EC,0_0_6px_#F7F3EC,0_0_12px_#F7F3EC]">
        Solo cookies técnicas: sin analítica ni rastreo.{" "}
        <Link href="/cookies" className="font-semibold text-[#1F5B46] underline underline-offset-2">
          Política de cookies
        </Link>
        {" · "}
        <button type="button" onClick={dismiss} className="font-semibold text-[#1F5B46] underline underline-offset-2">
          Entendido
        </button>
      </p>
    </div>
  );
}
