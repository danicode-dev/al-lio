"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "al-lio.cookie-notice.v1";

// AL-LÍO sets only strictly necessary cookies (the session and the sidebar
// preference), so there is nothing to consent to - just a one-time notice,
// centred on screen when the visitor first arrives. The choice lives in
// localStorage, never a cookie.
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

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2A2018]/35 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="al-cookie-title"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl border border-[#e6ddcc] bg-[#fffdf8] p-7 text-center shadow-[0_28px_70px_rgba(40,25,10,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          id="al-cookie-title"
          className="font-[family-name:var(--font-barlow)] text-[20px] font-extrabold tracking-[-0.01em] text-[#2A2018]"
        >
          Solo cookies técnicas
        </p>
        <p className="mt-2.5 text-[14px] leading-relaxed text-[#55514a]">
          Usamos únicamente las cookies necesarias para que la plataforma funcione. Sin analítica, sin publicidad, sin
          rastreo, así que no hay nada que aceptar o rechazar.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#E15D2D] bg-[#E15D2D] px-5 text-[14px] font-semibold text-white transition-colors hover:border-[#c94f24] hover:bg-[#c94f24]"
          >
            Entendido
          </button>
          <Link href="/cookies" className="text-[13px] font-semibold text-[#b94720] underline underline-offset-2">
            Ver política de cookies
          </Link>
        </div>
      </div>
    </div>
  );
}
