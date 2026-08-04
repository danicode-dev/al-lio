"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { parseYouTubeUrl } from "@/lib/utils";
import { addResourceNoteAction, markResourceStatusAction } from "@/lib/fp/resource-notes-actions";

type YouTubePlayerInstance = {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: { onReady?: () => void };
        }
      ) => YouTubePlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const TYPE_LABELS: Record<string, string> = {
  curso_basico: "Curso básico",
  curso_complementario: "Curso complementario",
  herramienta: "Herramienta",
  recurso: "Recurso",
  evidencia_recomendada: "Evidencia recomendada",
  hackathon: "Hackathon",
  evento: "Evento",
  reto: "Reto",
  convocatoria_practicas: "Prácticas en empresa",
  beca: "Beca",
  comunidad: "Comunidad",
  empleo_busqueda: "Empleo",
  fuente_noticias: "Fuente de noticias",
  instituto: "Instituto",
};

export type RutaItem = {
  idSlug: string;
  title: string;
  type: string;
  description: string;
  entity: string | null;
  sourceUrl: string;
  videoUrl: string;
};

export type RutaNote = {
  id: string;
  timestampSeconds: number;
  body: string;
  createdAt: string;
};

type ContentStatus = "saved" | "started" | "completed" | "dismissed";

function formatTimestamp(seconds: number) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

let youTubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });

  return youTubeApiPromise;
}

