"use client";

import Link from "next/link";
import { signUp } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get("error");

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
        <CardDescription>Únete al panel Al-Lio</CardDescription>
      </CardHeader>
      <form action={signUp}>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {errorMsg}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="display_name" className="text-sm font-medium">Nombre (Opcional)</label>
            <Input id="display_name" name="display_name" type="text" placeholder="Dani" />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Correo Electrónico</label>
            <Input id="email" name="email" type="email" placeholder="yo@ejemplo.com" required />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
            <Input id="password" name="password" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" type="submit">Registrarse</Button>
          <p className="text-sm text-center text-muted-foreground w-full">
            ¿Ya tienes cuenta? <Link href="/login" className="underline hover:text-primary">Iniciar sesión</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
