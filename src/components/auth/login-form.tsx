"use client";

import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { DemoProfilePicker } from "@/components/auth/demo-profile-picker";
import { loginWithPasswordAction, type PasswordLoginState } from "@/lib/auth/password-login";

const errorCopy: Record<string, string> = {
  missing_code: "Google no devolvió el código de acceso. Inténtalo de nuevo.",
  invalid_state: "La sesión de Google ha caducado. Vuelve a iniciar el acceso.",
  connect_error: "No se pudo completar la conexión con Google.",
  session_error: "Google conectó correctamente, pero no se pudo crear la sesión.",
  google_missing_code: "Google no devolvió el código de acceso. Inténtalo de nuevo.",
  google_invalid_state: "La sesión de Google ha caducado. Vuelve a iniciar el acceso.",
  google_connect_error: "No se pudo completar la conexión con Google.",
  google_session_error: "Google conectó correctamente, pero no se pudo crear la sesión.",
  credentials_invalid: "Correo o clave incorrectos.",
  credentials_unavailable: "No se pudo validar el acceso. Vuelve a intentarlo.",
  email_not_confirmed: "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.",
  confirm_invalid: "Este enlace de confirmación no es válido.",
  confirm_expired: "Este enlace de confirmación ha caducado. Regístrate de nuevo para recibir uno nuevo.",
  confirm_already_used: "Este enlace de confirmación ya se ha usado. Si ya confirmaste tu cuenta, inicia sesión.",
  demo_disabled: "El acceso a los perfiles demo está desactivado temporalmente.",
  demo_unavailable: "Este perfil demo no está disponible ahora mismo.",
  rate_limited: "Demasiados intentos seguidos. Espera unos minutos antes de volver a probar.",
};

const initialPasswordLoginState: PasswordLoginState = { error: null };

