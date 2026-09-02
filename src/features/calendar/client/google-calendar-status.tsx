"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export function GoogleCalendarStatusControl() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/google/calendar/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (alive) setConnected(Boolean(data.connected));
      })
      .catch(() => {
        if (alive) setConnected(false);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function disconnect() {
    setBusy(true);
    try {
      const res = await fetch("/api/google/calendar/status", { method: "DELETE" });
      if (!res.ok) throw new Error("Error al desconectar");
      setConnected(false);
      toast.success("Google Calendar desconectado");
    } catch {
      toast.error("Error al desconectar Google Calendar");
    } finally {
      setBusy(false);
    }
  }

  const label = connected ? "Google Calendar conectado" : "Conectar Google Calendar";

  if (loading) {
    return (
      <span className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-[#ece7dc] bg-white px-3 text-xs font-semibold text-[#9a958a] sm:h-9 sm:w-auto sm:whitespace-nowrap">
        <GoogleGlyph />
        <span>Comprobando Google Calendar…</span>
      </span>
    );
  }

  if (connected) {
    return (
      <button
        type="button"
        className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-100 disabled:opacity-60 sm:h-9 sm:w-auto sm:whitespace-nowrap"
        onClick={disconnect}
        disabled={busy}
        title="Google Calendar conectado. Toca para desconectar."
      >
        <GoogleGlyph />
        <span>{busy ? "Desconectando…" : label}</span>
      </button>
    );
  }

  return (
    <a
      href="/api/google/calendar/auth?next=/dashboard"
      className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-[#f4b398] bg-[#fff7f3] px-3 text-xs font-bold text-[#c94f21] shadow-sm transition-colors hover:bg-[#ffe9df] sm:h-9 sm:w-auto sm:whitespace-nowrap"
      title="Conectar Google Calendar"
    >
      <GoogleGlyph />
      <span>{label}</span>
    </a>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.2a5.3 5.3 0 0 1-2.3 3.48v2.88h3.72c2.18-2 3.44-4.96 3.44-8.37Z" />
      <path fill="#34A853" d="M12 24c3.1 0 5.7-1.03 7.6-2.78l-3.72-2.88c-1.03.69-2.35 1.1-3.88 1.1-2.98 0-5.5-2.01-6.4-4.72H1.75v2.97A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.6 14.72a7.2 7.2 0 0 1 0-4.6V7.15H1.75a12 12 0 0 0 0 10.54l3.85-2.97Z" />
      <path fill="#EA4335" d="M12 4.75c1.68 0 3.19.58 4.38 1.71l3.28-3.28C17.7 1.28 15.1 0 12 0A11.99 11.99 0 0 0 1.75 7.15L5.6 10.12C6.5 7.41 9.02 4.75 12 4.75Z" />
    </svg>
  );
}
