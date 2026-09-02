"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type PasswordResetState } from "@/lib/auth/password-reset";

const errorCopy: Record<string, string> = {
  reset_token_invalid: "Este enlace no es válido. Solicita uno nuevo.",
  reset_token_expired: "Este enlace ha caducado. Solicita uno nuevo.",
  reset_token_used: "Este enlace ya se ha utilizado. Solicita uno nuevo.",
  reset_failed: "No se pudo restablecer la contraseña. Vuelve a intentarlo.",
};

const initialState: PasswordResetState = { error: null };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  if (state.ok) {
    return (
      <div className="auth-note">
        <h1 className="auth-heading">Contraseña actualizada</h1>
        <p className="auth-sub">
          Hemos cambiado tu contraseña y cerrado la sesión en los demás dispositivos. Ya has iniciado sesión en este.
        </p>
        <p className="auth-alt">
          <Link href="/dashboard">Ir a mi panel</Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="auth-heading">Restablecer contraseña</h1>
      <p className="auth-sub">Se cerrará el acceso en cualquier otro dispositivo.</p>

      {state.error && (
        <div role="alert" className="auth-error">
          {errorCopy[state.error] ?? state.error}
        </div>
      )}

      <form action={formAction} className="auth-form">
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="new-password" className="auth-label">Nueva contraseña</label>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            placeholder="Mínimo 10 caracteres"
            className="auth-input"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="auth-label">Confirma la contraseña</label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            className="auth-input"
          />
        </div>

        <button type="submit" disabled={isPending} className="auth-submit">
          {isPending ? "Guardando..." : "Restablecer contraseña"}
        </button>

        <p className="auth-alt">
          <Link href="/login">Volver a inicio de sesión</Link>
        </p>
      </form>
    </>
  );
}
