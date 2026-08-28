"use client";

// The one thing that happens before the tour: an offer, not an ambush. The
// student decides, and declining is a real answer that is remembered.
export function TourInvite({ onStart, onDecline }: { onStart: () => void; onDecline: () => void }) {
  return (
    <>
      <style>{`
        /* Centred, over a dimmed page: this is the first thing a new student
           sees, and in the bottom corner it read as a notification to
           dismiss rather than as the start of something. */
        .al-tour-invite-scrim {
          position: fixed;
          inset: 0;
          z-index: 955;
          background: rgba(35, 29, 24, 0.45);
        }
        .al-tour-invite {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 960;
          width: 380px;
          max-width: calc(100vw - 32px);
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 24px;
          border-radius: 20px;
          border: 1px solid #ece7dc;
          background: #fffefa;
          box-shadow: 0 24px 60px rgba(35, 29, 24, 0.28), 0 2px 8px rgba(17, 17, 17, 0.06);
        }
        .al-tour-invite-eyebrow {
          font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
          color: var(--al-action-soft-text, #c94f21);
        }
        .al-tour-invite-title { font-size: 16px; font-weight: 800; line-height: 1.25; color: #111111; }
        .al-tour-invite-body { font-size: 12.5px; line-height: 1.5; color: #6b6f72; }
        .al-tour-invite-actions { display: flex; align-items: center; justify-content: flex-end; gap: 14px; padding-top: 14px; }
        .al-tour-invite-ghost {
          border: none; background: none; padding: 8px 4px; white-space: nowrap;
          font-size: 12.5px; font-weight: 700; color: #6b6f72; cursor: pointer; transition: color .15s;
        }
        .al-tour-invite-ghost:hover { color: var(--al-action-soft-text, #c94f21); }
        /* Wide enough that the label never wraps onto two lines, which is what
           made this button look cramped. */
        .al-tour-invite-primary {
          display: inline-flex; align-items: center; justify-content: center;
          height: 42px; padding: 0 22px; white-space: nowrap;
          border-radius: 12px; border: 1px solid var(--al-action-soft-border, #f2cdbc);
          background: var(--al-action-soft-bg, #fbe7dd); color: var(--al-action-soft-text, #c94f21);
          font-size: 13px; font-weight: 800; cursor: pointer;
          transition: background .15s, border-color .15s, color .15s;
        }
        .al-tour-invite-primary:hover {
          background: var(--al-action-soft-bg-hover, #f8dbcc);
          border-color: var(--al-action-soft-border-hover, #efb79f);
          color: var(--al-action-soft-text-hover, #b94720);
        }
        @media (max-width: 767px) {
          .al-tour-invite { width: calc(100vw - 24px); padding: 20px; }
          .al-tour-invite-actions { flex-direction: column-reverse; align-items: stretch; gap: 10px; }
          .al-tour-invite-primary { width: 100%; }
        }
      `}</style>
      {/* A sibling, not a child: the panel is centred with a transform, and a
          fixed child inside a transformed element is positioned against that
          element instead of the viewport. */}
      <div className="al-tour-invite-scrim" aria-hidden="true" />
      <div className="al-tour-invite" role="dialog" aria-label="Recorrido por AL-LÍO">
        <p className="al-tour-invite-eyebrow">Primeros pasos</p>
        <h2 className="al-tour-invite-title">Bienvenido a AL-LÍO</h2>
        <p className="al-tour-invite-body">Te enseñamos en cinco pasos dónde está cada cosa. No tocamos nada tuyo.</p>
        <div className="al-tour-invite-actions">
          <button type="button" className="al-tour-invite-ghost" onClick={onDecline}>Explorar por mi cuenta</button>
          <button type="button" className="al-tour-invite-primary" onClick={onStart}>Empezar recorrido</button>
        </div>
      </div>
    </>
  );
}
