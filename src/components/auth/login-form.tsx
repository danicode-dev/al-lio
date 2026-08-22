"use client";

import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Image from "next/image";
import { useActionState, useState } from "react";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
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
          --alio-cream: #F5F2EC;
        }

        @keyframes al-fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-shell {
          min-height: 100svh;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.95fr);
          background: var(--alio-cream);
          animation: al-fadeUp 0.5s ease both;
        }

        .login-form-panel {
          background: var(--alio-cream);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: clamp(40px, 6vw, 80px) clamp(20px, 3vw, 40px);
          animation: al-fadeUp 0.65s 0.1s ease both;
        }

        .login-card {
          width: 100%;
          max-width: 480px;
        }

        .login-logo-dark   { display: block; }
        .login-logo-white  { display: none; }
        .login-logo-mobile { display: none; }

        .al-logo-wrap { margin-bottom: 32px; }

        /* Input shared */
        .al-input {
          width: 100%;
          height: 56px;
          border-radius: 12px;
          border: 1px solid #DDD7CE;
          background: white;
          padding: 0 14px 0 42px;
          font-size: 14px;
          color: #111111;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .al-input::placeholder { color: #bbb5a8; }
        .al-input:focus {
          border-color: rgba(225,93,45,0.6);
          box-shadow: 0 0 0 3px rgba(225,93,45,0.12);
        }

        .al-input-password { padding-right: 44px; }

        .al-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9a9589;
          pointer-events: none;
        }

        .al-eye-btn {
          position: absolute;
          right: 14px;
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

        .al-btn-submit {
          width: 100%;
          height: 52px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          color: white;
          background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%);
          box-shadow: 0 16px 32px rgba(225, 93, 45, 0.24);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: filter 0.15s;
        }
        .al-btn-submit:hover:not(:disabled) { filter: brightness(1.08); }
        .al-btn-submit:active:not(:disabled) { filter: brightness(0.93); }
        .al-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; background: #7a7570; box-shadow: none; }

        .al-google-btn {
          width: 100%;
          height: 44px;
          border-radius: 8px;
          border: 1px solid #DDD7CE;
          background: white;
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
        .al-google-btn:hover {
          background: #f5f0e8;
        }
        .al-google-btn svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        /* Autofill — desktop (cream background) */
        .al-input:-webkit-autofill,
        .al-input:-webkit-autofill:hover,
        .al-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #111111;
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
          box-shadow: 0 0 0 1000px #ffffff inset;
          caret-color: #111111;
          transition: background-color 9999s ease-out 0s;
        }

        /* ── Mobile ── */
        @media (max-width: 900px) {
          html, body {
            background: #080B0C !important;
            background-color: #080B0C !important;
            margin: 0;
            padding: 0;
          }

          .login-shell {
            display: block;
            background: #080B0C;
            margin: 0;
            padding: 0;
            animation: none;
          }

          .brand-panel { display: none; }

          /* Solid dark panel without a background image. */
          .login-form-panel {
            animation: none;
            min-height: 100dvh;
            background: #080B0C;
            color: white;
            justify-content: flex-start;
            align-items: stretch;
            padding: 0;
            position: relative;
            isolation: isolate;
          }

          /* Kinetic decoration on an independent ::after layer. */
          .login-form-panel::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 120px;
            background-image: url('/assets/al_lio_kinetic_background_dark.png');
            background-repeat: no-repeat;
            background-position: bottom center;
            background-size: 100% 100%;
            opacity: 0.65;
            pointer-events: none;
            z-index: 0;
            mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 35%, black 100%);
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 35%, black 100%);
          }

          /* Keep the card above the kinetic decoration. */
          .login-card {
            position: relative;
            z-index: 1;
            max-width: 100%;
            width: 100%;
            padding: calc(80px + env(safe-area-inset-top, 0px)) 28px calc(40px + env(safe-area-inset-bottom, 0px));
          }

          /* ── Logo ── */
          .al-logo-wrap {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            margin: 0 0 36px;
          }
          .login-logo-dark   { display: none; }
          .login-logo-white  { display: none; }
          .login-logo-mobile {
            display: block;
            width: clamp(300px, 82vw, 380px);
            max-width: 100%;
            height: auto;
            margin: 0 auto;
            object-fit: contain;
          }

          /* Centred heading and subtitle. */
          .al-card-heading {
            text-align: center !important;
            color: white !important;
            font-size: 1.75rem !important;
          }
          .al-card-sub {
            text-align: center !important;
            color: #888888 !important;
          }

          /* ── Labels ── */
          .al-label { color: #a09890 !important; }

          /* ── Inputs ── */
          .al-input {
            background: #111111 !important;
            border-color: #282828 !important;
            border-radius: 10px !important;
            color: white !important;
            height: 54px !important;
          }
          .al-input::placeholder { color: #545050 !important; }
          .al-input:focus {
            border-color: rgba(225,93,45,0.65) !important;
            box-shadow: 0 0 0 3px rgba(225,93,45,0.14) !important;
          }
          .al-input-icon { color: #545050; }
          .al-eye-btn    { color: #545050; }
          .al-eye-btn:hover { color: #909090; }

          /* Prevent the browser's blue autocomplete background. */
          .al-input:-webkit-autofill,
          .al-input:-webkit-autofill:hover,
          .al-input:-webkit-autofill:focus {
            -webkit-text-fill-color: #ffffff;
            -webkit-box-shadow: 0 0 0 1000px #111111 inset;
            box-shadow: 0 0 0 1000px #111111 inset;
            caret-color: #ffffff;
            transition: background-color 9999s ease-out 0s;
          }

          /* Primary action. */
          .al-btn-submit {
            height: 54px !important;
            border-radius: 10px !important;
            font-size: 16px !important;
            font-weight: 700 !important;
          }

          /* ── Divisor ── */
          .al-divider-line { background: #222222 !important; }
          .al-divider-text { color: #545050 !important; font-size: 13px !important; }

          /* Google button */
          .al-google-btn {
            height: 52px !important;
            border-radius: 10px !important;
            background-color: #111111 !important;
            border-color: #282828 !important;
            color: white !important;
          }
          .al-google-btn:hover { background-color: #1a1a1a !important; }
        }
      `}</style>

      <div className="login-shell">

        {/* ══ LEFT PANEL — brand editorial ══ */}
        <LoginBrandPanel />

        {/* ══ RIGHT PANEL — cream (desktop) / dark (mobile) ══ */}
        <main className="login-form-panel">
          <div className="login-card">

            {/* Logo — dark on cream (desktop), white centered (mobile) */}
            <div className="al-logo-wrap">
              <Image
                className="login-logo-dark"
                src="/assets/al_lio_logo_horizontal_transparent.png"
                alt="AL LÍO"
                width={615}
                height={214}
                style={{ width: "clamp(290px, 30vw, 380px)", height: "auto" }}
                priority
              />
              <Image
                className="login-logo-mobile"
                src="/assets/al_lio_logo_slogan_transparente_1060x360.png"
                alt="AL LÍO — Menos planes. Más acción."
                width={1060}
                height={360}
                sizes="(max-width: 430px) 68vw, 300px"
                priority
              />
            </div>

            <h1 className="al-card-heading" style={{ fontSize: "1.9rem", fontWeight: 700, lineHeight: 1.2, color: "#111111", margin: "0 0 6px 0" }}>
              Bienvenido de nuevo
            </h1>
            <p className="al-card-sub" style={{ fontSize: 15, color: "#525252", margin: "0 0 28px 0" }}>
              Enfoca, actúa, logra más.
            </p>

            {visibleError && (
              <div style={{ marginBottom: 16, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", padding: "10px 14px", fontSize: 14, color: "#dc2626" }}>
                {errorCopy[visibleError] ?? "No se pudo iniciar sesión. Vuelve a intentarlo."}
              </div>
            )}

            <form action={passwordLoginAction} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Email */}
              <div>
                <label htmlFor="login-email" className="al-label" style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#111111", marginBottom: 6 }}>
                  Correo electrónico
                </label>
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

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="al-label" style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#111111", marginBottom: 6 }}>
                  Contraseña
                </label>
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
              </div>

              {/* CTA */}
              <button type="submit" disabled={isPasswordLoginPending} className="al-btn-submit">
                {isPasswordLoginPending ? (
                  <>
                    <svg style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
                      <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="al-divider-line" style={{ flex: 1, height: 1, background: "#DDD7CE" }} />
                <span className="al-divider-text" style={{ fontSize: 12, color: "#9a9589" }}>o continúa con</span>
                <div className="al-divider-line" style={{ flex: 1, height: 1, background: "#DDD7CE" }} />
              </div>

              {/* Google — ancho completo */}
              <GoogleLoginButton className="al-google-btn" />
            </form>

            {demoAccessEnabled && <DemoProfilePicker />}

          </div>
        </main>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
