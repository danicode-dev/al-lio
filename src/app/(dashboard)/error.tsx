"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center px-4">
      <div role="alert" className="w-full rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-[0_18px_50px_rgba(17,17,17,0.08)]">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-[#111111]">No hemos podido cargar esta pantalla</h1>
        <p className="mt-2 text-sm leading-6 text-[#6b6f72]">Tus datos no se han modificado. Puedes reintentar sin perder el progreso guardado.</p>
        <button type="button" onClick={reset} className="al-action-soft mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition">
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      </div>
    </div>
  );
}
