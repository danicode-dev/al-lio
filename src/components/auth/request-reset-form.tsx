"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type PasswordResetRequestState } from "@/lib/auth/password-reset";

const initialState: PasswordResetRequestState = { submitted: false };

export function RequestResetForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

  if (state.submitted) {
    return (
      <div className="auth-note">
        <h1 className="auth-heading">Revisa tu correo</h1>
        <p className="auth-sub">
          Si el correo tiene una cuenta con contraseña, te hemos enviado un enlace para restablecerla. El enlace caduca en 1 hora.
        </p>
        <p className="auth-alt">
          <Link href="/login">Volver a inicio de sesión</Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="auth-heading">Recuperar contraseña</h1>
      <p className="auth-sub">Te enviaremos un enlace para restablecerla.</p>

      <form action={formAction} className="auth-form">
        <div>
          <label htmlFor="reset-email" className="auth-label">Correo electrónico</label>
          <input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="usuario@ejemplo.com"
            className="auth-input"
          />
        </div>

        <button type="submit" disabled={isPending} className="auth-submit">
          {isPending ? "Enviando..." : "Enviar enlace"}
        </button>

        <p className="auth-alt">
          <Link href="/login">Volver a inicio de sesión</Link>
        </p>
      </form>
    </>
  );
}
