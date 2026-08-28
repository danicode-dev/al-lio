"use client";

// The one thing that happens before the tour: an offer, not an ambush. The
// student decides, and declining is a real answer that is remembered.
export function TourInvite({ onStart, onDecline }: { onStart: () => void; onDecline: () => void }) {
  return (
    <div className="al-tour-invite" role="dialog" aria-label="Recorrido por AL-LÍO">
      <style>{`
        .al-tour-invite {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 960;
          width: 320px;
          max-width: calc(100vw - 32px);
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid #ece7dc;
          background: #fffefa;
          box-shadow: 0 18px 44px rgba(35, 29, 24, 0.18), 0 2px 8px rgba(17, 17, 17, 0.05);
        }
        .al-tour-invite-eyebrow {
          font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
          color: var(--al-action-soft-text, #c94f21);
        }
        .al-tour-invite-title { font-size: 16px; font-weight: 800; line-height: 1.25; color: #111111; }
        .al-tour-invite-body { font-size: 12.5px; line-height: 1.5; color: #6b6f72; }
        .al-tour-invite-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding-top: 6px; }
        .al-tour-invite-ghost {
          border: none; background: none; padding: 6px 2px;
          font-size: 12px; font-weight: 700; color: #6b6f72; cursor: pointer; transition: color .15s;
        }
        .al-tour-invite-ghost:hover { color: var(--al-action-soft-text, #c94f21); }
        .al-tour-invite-primary {
          display: inline-flex; align-items: center; height: 34px; padding: 0 16px;
          border-radius: 11px; border: 1px solid var(--al-action-soft-border, #f2cdbc);
          background: var(--al-action-soft-bg, #fbe7dd); color: var(--al-action-soft-text, #c94f21);
          font-size: 12.5px; font-weight: 800; cursor: pointer;
          transition: background .15s, border-color .15s, color .15s;
        }
        .al-tour-invite-primary:hover {
          background: var(--al-action-soft-bg-hover, #f8dbcc);
          border-color: var(--al-action-soft-border-hover, #efb79f);
          color: var(--al-action-soft-text-hover, #b94720);
        }
        @media (max-width: 767px) {
          .al-tour-invite {
            inset: auto 12px calc(12px + env(safe-area-inset-bottom, 0px)) 12px;
            width: auto;
          }
        }
      `}</style>
      <p className="al-tour-invite-eyebrow">Primeros pasos</p>
      <h2 className="al-tour-invite-title">Bienvenido a AL-LÍO</h2>
      <p className="al-tour-invite-body">Te enseñamos en cuatro pasos dónde está cada cosa. No tocamos nada tuyo.</p>
      <div className="al-tour-invite-actions">
        <button type="button" className="al-tour-invite-ghost" onClick={onDecline}>Explorar por mi cuenta</button>
        <button type="button" className="al-tour-invite-primary" onClick={onStart}>Empezar recorrido</button>
      </div>
    </div>
  );
}
