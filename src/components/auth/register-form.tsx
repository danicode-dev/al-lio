"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type RegisterState } from "@/lib/auth/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const errorCopy: Record<string, string> = {
  rate_limited: "Demasiados intentos seguidos. Espera unos minutos antes de volver a probar.",
  register_failed: "No se pudo completar el registro. Vuelve a intentarlo.",
};

const initialState: RegisterState = { error: null, submitted: false };

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

  if (state.submitted) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-bold">Revisa tu correo</h1>
        <p className="text-sm text-muted-foreground">
          Si el correo es válido, te hemos enviado un enlace para confirmar tu cuenta. El enlace caduca en 24 horas.
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
        <h1 className="text-xl font-bold">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground">Te enviaremos un correo para confirmar tu cuenta.</p>
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorCopy[state.error] ?? state.error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="register-email" className="text-sm font-medium">Correo electrónico</label>
        <Input id="register-email" name="email" type="email" autoComplete="email" required placeholder="usuario@ejemplo.com" />
      </div>

      <div className="space-y-1">
        <label htmlFor="register-password" className="text-sm font-medium">Contraseña</label>
        <Input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={10} placeholder="Mínimo 10 caracteres" />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">Inicia sesión</Link>
      </p>
    </form>
  );
}
