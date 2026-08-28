"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TourPlacement, TourStep, TourViewport } from "@/lib/onboarding/types";

type Rect = { top: number; left: number; width: number; height: number };

const SPOTLIGHT_PADDING = 8;
const CALLOUT_WIDTH = 340;
const CALLOUT_GAP = 14;

// Geometry is measured live and re-measured on resize, orientation change and
// scroll. Nothing is stored as an absolute coordinate, so switching between
// desktop and mobile in DevTools mid-tour keeps the spotlight on its element.
function useTargetRect(target: HTMLElement | null): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }

    let frame = 0;
    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const box = target.getBoundingClientRect();
        setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      });
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(target);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [target]);

  return rect;
}

function calloutPosition(rect: Rect | null, placement: TourPlacement | undefined): React.CSSProperties {
  if (!rect || placement === "center") {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const width = Math.min(CALLOUT_WIDTH, window.innerWidth - 32);
  const centreX = Math.min(
    Math.max(rect.left + rect.width / 2 - width / 2, 16),
    Math.max(window.innerWidth - width - 16, 16),
  );

  // Flip when the preferred side has no room, so a callout never lands
  // off-screen or on top of the thing it is pointing at.
  const wantsTop = placement === "top";
  const roomAbove = rect.top;
  const roomBelow = window.innerHeight - (rect.top + rect.height);
  const placeAbove = wantsTop ? roomAbove > 200 : roomBelow < 200 && roomAbove > roomBelow;

  return placeAbove
    ? { left: centreX, bottom: window.innerHeight - rect.top + CALLOUT_GAP, width }
    : { left: centreX, top: rect.top + rect.height + CALLOUT_GAP, width };
}

export function TourOverlay({
  phase,
  step,
  index,
  total,
  target,
  busy,
  viewport,
  onStart,
  onNext,
  onPrevious,
  onSkip,
}: {
  phase: "invite" | "running";
  step: TourStep | undefined;
  index: number;
  total: number;
  target: HTMLElement | null;
  busy: boolean;
  viewport: TourViewport;
  onStart: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}) {
  const rect = useTargetRect(phase === "running" ? target : null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (phase === "invite") {
    return (
      <div className="al-tour-invite" role="dialog" aria-label="Recorrido por AL-LÍO">
        <TourStyles />
        <p className="al-tour-eyebrow">Primeros pasos</p>
        <h2 className="al-tour-title">Bienvenido a AL-LÍO</h2>
        <p className="al-tour-body">Antes de empezar, te enseñamos cómo funciona mientras lo usamos contigo.</p>
        <div className="al-tour-actions">
          <button type="button" className="al-tour-ghost" onClick={onSkip}>Explorar por mi cuenta</button>
          <button type="button" className="al-tour-primary" onClick={onStart}>Empezar recorrido</button>
        </div>
      </div>
    );
  }

  if (!step) return null;

  const isMobileSheet = viewport === "mobile";
  const hasSpotlight = Boolean(rect);

  return (
    <>
      <TourStyles />
      {/* Catches stray clicks so a half-finished sequence cannot be broken,
          without freezing the page: Escape and every control stay live. */}
      <div className="al-tour-scrim" aria-hidden="true" />
      {hasSpotlight && rect && (
        <div
          className="al-tour-spotlight"
          aria-hidden="true"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
          }}
        />
      )}
      <div
        className={cn("al-tour-callout", isMobileSheet && "al-tour-sheet")}
        role="dialog"
        aria-live="polite"
        aria-label={step.title}
        style={isMobileSheet ? undefined : calloutPosition(rect, step.placement)}
      >
        <div className="al-tour-callout-head">
          <span className="al-tour-progress">{index + 1} de {total}</span>
          <button type="button" onClick={onSkip} className="al-tour-close" aria-label="Cerrar recorrido">
            <X />
          </button>
        </div>
        <h2 className="al-tour-title">{step.title}</h2>
        <p className="al-tour-body">{step.body}</p>
        <div className="al-tour-actions">
          <button type="button" className="al-tour-ghost" onClick={onSkip}>Omitir</button>
          <div className="al-tour-actions-right">
            {index > 0 && (
              <button type="button" className="al-tour-ghost" onClick={onPrevious} disabled={busy}>Anterior</button>
            )}
            <button type="button" className="al-tour-primary" onClick={onNext} disabled={busy}>
              {busy ? "Un momento…" : index + 1 === total ? "Empezar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function TourStyles() {
  return (
    <style>{`
      .al-tour-scrim { position: fixed; inset: 0; z-index: 80; background: rgba(17,17,17,0.36); backdrop-filter: blur(1px); }
      /* One element, no clip-path: the ring is a huge spread shadow, so the
         cut-out costs nothing to repaint while it moves between targets. */
      .al-tour-spotlight { position: fixed; z-index: 81; border-radius: 14px; pointer-events: none;
        box-shadow: 0 0 0 9999px rgba(17,17,17,0.36), 0 0 0 2px var(--al-action-soft-border-hover), 0 8px 30px rgba(17,17,17,0.18);
        transition: top .32s cubic-bezier(.22,.61,.36,1), left .32s cubic-bezier(.22,.61,.36,1), width .32s cubic-bezier(.22,.61,.36,1), height .32s cubic-bezier(.22,.61,.36,1); }
      .al-tour-callout, .al-tour-invite { position: fixed; z-index: 82; background: white; border: 1px solid #e4dfd5; border-radius: 18px;
        box-shadow: 0 22px 50px rgba(17,17,17,0.22); padding: 16px 18px 14px; color: #111111; }
      .al-tour-invite { top: 50%; left: 50%; transform: translate(-50%,-50%); width: min(400px, calc(100vw - 32px)); }
      .al-tour-callout { animation: al-tour-in .22s ease-out both; }
      @keyframes al-tour-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .al-tour-sheet { left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom) + 12px); top: auto; width: auto; border-radius: 20px; }
      .al-tour-callout-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .al-tour-progress { font-size: 10.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #9a958a; }
      .al-tour-close { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; border: 1px solid #ece7dc; background: white; color: #6b6f72; cursor: pointer; }
      .al-tour-close svg { width: 13px; height: 13px; }
      .al-tour-eyebrow { font-size: 10.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--al-action-soft-text); }
      .al-tour-title { margin-top: 2px; font-size: 16px; font-weight: 800; line-height: 1.25; }
      .al-tour-body { margin-top: 6px; font-size: 13px; line-height: 1.55; color: #4b4740; }
      .al-tour-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 14px; }
      .al-tour-actions-right { display: flex; align-items: center; gap: 8px; }
      .al-tour-ghost { border: none; background: none; padding: 0 4px; font-size: 12px; font-weight: 700; color: #777269; cursor: pointer; }
      .al-tour-ghost:hover:not(:disabled) { color: #333029; }
      .al-tour-ghost:disabled { opacity: .5; cursor: default; }
      .al-tour-primary { display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 11px;
        border: 1px solid var(--al-action-soft-border); background: var(--al-action-soft-bg); color: var(--al-action-soft-text);
        font-size: 12.5px; font-weight: 800; cursor: pointer; transition: background .15s, border-color .15s, color .15s; }
      .al-tour-primary:hover:not(:disabled) { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
      .al-tour-primary:disabled { opacity: .6; cursor: default; }
      @media (prefers-reduced-motion: reduce) {
        .al-tour-spotlight { transition: none; }
        .al-tour-callout { animation: none; }
      }
    `}</style>
  );
}
