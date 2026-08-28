"use client";

import { X } from "lucide-react";

import { isLastStep, type ProductTourStep } from "@/lib/onboarding/tour-steps";

// What the spotlight says. The geometry is decided elsewhere; this is only
// the app's own language - warm surface, terracotta primary, the same radii
// and shadows as every other panel. Deliberately compact: the interface
// underneath is the point, not the card.
export function TourCard({
  step,
  index,
  total,
  onNext,
  onBack,
  onSkip,
}: {
  step: ProductTourStep;
  index: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const last = isLastStep(index);

  return (
    <div className="al-tour-card" role="dialog" aria-label={step.title}>
      <style>{`
        .al-tour-card {
          display: flex;
          flex-direction: column;
          gap: 9px;
          padding: 16px 16px 14px;
          border-radius: 18px;
          border: 1px solid #ece7dc;
          background: #fffefa;
          box-shadow: 0 18px 44px rgba(35, 29, 24, 0.24), 0 2px 8px rgba(17, 17, 17, 0.06);
          color: #111111;
        }
        .al-tour-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .al-tour-card-progress {
          font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
          color: var(--al-action-soft-text, #c94f21);
        }
        .al-tour-card-close {
          display: grid; place-items: center; width: 26px; height: 26px; padding: 0;
          border-radius: 8px; border: 1px solid #ece7dc; background: white; color: #6b6f72; cursor: pointer;
          transition: border-color .15s, color .15s;
        }
        .al-tour-card-close:hover { border-color: var(--al-action-soft-border-hover, #efb79f); color: var(--al-action-soft-text, #c94f21); }
        .al-tour-card-close svg { width: 13px; height: 13px; }
        .al-tour-card-title { font-size: 15.5px; font-weight: 800; line-height: 1.25; }
        .al-tour-card-body { font-size: 12.5px; line-height: 1.5; color: #6b6f72; }
        .al-tour-card-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 8px; }
        /* The closing step has no "Omitir", so its two controls sit together
           on the right instead of drifting apart across the card. */
        .al-tour-card-actions.is-final { justify-content: flex-end; }
        .al-tour-card-actions-right { display: flex; align-items: center; gap: 12px; }
        .al-tour-card-ghost {
          border: none; background: none; padding: 8px 2px; white-space: nowrap;
          font-size: 12px; font-weight: 700; color: #6b6f72; cursor: pointer; transition: color .15s;
        }
        .al-tour-card-ghost:hover { color: var(--al-action-soft-text, #c94f21); }
        .al-tour-card-primary {
          display: inline-flex; align-items: center; justify-content: center;
          height: 38px; padding: 0 20px; white-space: nowrap;
          border-radius: 12px; border: 1px solid var(--al-action-soft-border, #f2cdbc);
          background: var(--al-action-soft-bg, #fbe7dd); color: var(--al-action-soft-text, #c94f21);
          font-size: 12.5px; font-weight: 800; cursor: pointer;
          transition: background .15s, border-color .15s, color .15s;
        }
        .al-tour-card-primary:hover {
          background: var(--al-action-soft-bg-hover, #f8dbcc);
          border-color: var(--al-action-soft-border-hover, #efb79f);
          color: var(--al-action-soft-text-hover, #b94720);
        }
      `}</style>

      <div className="al-tour-card-head">
        <span className="al-tour-card-progress">{index + 1} de {total}</span>
        <button type="button" className="al-tour-card-close" onClick={onSkip} aria-label="Cerrar recorrido">
          <X aria-hidden="true" />
        </button>
      </div>

      <h2 className="al-tour-card-title">{step.title}</h2>
      <p className="al-tour-card-body">{step.body}</p>

      <div className={`al-tour-card-actions${last ? " is-final" : ""}`}>
        {/* The closing beat has nothing left to skip: the only way out is
            forward, into the app. */}
        {!last && <button type="button" className="al-tour-card-ghost" onClick={onSkip}>Omitir</button>}
        <div className="al-tour-card-actions-right">
          {index > 0 && (
            <button type="button" className="al-tour-card-ghost" onClick={onBack}>Atrás</button>
          )}
          <button type="button" className="al-tour-card-primary" onClick={onNext}>
            {last ? "Empezar a usar AL-LÍO" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
