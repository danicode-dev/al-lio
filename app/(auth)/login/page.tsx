import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
      <Suspense fallback={<div className="animate-pulse text-muted-foreground">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
