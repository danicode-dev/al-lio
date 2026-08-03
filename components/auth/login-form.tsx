import Image from "next/image";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";

const errorCopy: Record<string, string> = {
  missing_code: "Google no devolvio el codigo de acceso. Intentalo de nuevo.",
  invalid_state: "La sesion de Google ha caducado. Vuelve a iniciar el acceso.",
  connect_error: "No se pudo completar la conexion con Google.",
  session_error: "Google conecto correctamente, pero no se pudo crear la sesion.",
  google_missing_code: "Google no devolvio el codigo de acceso. Intentalo de nuevo.",
  google_invalid_state: "La sesion de Google ha caducado. Vuelve a iniciar el acceso.",
  google_connect_error: "No se pudo completar la conexion con Google.",
  google_session_error: "Google conecto correctamente, pero no se pudo crear la sesion.",
};

export function LoginForm({ error }: { error?: string | null }) {
  return (
    <>
      <style>{`
        .login-shell {
          min-height: 100svh;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(400px, 0.95fr);
          background: #f5f2ec;
          color: #111111;
        }

        .login-panel {
          display: flex;
          min-height: 100svh;
          align-items: center;
          justify-content: center;
          background: #f5f2ec;
          padding: 48px 28px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
        }

        .login-logo-wrap {
          margin: 0 0 28px;
        }

        .login-logo-dark,
        .login-logo-mobile {
          display: block;
          width: 320px;
          max-width: 100%;
          height: auto;
        }

        .login-logo-mobile {
          display: none;
        }

        .login-title {
          margin: 0;
          color: #111111;
          font-size: 32px;
          line-height: 1.16;
          font-weight: 750;
          letter-spacing: 0;
        }

        .login-copy {
          margin: 10px 0 28px;
          color: #5e584f;
          font-size: 15px;
          line-height: 1.7;
        }

        .login-error {
          margin-bottom: 18px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          line-height: 1.5;
        }

        .login-note {
          margin: 14px 0 0;
          color: #7a7168;
          font-size: 12px;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .login-shell {
            display: block;
            background: #080b0c;
          }

          .login-panel {
            position: relative;
            isolation: isolate;
            min-height: 100dvh;
            align-items: flex-start;
            background: #080b0c;
            color: #f5f2ec;
            overflow: hidden;
            padding: 76px 28px 44px;
          }

          .login-panel::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: -1;
            height: 150px;
            background-image: url("/assets/al_lio_kinetic_background_dark.png");
            background-repeat: no-repeat;
            background-position: bottom center;
            background-size: 100% 100%;
            opacity: 0.7;
            mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 34%, black 100%);
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 34%, black 100%);
          }

          .login-card {
            max-width: none;
          }

          .login-logo-wrap {
            margin: 0 0 38px;
          }

          .login-logo-dark {
            display: none;
          }

          .login-logo-mobile {
            display: block;
            width: 330px;
            margin: 0 auto;
          }

          .login-title,
          .login-copy,
          .login-note {
            text-align: center;
          }

          .login-title {
            color: #ffffff;
            font-size: 28px;
          }

          .login-copy {
            color: #9b928a;
          }

          .login-note {
            color: #766f68;
          }
        }
      `}</style>

      <div className="login-shell">
        <LoginBrandPanel />

        <main className="login-panel">
          <div className="login-card">
            <div className="login-logo-wrap">
              <Image
                className="login-logo-dark"
                src="/assets/al_lio_logo_horizontal_transparent.png"
                alt="AL-LIO"
                width={615}
                height={214}
                priority
              />
              <Image
                className="login-logo-mobile"
                src="/assets/al_lio_logo_slogan_transparente_1060x360.png"
                alt="AL-LIO - Menos planes. Mas accion."
                width={1060}
                height={360}
                priority
              />
            </div>

            <h1 className="login-title">Bienvenido de nuevo</h1>
            <p className="login-copy">
              Accede con Google para mantener tu calendario y tu panel sincronizados.
            </p>

            {error && (
              <div className="login-error">
                {errorCopy[error] ?? "No se pudo iniciar sesion. Vuelve a intentarlo."}
              </div>
            )}

            <GoogleLoginButton />

            <p className="login-note">
              Por ahora, el acceso activo es Google.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
