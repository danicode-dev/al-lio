"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { addResourceNoteAction, markResourceStatusAction } from "@/lib/fp/resource-notes-actions";
import { useYouTubePlayer, formatTimestamp } from "@/components/ruta/use-youtube-player";

type ContentStatus = "saved" | "started" | "completed" | "dismissed";

export type RutaPathNote = {
  id: string;
  timestampSeconds: number;
  body: string;
  createdAt: string;
};

export type RutaPathStep = {
  competencyId: string;
  title: string;
  description: string | null;
  obligatoria: boolean;
  primary: {
    idSlug: string;
    videoUrl: string;
    sourceUrl: string;
    resourceTitle: string;
  } | null;
  otherResources: { idSlug: string; title: string; sourceUrl: string }[];
  initialStatus: ContentStatus | null;
  initialNotes: RutaPathNote[];
};

export function RutaPathView({
  hackathonTitle,
  steps,
  initialStepIndex,
}: {
  hackathonTitle: string;
  steps: RutaPathStep[];
  initialStepIndex: number;
}) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(() => Math.min(Math.max(initialStepIndex, 0), steps.length - 1));
  const [stepState, setStepState] = useState(() =>
    steps.map((step) => ({ status: step.initialStatus, notes: step.initialNotes }))
  );
  const [noteBody, setNoteBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const step = steps[activeIndex];
  const current = stepState[activeIndex];
  const { youtubeRef, playerContainerRef, currentTime, seekTo } = useYouTubePlayer(step.primary?.videoUrl);

  const trackableCount = steps.filter((s) => s.primary !== null).length;
  const completedCount = stepState.filter((s, i) => steps[i].primary !== null && s.status === "completed").length;
  const progressPercent = trackableCount > 0 ? Math.round((completedCount / trackableCount) * 100) : 0;

  function goToStep(index: number) {
    setActiveIndex(index);
    setNoteBody("");
  }

  function handleAddNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = noteBody.trim();
    if (!step.primary || !body) return;
    const timestampSeconds = Math.floor(currentTime);
    const idSlug = step.primary.idSlug;

    startTransition(async () => {
      const result = await addResourceNoteAction(idSlug, timestampSeconds, body);
      if (result.error || !result.note) {
        toast.error("No se pudo guardar la nota.");
        return;
      }
      const note = result.note;
      setStepState((current) =>
        current.map((entry, i) =>
          steps[i].primary?.idSlug === idSlug
            ? {
                ...entry,
                notes: [...entry.notes, { id: note.id, timestampSeconds: note.timestamp_seconds, body: note.body, createdAt: note.created_at }].sort(
                  (a, b) => a.timestampSeconds - b.timestampSeconds
                ),
              }
            : entry
        )
      );
      setNoteBody("");
    });
  }

  function handleMarkCompleted() {
    if (!step.primary) return;
    const idSlug = step.primary.idSlug;

    startTransition(async () => {
      const result = await markResourceStatusAction(idSlug, "completed");
      if (result.error || !result.status) {
        toast.error("No se pudo actualizar el estado.");
        return;
      }
      setStepState((current) =>
        current.map((entry, i) => (steps[i].primary?.idSlug === idSlug ? { ...entry, status: result.status } : entry))
      );
      toast.success("Paso marcado como hecho");
    });
  }

  const isCompleted = current.status === "completed";

  return (
    <>
      <style>{`
        .al-path-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: none;
          padding: 0;
          margin-bottom: 14px;
          font-size: 13.5px;
          font-weight: 600;
          color: #6b6f72;
          cursor: pointer;
        }
        .al-path-back:hover { color: #111111; }
        .al-path-back-icon { width: 15px; height: 15px; }

        .al-path-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .al-path-title {
          font-size: clamp(1.4rem, 2.2vw, 1.85rem);
          font-weight: 800;
          color: #111111;
          line-height: 1.2;
          margin: 0 0 6px 0;
          font-family: var(--font-barlow, sans-serif);
        }
        .al-path-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(225, 93, 45, 0.25);
          background: #fbe7dd;
          color: #c94f21;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
        }
        .al-path-progress { text-align: right; flex-shrink: 0; }
        .al-path-progress-label { font-size: 12px; color: #6b6f72; margin: 0 0 6px 0; }
        .al-path-progress-value { font-size: 13px; font-weight: 700; color: #1f7a4d; margin: 0 0 6px 0; }
        .al-path-progress-bar { width: 160px; height: 6px; border-radius: 999px; background: #f0ece2; overflow: hidden; }
        .al-path-progress-fill { height: 100%; background: linear-gradient(90deg, #4C9A6E, #1f7a4d); border-radius: 999px; transition: width 0.2s; }

        .al-path-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
          gap: 20px;
          align-items: start;
        }

        .al-path-main { display: flex; flex-direction: column; gap: 20px; min-width: 0; }

        .al-path-video-card,
        .al-path-stepper-card,
        .al-path-notes-card {
          background: white;
          border: 1px solid #ece7dc;
          border-radius: 20px;
          box-shadow: 0 12px 32px rgba(17, 17, 17, 0.06);
          padding: clamp(16px, 2.5vw, 22px);
        }

        .al-path-video-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 14px;
          overflow: hidden;
          background: #0b0b0b;
        }
        .al-path-video-wrap iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .al-path-video-mount { position: absolute; inset: 0; width: 100%; height: 100%; }
        .al-path-video-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 24px;
          color: #d8d1c2;
          font-size: 13.5px;
        }

        .al-path-step-header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; margin-top: 14px; }
        .al-path-step-title { font-size: 15.5px; font-weight: 700; color: #111111; margin: 0 0 4px 0; }
        .al-path-step-desc { font-size: 13px; color: #6b6f72; margin: 0; max-width: 520px; }

        .al-path-complete-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 700;
          color: white;
          background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%);
          box-shadow: 0 10px 24px rgba(225, 93, 45, 0.22);
          transition: filter 0.15s;
        }
        .al-path-complete-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .al-path-complete-btn:disabled { opacity: 0.7; cursor: default; box-shadow: none; }
        .al-path-complete-icon { width: 14px; height: 14px; }

        .al-path-source-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          color: #6b6f72;
          font-size: 12.5px;
          text-decoration: none;
        }
        .al-path-source-link:hover { color: #111111; text-decoration: underline; }
        .al-path-source-icon { width: 12px; height: 12px; }

        .al-path-section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #6b6f72; margin: 0 0 14px 0; }

        .al-path-stepper { display: flex; align-items: flex-start; overflow-x: auto; padding-bottom: 4px; }
        .al-path-step-item { display: flex; align-items: center; flex-shrink: 0; }
        .al-path-step-line { width: 28px; height: 2px; background: #ece7dc; margin: 15px 2px 0; flex-shrink: 0; }
        .al-path-step-line-done { background: #1f7a4d; }

        .al-path-step-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          width: 84px;
          border: none;
          background: none;
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
        }
        .al-path-step-circle {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          border: 2px solid #e4dfd5;
          background: white;
          color: #6b6f72;
        }
        .al-path-step-circle-done { border-color: #1f7a4d; background: #1f7a4d; color: white; }
        .al-path-step-circle-active { border-color: #E15D2D; background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%); color: white; box-shadow: 0 6px 16px rgba(225, 93, 45, 0.3); }
        .al-path-step-circle-icon { width: 15px; height: 15px; }
        .al-path-step-label { font-size: 11px; text-align: center; color: #6b6f72; line-height: 1.3; }
        .al-path-step-label-active { color: #111111; font-weight: 700; }

        .al-path-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0ece2; }
        .al-path-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid #e4dfd5;
          background: white;
          border-radius: 10px;
          height: 34px;
          padding: 0 12px;
          font-size: 12.5px;
          font-weight: 600;
          color: #333029;
          cursor: pointer;
        }
        .al-path-nav-btn:hover:not(:disabled) { border-color: #d8d1c2; }
        .al-path-nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .al-path-nav-icon { width: 14px; height: 14px; }

        .al-path-notes-card { display: flex; flex-direction: column; height: fit-content; }
        .al-path-notes-empty { font-size: 13px; color: #6b6f72; margin: 0 0 16px 0; }
        .al-path-notes-list { list-style: none; margin: 0 0 16px 0; padding: 0; display: flex; flex-direction: column; gap: 10px; max-height: 300px; overflow-y: auto; }
        .al-path-note { border: 1px solid #f0ece2; border-radius: 12px; padding: 10px 12px; }
        .al-path-note-time {
          display: inline-flex;
          border: none;
          background: #fbe7dd;
          color: #c94f21;
          font-size: 11.5px;
          font-weight: 700;
          border-radius: 6px;
          padding: 2px 7px;
          margin-bottom: 6px;
          cursor: pointer;
        }
        .al-path-note-time:hover { filter: brightness(0.95); }
        .al-path-note-body { font-size: 13.5px; color: #333029; margin: 0; white-space: pre-line; }
        .al-path-note-form { border-top: 1px solid #f0ece2; padding-top: 14px; display: flex; flex-direction: column; gap: 10px; }
        .al-path-note-textarea {
          width: 100%;
          resize: vertical;
          border: 1px solid #e4dfd5;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13.5px;
          font-family: inherit;
          color: #111111;
        }
        .al-path-note-textarea:focus { outline: none; box-shadow: 0 0 0 3px rgba(225, 93, 45, 0.15); border-color: rgba(225, 93, 45, 0.4); }
        .al-path-note-form-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .al-path-note-time-hint { font-size: 12px; color: #6b6f72; }
        .al-path-note-submit {
          height: 34px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          padding: 0 14px;
          font-size: 13px;
          font-weight: 700;
          color: white;
          background: #111111;
        }
        .al-path-note-submit:hover:not(:disabled) { filter: brightness(1.15); }
        .al-path-note-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .al-path-external-card { margin-top: 20px; }
        .al-path-external-hint { font-size: 12px; color: #6b6f72; margin: 0 0 12px 0; }
        .al-path-external-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .al-path-external-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid #f0ece2;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          color: #333029;
          text-decoration: none;
        }
        .al-path-external-link:hover { border-color: #d8d1c2; }
        .al-path-external-icon { width: 13px; height: 13px; color: #6b6f72; flex-shrink: 0; }

        @media (max-width: 840px) {
          .al-path-grid { grid-template-columns: 1fr; }
          .al-path-header { flex-direction: column; }
          .al-path-progress { text-align: left; }
        }
      `}</style>

      <button type="button" className="al-path-back" onClick={() => router.back()}>
        <ArrowLeft className="al-path-back-icon" aria-hidden="true" />
        Volver
      </button>

      <div className="al-path-header">
        <div>
          <h1 className="al-path-title">{hackathonTitle}</h1>
          <span className="al-path-badge">Ruta de preparación</span>
        </div>
        {trackableCount > 0 && (
          <div className="al-path-progress">
            <p className="al-path-progress-label">Progreso de la ruta</p>
            <p className="al-path-progress-value">{progressPercent}% completado</p>
            <div className="al-path-progress-bar">
              <div className="al-path-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="al-path-grid">
        <div className="al-path-main">
          <div className="al-path-video-card">
            <div className="al-path-video-wrap">
              <div className="al-path-video-mount" ref={playerContainerRef} style={{ visibility: youtubeRef ? "visible" : "hidden" }} />
              {!youtubeRef && (
                <p className="al-path-video-fallback">
                  {step.primary ? "Vídeo no disponible." : "Todavía no hay vídeo curado para esta aptitud."}
                </p>
              )}
            </div>

            <div className="al-path-step-header">
              <div>
                <p className="al-path-step-title">
                  Paso {activeIndex + 1} de {steps.length} · {step.title}
                </p>
                {step.description && <p className="al-path-step-desc">{step.description}</p>}
              </div>
              {step.primary && (
                <button type="button" onClick={handleMarkCompleted} disabled={isPending || isCompleted} className="al-path-complete-btn">
                  <CheckCircle2 className="al-path-complete-icon" aria-hidden="true" />
                  {isCompleted ? "Hecho" : isPending ? "Guardando..." : "Marcar como hecho"}
                </button>
              )}
            </div>

            {step.primary && (
              <a href={step.primary.sourceUrl} target="_blank" rel="noreferrer" className="al-path-source-link">
                <ExternalLink className="al-path-source-icon" aria-hidden="true" />
                Ver recurso original
              </a>
            )}

            {step.otherResources.length > 0 && (
              <div className="al-path-external-card">
                <p className="al-path-external-hint">Recursos externos — se abrirán fuera de AL-LÍO</p>
                <ul className="al-path-external-list">
                  {step.otherResources.map((resource) => (
                    <li key={resource.idSlug}>
                      <a href={resource.sourceUrl} target="_blank" rel="noreferrer" className="al-path-external-link">
                        <span>{resource.title}</span>
                        <ExternalLink className="al-path-external-icon" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="al-path-stepper-card">
            <p className="al-path-section-title">Tu ruta de aprendizaje</p>
            <div className="al-path-stepper">
              {steps.map((s, index) => {
                const done = stepState[index].status === "completed";
                const isActive = index === activeIndex;
                return (
                  <div key={s.competencyId} className="al-path-step-item">
                    {index > 0 && <div className={`al-path-step-line ${stepState[index - 1].status === "completed" ? "al-path-step-line-done" : ""}`} />}
                    <button type="button" className="al-path-step-btn" onClick={() => goToStep(index)}>
                      <span
                        className={`al-path-step-circle ${done ? "al-path-step-circle-done" : ""} ${isActive && !done ? "al-path-step-circle-active" : ""}`}
                      >
                        {done ? <Check className="al-path-step-circle-icon" aria-hidden="true" /> : index + 1}
                      </span>
                      <span className={`al-path-step-label ${isActive ? "al-path-step-label-active" : ""}`}>{s.title}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="al-path-nav">
              <button type="button" className="al-path-nav-btn" onClick={() => goToStep(activeIndex - 1)} disabled={activeIndex === 0}>
                <ChevronLeft className="al-path-nav-icon" aria-hidden="true" />
                Anterior
              </button>
              <button
                type="button"
                className="al-path-nav-btn"
                onClick={() => goToStep(activeIndex + 1)}
                disabled={activeIndex === steps.length - 1}
              >
                Siguiente
                <ChevronRight className="al-path-nav-icon" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="al-path-notes-card">
          <p className="al-path-section-title">Mis notas</p>

          {current.notes.length === 0 ? (
            <p className="al-path-notes-empty">Aún no tienes notas en este paso.</p>
          ) : (
            <ul className="al-path-notes-list">
              {current.notes.map((note) => (
                <li key={note.id} className="al-path-note">
                  <button type="button" className="al-path-note-time" onClick={() => seekTo(note.timestampSeconds)}>
                    {formatTimestamp(note.timestampSeconds)}
                  </button>
                  <p className="al-path-note-body">{note.body}</p>
                </li>
              ))}
            </ul>
          )}

          {step.primary ? (
            <form onSubmit={handleAddNote} className="al-path-note-form">
              <textarea
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Escribe una nota sobre este momento del vídeo..."
                className="al-path-note-textarea"
                rows={3}
              />
              <div className="al-path-note-form-footer">
                <span className="al-path-note-time-hint">Se guardará en {formatTimestamp(currentTime)}</span>
                <button type="submit" disabled={isPending || !noteBody.trim()} className="al-path-note-submit">
                  Añadir nota
                </button>
              </div>
            </form>
          ) : (
            <p className="al-path-notes-empty">Las notas estarán disponibles cuando este paso tenga vídeo.</p>
          )}
        </div>
      </div>
    </>
  );
}
