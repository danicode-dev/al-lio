"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type PasswordResetRequestState } from "@/lib/auth/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: PasswordResetRequestState = { submitted: false };

export function RequestResetForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

  if (state.submitted) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-bold">Revisa tu correo</h1>
        <p className="text-sm text-muted-foreground">
          Si el correo tiene una cuenta con contraseña, te hemos enviado un enlace para restablecerla. El enlace caduca en 1 hora.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary underline underline-offset-4">
          Volver a inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground">Te enviaremos un enlace para restablecerla.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="reset-email" className="text-sm font-medium">Correo electrónico</label>
        <Input id="reset-email" name="email" type="email" autoComplete="email" required placeholder="usuario@ejemplo.com" />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Enviando..." : "Enviar enlace"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">Volver a inicio de sesión</Link>
      </p>
    </form>
  );
}
