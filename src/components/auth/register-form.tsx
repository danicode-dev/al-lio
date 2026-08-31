"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type RegisterState } from "@/lib/auth/register";

const errorCopy: Record<string, string> = {
  rate_limited: "Demasiados intentos seguidos. Espera unos minutos antes de volver a probar.",
  register_failed: "No se pudo completar el registro. Vuelve a intentarlo.",
};

const initialState: RegisterState = { error: null, submitted: false };

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

  if (state.submitted) {
    return (
      <div className="auth-note">
        <h1 className="auth-heading">Revisa tu correo</h1>
        <p className="auth-sub">
          Si el correo es válido, te hemos enviado un enlace para confirmar tu cuenta. El enlace caduca en 24 horas.
        </p>
        <p className="auth-alt">
          <Link href="/login">Volver a inicio de sesión</Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="auth-heading">Crear cuenta</h1>
      <p className="auth-sub">Te enviaremos un correo para confirmar tu cuenta.</p>

      {state.error && (
        <div role="alert" className="auth-error">
          {errorCopy[state.error] ?? state.error}
        </div>
      )}

      <form action={formAction} className="auth-form">
        <div>
          <label htmlFor="register-email" className="auth-label">Correo electrónico</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="usuario@ejemplo.com"
            className="auth-input"
          />
        </div>

        <div>
          <label htmlFor="register-password" className="auth-label">Contraseña</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            placeholder="Mínimo 10 caracteres"
            className="auth-input"
          />
        </div>

        <button type="submit" disabled={isPending} className="auth-submit">
          {isPending ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className="auth-alt">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </form>
    </>
  );
}