export function RutaView({
  item,
  notes: initialNotes,
  initialStatus,
}: {
  item: RutaItem;
  notes: RutaNote[];
  initialStatus: ContentStatus | null;
}) {
  const router = useRouter();
  const youtubeRef = parseYouTubeUrl(item.videoUrl);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [notes, setNotes] = useState(initialNotes);
  const [noteBody, setNoteBody] = useState("");
  const [status, setStatus] = useState<ContentStatus | null>(initialStatus);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!youtubeRef || !playerContainerRef.current) return;
    let cancelled = false;

    const playerVars: Record<string, number | string> =
      youtubeRef.type === "playlist" ? { rel: 0, listType: "playlist", list: youtubeRef.id } : { rel: 0 };

    loadYouTubeApi().then(() => {
      if (cancelled || !playerContainerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        ...(youtubeRef.type === "video" ? { videoId: youtubeRef.id } : {}),
        playerVars,
        events: { onReady: () => setPlayerReady(true) },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeRef?.type, youtubeRef?.id]);

  useEffect(() => {
    if (!playerReady) return;
    const interval = setInterval(() => {
      const time = playerRef.current?.getCurrentTime();
      if (typeof time === "number") setCurrentTime(time);
    }, 1000);
    return () => clearInterval(interval);
  }, [playerReady]);

  function seekTo(seconds: number) {
    playerRef.current?.seekTo(seconds, true);
  }

  function handleAddNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = noteBody.trim();
    if (!body) return;
    const timestampSeconds = Math.floor(currentTime);

    startTransition(async () => {
      const result = await addResourceNoteAction(item.idSlug, timestampSeconds, body);
      if (result.error || !result.note) {
        toast.error("No se pudo guardar la nota.");
        return;
      }
      const note = result.note;
      setNotes((current) =>
        [...current, { id: note.id, timestampSeconds: note.timestamp_seconds, body: note.body, createdAt: note.created_at }].sort(
          (a, b) => a.timestampSeconds - b.timestampSeconds
        )
      );
      setNoteBody("");
    });
  }

  function handleMarkCompleted() {
    startTransition(async () => {
      const result = await markResourceStatusAction(item.idSlug, "completed");
      if (result.error || !result.status) {
        toast.error("No se pudo actualizar el estado.");
        return;
      }
      setStatus(result.status);
      toast.success("Marcado como completado");
    });
  }

  const typeLabel = TYPE_LABELS[item.type] ?? item.type;
  const isCompleted = status === "completed";

  return (
    <>
      <style>{`
        .al-ruta-back {
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
        .al-ruta-back:hover { color: #111111; }
        .al-ruta-back-icon { width: 15px; height: 15px; }

        .al-ruta-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }

        .al-ruta-type-badge {
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

        .al-ruta-done-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          background: #e7f5ee;
          color: #1f7a4d;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
        }
        .al-ruta-done-badge-icon { width: 13px; height: 13px; }

        .al-ruta-title {
          font-size: clamp(1.4rem, 2.2vw, 1.85rem);
          font-weight: 800;
          color: #111111;
          margin: 0 0 4px 0;
          font-family: var(--font-barlow, sans-serif);
        }
        .al-ruta-entity { color: #6b6f72; font-size: 14px; margin: 0 0 20px 0; }

        .al-ruta-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
          gap: 20px;
          align-items: start;
        }

        .al-ruta-main { display: flex; flex-direction: column; gap: 20px; min-width: 0; }

        .al-ruta-video-card,
        .al-ruta-description-card,
        .al-ruta-notes-card {
          background: white;
          border: 1px solid #ece7dc;
          border-radius: 20px;
          box-shadow: 0 12px 32px rgba(17, 17, 17, 0.06);
          padding: clamp(16px, 2.5vw, 22px);
        }

        .al-ruta-video-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 14px;
          overflow: hidden;
          background: #0b0b0b;
        }
        .al-ruta-video-wrap iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .al-ruta-video-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d8d1c2;
          font-size: 13.5px;
        }

        .al-ruta-video-footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 14px;
        }

        .al-ruta-source-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #6b6f72;
          font-size: 13px;
          text-decoration: none;
        }
        .al-ruta-source-link:hover { color: #111111; text-decoration: underline; }
        .al-ruta-source-icon { width: 13px; height: 13px; }

        .al-ruta-complete-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: 40px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          padding: 0 18px;
          font-size: 13.5px;
          font-weight: 700;
          color: white;
          background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%);
          box-shadow: 0 10px 24px rgba(225, 93, 45, 0.22);
          transition: filter 0.15s;
        }
        .al-ruta-complete-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .al-ruta-complete-btn:disabled { opacity: 0.7; cursor: default; box-shadow: none; }
        .al-ruta-complete-icon { width: 15px; height: 15px; }

        .al-ruta-section-title { font-size: 15px; font-weight: 700; color: #111111; margin: 0 0 12px 0; }
        .al-ruta-description-text { font-size: 13.5px; line-height: 1.6; color: #4b4740; margin: 0; white-space: pre-line; }

        .al-ruta-notes-card { display: flex; flex-direction: column; height: fit-content; }

        .al-ruta-notes-empty { font-size: 13px; color: #6b6f72; margin: 0 0 16px 0; }

        .al-ruta-notes-list { list-style: none; margin: 0 0 16px 0; padding: 0; display: flex; flex-direction: column; gap: 10px; max-height: 360px; overflow-y: auto; }

        .al-ruta-note { border: 1px solid #f0ece2; border-radius: 12px; padding: 10px 12px; }

        .al-ruta-note-time {
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
        .al-ruta-note-time:hover { filter: brightness(0.95); }

        .al-ruta-note-body { font-size: 13.5px; color: #333029; margin: 0; white-space: pre-line; }

        .al-ruta-note-form { border-top: 1px solid #f0ece2; padding-top: 14px; display: flex; flex-direction: column; gap: 10px; }

        .al-ruta-note-textarea {
          width: 100%;
          resize: vertical;
          border: 1px solid #e4dfd5;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13.5px;
          font-family: inherit;
          color: #111111;
        }
        .al-ruta-note-textarea:focus { outline: none; box-shadow: 0 0 0 3px rgba(225, 93, 45, 0.15); border-color: rgba(225, 93, 45, 0.4); }

        .al-ruta-note-form-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .al-ruta-note-time-hint { font-size: 12px; color: #6b6f72; }

        .al-ruta-note-submit {
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
        .al-ruta-note-submit:hover:not(:disabled) { filter: brightness(1.15); }
        .al-ruta-note-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 840px) {
          .al-ruta-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <button type="button" className="al-ruta-back" onClick={() => router.back()}>
        <ArrowLeft className="al-ruta-back-icon" aria-hidden="true" />
        Volver
      </button>

      <div className="al-ruta-title-row">
        <span className="al-ruta-type-badge">{typeLabel}</span>
        {isCompleted && (
          <span className="al-ruta-done-badge">
            <CheckCircle2 className="al-ruta-done-badge-icon" aria-hidden="true" />
            Completado
          </span>
        )}
      </div>
      <h1 className="al-ruta-title">{item.title}</h1>
      {item.entity && <p className="al-ruta-entity">{item.entity}</p>}

      <div className="al-ruta-grid">
        <div className="al-ruta-main">
          <div className="al-ruta-video-card">
            <div className="al-ruta-video-wrap">
              {youtubeRef ? (
                <div ref={playerContainerRef} />
              ) : (
                <p className="al-ruta-video-fallback">Vídeo no disponible.</p>
              )}
            </div>
            <div className="al-ruta-video-footer">
              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="al-ruta-source-link">
                <ExternalLink className="al-ruta-source-icon" aria-hidden="true" />
                Ver recurso original
              </a>
              <button type="button" onClick={handleMarkCompleted} disabled={isPending || isCompleted} className="al-ruta-complete-btn">
                <CheckCircle2 className="al-ruta-complete-icon" aria-hidden="true" />
                {isCompleted ? "Completado" : isPending ? "Guardando..." : "Marcar como completado"}
              </button>
            </div>
          </div>

          {item.description && (
            <div className="al-ruta-description-card">
              <h2 className="al-ruta-section-title">Sobre este recurso</h2>
              <p className="al-ruta-description-text">{item.description}</p>
            </div>
          )}
        </div>

        <div className="al-ruta-notes-card">
          <h2 className="al-ruta-section-title">Mis notas</h2>

          {notes.length === 0 ? (
            <p className="al-ruta-notes-empty">Aún no tienes notas en este vídeo.</p>
          ) : (
            <ul className="al-ruta-notes-list">
              {notes.map((note) => (
                <li key={note.id} className="al-ruta-note">
                  <button type="button" className="al-ruta-note-time" onClick={() => seekTo(note.timestampSeconds)}>
                    {formatTimestamp(note.timestampSeconds)}
                  </button>
                  <p className="al-ruta-note-body">{note.body}</p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddNote} className="al-ruta-note-form">
            <textarea
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Escribe una nota sobre este momento del vídeo..."
              className="al-ruta-note-textarea"
              rows={3}
            />
            <div className="al-ruta-note-form-footer">
              <span className="al-ruta-note-time-hint">Se guardará en {formatTimestamp(currentTime)}</span>
              <button type="submit" disabled={isPending || !noteBody.trim()} className="al-ruta-note-submit">
                Añadir nota
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
