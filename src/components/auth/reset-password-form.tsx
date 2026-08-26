"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type PasswordResetState } from "@/lib/auth/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const errorCopy: Record<string, string> = {
  reset_token_invalid: "Este enlace no es válido. Solicita uno nuevo.",
  reset_token_expired: "Este enlace ha caducado. Solicita uno nuevo.",
  reset_failed: "No se pudo restablecer la contraseña. Vuelve a intentarlo.",
};

const initialState: PasswordResetState = { error: null };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1">
        <h1 className="text-xl font-bold">Restablecer contraseña</h1>
        <p className="text-sm text-muted-foreground">Se cerrará el acceso en cualquier otro dispositivo.</p>
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorCopy[state.error] ?? state.error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="new-password" className="text-sm font-medium">Nueva contraseña</label>
        <Input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={10} placeholder="Mínimo 10 caracteres" />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm-password" className="text-sm font-medium">Confirma la contraseña</label>
        <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Guardando..." : "Restablecer contraseña"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">Volver a inicio de sesión</Link>
      </p>
    </form>
  );
}