export function LoginForm({ error, demoAccessEnabled = false }: { error?: string | null; demoAccessEnabled?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoginState, passwordLoginAction, isPasswordLoginPending] = useActionState(
    loginWithPasswordAction,
    initialPasswordLoginState
  );
  const visibleError = passwordLoginState.error ?? error ?? null;

  return (
    <>
      <style>{`
        :root {
          --alio-terracotta: #E15D2D;
          --alio-graphite: #111111;
          --alio-cream: #F6F1E6;
        }

        @keyframes al-fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        html, body { background: #F6F1E6; }

        /* One light theme, phone through desktop: the app has no dark mode,
           so the login is a single centred card on the same warm cream the
           rest of AL-LÍO uses, with the wordmark anchored top-left like a
           production product and a discreet footer. */
        .login-page {
          position: relative;
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px 72px;
          background: var(--alio-cream);
          isolation: isolate;
        }

        .login-page::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            radial-gradient(ellipse 62% 46% at 50% 0%, rgba(233, 162, 59, 0.14) 0%, transparent 66%),
            radial-gradient(ellipse 56% 40% at 50% 100%, rgba(225, 93, 45, 0.06) 0%, transparent 60%);
        }

        .login-brand-tl {
          position: absolute;
          top: 36px;
          left: 40px;
        }
        .login-brand-tl img {
          width: 132px;
          height: auto;
          display: block;
        }

        .login-card {
          position: relative;
          width: 100%;
          max-width: 396px;
          background: #ffffff;
          border: 1px solid #EBE4D6;
          border-radius: 16px;
          padding: 40px 36px 34px;
          box-shadow: 0 18px 48px rgba(90, 60, 25, 0.09);
          overflow: hidden;
          animation: al-fadeUp 0.5s ease both;
        }
        .login-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #E15D2D 0%, #E9A23B 100%);
        }

        .al-card-heading {
          font-size: 1.6rem;
          font-weight: 700;
          line-height: 1.2;
          color: #111111;
          margin: 0 0 5px 0;
        }
        .al-card-sub {
          font-size: 14px;
          color: #6b6f72;
          margin: 0 0 24px 0;
        }

        .al-form { display: flex; flex-direction: column; gap: 15px; }

        .al-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #111111;
          margin-bottom: 6px;
        }

        .al-input {
          width: 100%;
          height: 50px;
          border-radius: 11px;
          border: 1px solid #DDD7CE;
          background: #ffffff;
          padding: 0 14px 0 40px;
          font-size: 14px;
          color: #111111;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .al-input::placeholder { color: #bbb5a8; }
        .al-input:focus {
          border-color: rgba(225, 93, 45, 0.6);
          box-shadow: 0 0 0 3px rgba(225, 93, 45, 0.12);
        }
        .al-input-password { padding-right: 42px; }

        .al-input-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #9a9589;
          pointer-events: none;
        }

        .al-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9a9589;
          padding: 4px;
          line-height: 0;
          transition: color 0.15s;
        }
        .al-eye-btn:hover { color: #525252; }

        .al-forgot {
          margin-top: 8px;
          text-align: right;
        }
        .al-forgot a {
          font-size: 13px;
          color: #9a9589;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .al-btn-submit {
          width: 100%;
          height: 50px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
        }
        .al-btn-submit:hover:not(:disabled) { transform: translateY(-1px); }
        .al-btn-submit:active:not(:disabled) { transform: translateY(0); }
        .al-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .al-divider { display: flex; align-items: center; gap: 12px; }
        .al-divider-line { flex: 1; height: 1px; background: #E5DECF; }
        .al-divider-text { font-size: 12px; color: #9a9589; }

        .al-google-btn {
          width: 100%;
          height: 44px;
          border-radius: 9px;
          border: 1px solid #DDD7CE;
          background: #ffffff;
          color: #111111;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          box-sizing: border-box;
          transition: background-color 0.15s, border-color 0.15s;
        }
        .al-google-btn:hover { background: #faf6ef; }
        .al-google-btn svg { width: 16px; height: 16px; flex-shrink: 0; }

        .al-signup {
          text-align: center;
          font-size: 14px;
          color: #525252;
          margin: 4px 0 0 0;
        }
        .al-signup a {
          font-weight: 600;
          color: #E15D2D;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .login-foot {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 28px;
          text-align: center;
          font-size: 12px;
          color: #a39d8e;
          margin: 0;
        }

        .al-input:-webkit-autofill,
        .al-input:-webkit-autofill:hover,
        .al-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #111111;
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
          box-shadow: 0 0 0 1000px #ffffff inset;
          caret-color: #111111;
          transition: background-color 9999s ease-out 0s;
        }

        @media (max-width: 560px) {
          .login-page { padding: 24px 16px 64px; }
          .login-brand-tl { top: 24px; left: 24px; }
          .login-brand-tl img { width: 116px; }
          .login-card {
            border: none;
            box-shadow: none;
            background: transparent;
            padding: 96px 6px 24px;
          }
          .login-card::before { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-card { animation: none; }
        }
      `}</style>

      <div className="login-page">
        <div className="login-brand-tl">
          <Image
            src="/assets/al_lio_logo_horizontal_transparent.png"
            alt="AL LÍO"
            width={615}
            height={214}
            style={{ width: 132, height: "auto" }}
            priority
          />
        </div>

        <main className="login-card">
          <h1 className="al-card-heading">Bienvenido de nuevo</h1>
          <p className="al-card-sub">Enfoca, actúa, logra más.</p>

          {visibleError && (
            <div
              role="alert"
              style={{ marginBottom: 16, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", padding: "10px 14px", fontSize: 14, color: "#dc2626" }}
            >
              {errorCopy[visibleError] ?? "No se pudo iniciar sesión. Vuelve a intentarlo."}
            </div>
          )}

          <form action={passwordLoginAction} noValidate className="al-form">
            <div>
              <label htmlFor="login-email" className="al-label">Correo electrónico</label>
              <div style={{ position: "relative" }}>
                <Mail className="al-input-icon" aria-hidden="true" style={{ width: 16, height: 16 }} />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="usuario@ejemplo.com"
                  className="al-input"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="al-label">Contraseña</label>
              <div style={{ position: "relative" }}>
                <Lock className="al-input-icon" aria-hidden="true" style={{ width: 16, height: 16 }} />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  className="al-input al-input-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="al-eye-btn"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
              <div className="al-forgot">
                <Link href="/recuperar">¿Has olvidado tu contraseña?</Link>
              </div>
            </div>

            <button type="submit" disabled={isPasswordLoginPending} className="al-btn-submit al-action-soft">
              {isPasswordLoginPending ? (
                <>
                  <svg style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>

            <div className="al-divider">
              <div className="al-divider-line" />
              <span className="al-divider-text">o continúa con</span>
              <div className="al-divider-line" />
            </div>

            <GoogleLoginButton className="al-google-btn" />

            <p className="al-signup">
              ¿No tienes cuenta?{" "}
              <Link href="/register">Crear cuenta</Link>
            </p>
          </form>

          {demoAccessEnabled && <DemoProfilePicker />}
        </main>

        <p className="login-foot">© 2026 AL LÍO · Menos planes. Más acción.</p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
