import Image from "next/image";
import type { ReactNode } from "react";

// Shared shell for /register, /recuperar and /restablecer. Same warm cream
// ground, single white card with a green top accent, corner symbol and
// footer as the login page (issue #264), so the whole signed-out auth
// surface reads as one green AL-LÍO system instead of the app's terracotta.
// The `.auth-*` classes below are the counterpart of login-form's `.al-*`
// ones; a future pass can lift both onto a shared module.
export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <style>{`
        html, body { background: #F7F3EC; }

        .auth-page {
          position: relative;
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px 84px;
          background: #F7F3EC;
          isolation: isolate;
        }
        .auth-page::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(ellipse 60% 44% at 50% 0%, rgba(31, 91, 70, 0.06) 0%, transparent 68%);
        }

        .auth-brand { position: absolute; top: 36px; left: 40px; }
        .auth-brand img { width: 40px; height: auto; display: block; }

        .auth-card {
          position: relative;
          width: 100%;
          max-width: 396px;
          background: #ffffff;
          border: 1px solid #E6DED2;
          border-radius: 16px;
          padding: 40px 36px 34px;
          box-shadow: 0 18px 48px rgba(40, 40, 30, 0.07);
          overflow: hidden;
        }
        .auth-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #1F5B46;
        }

        .auth-heading {
          font-size: 1.6rem;
          font-weight: 700;
          line-height: 1.2;
          color: #2F2A24;
          margin: 0 0 8px 0;
        }
        .auth-sub {
          font-size: 14px;
          line-height: 1.5;
          color: #7A736B;
          margin: 0 0 22px 0;
        }

        .auth-form { display: flex; flex-direction: column; gap: 15px; }

        .auth-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #2F2A24;
          margin-bottom: 6px;
        }

        .auth-input {
          width: 100%;
          height: 50px;
          border-radius: 11px;
          border: 1px solid #E6DED2;
          background: #ffffff;
          padding: 0 14px;
          font-size: 14px;
          color: #2F2A24;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .auth-input::placeholder { color: #a9a293; }
        .auth-input:focus {
          border-color: rgba(31, 91, 70, 0.55);
          box-shadow: 0 0 0 3px rgba(31, 91, 70, 0.12);
        }

        .auth-submit {
          width: 100%;
          height: 50px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          border: 1px solid #1F5B46;
          background: #1F5B46;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }
        .auth-submit:hover:not(:disabled) { background: #174938; border-color: #174938; transform: translateY(-1px); }
        .auth-submit:active:not(:disabled) { transform: translateY(0); }
        .auth-submit:disabled { opacity: var(--al-disabled-opacity); cursor: not-allowed; }
        .auth-submit:focus-visible { outline: 2px solid rgba(31, 91, 70, 0.5); outline-offset: 2px; }
        .auth-submit .al-spinner { color: #ffffff; }

        .auth-alt {
          text-align: center;
          font-size: 14px;
          color: #4D4842;
          margin: 4px 0 0 0;
        }
        .auth-alt a {
          font-weight: 600;
          color: #1F5B46;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .auth-alt a:hover { color: #174938; }

        .auth-note { text-align: center; }
        .auth-note .auth-heading { margin-bottom: 12px; }
        .auth-note .auth-sub { margin-bottom: 16px; }

        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:hover,
        .auth-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #2F2A24;
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
          box-shadow: 0 0 0 1000px #ffffff inset;
          caret-color: #2F2A24;
          transition: background-color 9999s ease-out 0s;
        }

        .auth-foot {
          position: absolute;
          left: 40px;
          right: 40px;
          bottom: 26px;
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 4px 16px;
          font-size: 12px;
          color: #9a9589;
          margin: 0;
        }
        .auth-foot b { font-weight: 700; color: #7A736B; letter-spacing: 0.01em; }
        .auth-foot a { font-weight: 600; color: #4D4842; text-decoration: underline; text-underline-offset: 2px; }
        .auth-foot a:hover { color: #2F2A24; }

        @media (max-width: 560px) {
          .auth-page { padding: 24px 16px 88px; }
          .auth-brand { top: 24px; left: 24px; }
          .auth-brand img { width: 34px; }
          .auth-card {
            border: none;
            box-shadow: none;
            background: transparent;
            padding: 78px 6px 24px;
          }
          .auth-card::before { display: none; }
          .auth-foot { left: 20px; right: 20px; justify-content: center; text-align: center; }
        }
      `}</style>

      <div className="auth-brand">
        <Image
          src="/assets/al_lio_symbol_transparent.png"
          alt="AL LÍO"
          width={197}
          height={185}
          style={{ width: 40, height: "auto" }}
          priority
        />
      </div>

      <main className="auth-card">{children}</main>

      <p className="auth-foot">
        <b>AL-LÍO</b>
        <span>
          Proyecto desarrollado gracias a la beca Aircury Summer of Code 2026 de{" "}
          <a href="https://www.aircury.es" target="_blank" rel="noreferrer">Aircury SL</a>.
        </span>
      </p>
    </div>
  );
}
