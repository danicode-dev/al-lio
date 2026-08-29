"use client";

import { useState } from "react";
import { Bookmark, CheckCircle2, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { VerifiedJob } from "@/lib/jobs/types";
import { cn } from "@/lib/utils";

export function VerifiedJobActions({ job }: { job: VerifiedJob }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(job.isSaved);
  const [status, setStatus] = useState(job.privateApplicationStatus);

  async function act(action: "save" | "unsave" | "applied" | "dismiss") {
    setBusy(true);
    try {
      const response = await fetch(`/api/verified-jobs/${encodeURIComponent(job.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error("Verified job action failed");
      const payload = await response.json();
      setSaved(payload.state.isSaved);
      setStatus(payload.state.status);
      if (action === "dismiss") {
        toast.success("Oferta oculta de tus recomendaciones");
        router.push("/work");
      } else {
        toast.success(action === "applied" ? "Candidatura marcada como aplicada" : action === "save" ? "Oferta guardada" : "Oferta quitada de guardados");
        router.refresh();
      }
    } catch {
      toast.error("No se pudo actualizar tu seguimiento");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => act(saved ? "unsave" : "save")}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition disabled:opacity-50",
          saved ? "border-[#d88668] bg-[#fff2ec] text-[#a83d18]" : "border-[#ded7cb] bg-white text-[#403a33] hover:border-[#d88668]",
        )}
      >
        <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
        {saved ? "Guardada" : "Guardar oferta"}
      </button>
      <button
        type="button"
        disabled={busy || status === "aplicada"}
        onClick={() => act("applied")}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#e15d2d] text-sm font-semibold text-white transition hover:bg-[#c94d22] disabled:opacity-60"
      >
        <CheckCircle2 className="h-4 w-4" />
        {status === "aplicada" ? "Marcada como aplicada" : "Ya he aplicado"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => act("dismiss")}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg text-xs font-semibold text-muted-foreground transition hover:bg-[#f4f1ea] hover:text-[#403a33] disabled:opacity-50"
      >
        <EyeOff className="h-3.5 w-3.5" /> Ocultar recomendación
      </button>
    </div>
  );
}
