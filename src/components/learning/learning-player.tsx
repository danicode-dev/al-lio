"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, LoaderCircle, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { addLearningNoteAction, saveLearningProgressAction } from "@/features/learning/server/player-actions";
import { useYouTubePlayer } from "@/components/ruta/use-youtube-player";
import type { LearningResourceDetail } from "@/features/learning/server/repository";
import type { DbFpLearningNote, FpLearningStatus } from "@/lib/db/types";
import { formatTimestamp } from "@/lib/learning/time";
import { insertNoteSorted, resolveInitialSeekSeconds, shouldSaveProgress } from "@/features/learning/domain/player-progress";

export function LearningPlayer({
  resource,
  initialNotes,
  initialSeekSeconds,
}: {
  resource: LearningResourceDetail;
  initialNotes: DbFpLearningNote[];
  initialSeekSeconds: number | null;
}) {
  const [status, setStatus] = useState<FpLearningStatus | null>(resource.status);
  const [notes, setNotes] = useState(initialNotes);
  const [noteBody, setNoteBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const lastSavedRef = useRef(resource.last_position_seconds);
  const savingRef = useRef(false);
  // An explicit "Ir al momento" (initialSeekSeconds) always wins and always
  // seeks. Falling back to the saved position only makes sense once the
  // student is past the first few seconds and has not finished the video.
  const { youtubeRef, playerContainerRef, playerReady, playerError, currentTime, duration, playerState, seekTo, retryPlayer } = useYouTubePlayer(
    resource.youtube_url,
    resolveInitialSeekSeconds(initialSeekSeconds, resource),
  );

  const persist = useCallback(async (nextStatus: FpLearningStatus = "started", force = false) => {
    if (savingRef.current || status === "completed") return;
    const position = Math.max(0, Math.floor(currentTime));
    if (!shouldSaveProgress(position, lastSavedRef.current, force)) return;
    savingRef.current = true;
    try {
      const result = await saveLearningProgressAction(resource.slug, position, duration > 0 ? Math.floor(duration) : resource.duration_seconds, nextStatus);
      if (!result.error && result.status) {
        lastSavedRef.current = position;
        setStatus(result.status);
      }
    } finally {
      savingRef.current = false;
    }
  }, [currentTime, duration, resource.duration_seconds, resource.slug, status]);

  useEffect(() => {
    if (playerState === 1) void persist("started");
    if (playerState === 2) void persist("started", true);
    if (playerState === 0 && status !== "completed") {
      void saveLearningProgressAction(resource.slug, 0, duration > 0 ? Math.floor(duration) : resource.duration_seconds, "completed", "observed").then((result) => {
        if (!result.error && result.status) setStatus(result.status);
      });
    }
  }, [duration, persist, playerState, resource.duration_seconds, resource.slug, status]);

  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") void persist("started", true);
    };
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => document.removeEventListener("visibilitychange", saveWhenHidden);
  }, [persist]);

  function handleAddNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = noteBody.trim();
    if (!body) return;
    startTransition(async () => {
      const result = await addLearningNoteAction(resource.slug, Math.floor(currentTime), body);
      if (result.error || !result.note) {
        toast.error("No se pudo guardar la nota.");
        return;
      }
      setNotes((current) => insertNoteSorted(current, result.note as DbFpLearningNote));
      setNoteBody("");
      if (status !== "completed") setStatus("started");
      toast.success("Nota guardada en Bloc");
    });
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await saveLearningProgressAction(resource.slug, 0, duration > 0 ? Math.floor(duration) : resource.duration_seconds, "completed", "self_declared");
      if (result.error || !result.status) {
        toast.error("No se pudo guardar el progreso.");
        return;
      }
      setStatus(result.status);
      toast.success("Curso completado");
    });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Link href={resource.back_href} className="inline-flex items-center gap-2 text-sm font-bold text-[#6b6f72] hover:text-[#111111]">
        <ArrowLeft className="h-4 w-4" /> Volver a {resource.competency_title}
      </Link>

      <header className="mt-5 flex flex-col gap-4 border-b border-[#e8e2d7] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#e15d2d]">{resource.competency_title}</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-[#111111] sm:text-3xl">{resource.title}</h1>
          <p className="mt-2 text-sm font-semibold text-[#6b6f72]">{resource.provider} · Español · Nivel {resource.level}</p>
        </div>
        <div className="text-sm font-bold text-[#1f7a4d]">
          {status === "completed" ? "Curso completado" : resource.last_position_seconds > 5 ? `Reanudado desde ${formatTimestamp(resource.last_position_seconds)}` : "El progreso se guarda automáticamente"}
        </div>
      </header>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
        <main className="space-y-5">
          <section className="overflow-hidden rounded-[22px] border border-[#ded7ca] bg-white p-3 shadow-[0_16px_38px_rgba(17,17,17,0.07)]">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
              <div ref={playerContainerRef} className="absolute inset-0" />
              {!youtubeRef && <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Vídeo no disponible.</div>}
              {youtubeRef && !playerReady && !playerError && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black text-sm font-semibold text-white/75">
                  <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> Cargando vídeo...</span>
                </div>
              )}
              {youtubeRef && playerError && (
                <div className="absolute inset-0 grid place-items-center bg-[#171717] px-6 text-center text-white">
                  <div>
                    <p className="text-sm font-semibold">{playerError}</p>
                    <button type="button" onClick={retryPlayer} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#111111] hover:bg-[#f2eee6]">
                      <RotateCcw className="h-4 w-4" /> Reintentar
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 px-2 pb-1 pt-4">
              <button type="button" onClick={handleComplete} disabled={isPending || status === "completed"} className="al-action-soft inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:cursor-default">
                <CheckCircle2 className="h-4 w-4" /> {status === "completed" ? "Completado" : isPending ? "Guardando..." : "Marcar como completado"}
              </button>
            </div>
          </section>

          <section className="border-l-2 border-[#e15d2d] pl-5">
            <h2 className="text-sm font-extrabold text-[#111111]">Sobre este curso</h2>
            <p className="mt-2 text-sm leading-6 text-[#656159]">{resource.description}</p>
          </section>
        </main>

        <aside className="rounded-[22px] border border-[#e8e2d7] bg-white p-5 shadow-[0_10px_28px_rgba(17,17,17,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-extrabold text-[#111111]">Mis notas</h2>
            <span className="text-xs font-bold text-[#8a8378]">{notes.length}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#777269]">
            Se añaden a una nota de <Link href="/bloc" className="font-extrabold text-[#e15d2d] hover:underline">Bloc</Link> con el título del vídeo para que puedas editarlas y exportarlas.
          </p>

          <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {notes.length === 0 ? (
              <p className="rounded-xl bg-[#f7f5f0] px-3 py-4 text-sm leading-5 text-[#6b6f72]">Todavía no tienes notas. Se guardarán junto al segundo exacto del vídeo.</p>
            ) : notes.map((note) => (
              <div key={note.id} className="rounded-xl border border-[#eee9df] p-3">
                <button type="button" onClick={() => seekTo(note.timestamp_seconds)} className="text-xs font-extrabold text-[#e15d2d] hover:underline">{formatTimestamp(note.timestamp_seconds)}</button>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-[#444038]">{note.body}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddNote} className="mt-5 border-t border-[#eee9df] pt-4">
            <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} maxLength={4000} rows={4} placeholder="Escribe una nota sobre este momento..." className="w-full resize-y rounded-xl border border-[#ded7ca] px-3 py-2.5 text-sm text-[#111111] outline-none transition focus:border-[#e15d2d] focus:ring-2 focus:ring-[#e15d2d]/15" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[#8a8378]">Minuto {formatTimestamp(currentTime)}</span>
              <button type="submit" disabled={isPending || !noteBody.trim()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#111111] px-3 text-xs font-bold text-white disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> Guardar nota
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
