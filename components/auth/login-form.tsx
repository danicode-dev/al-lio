import Image from "next/image";
import { CalendarDays, ShieldCheck, Sparkles } from "lucide-react";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { Card } from "@/components/ui/card";
import alLioVisual from "@/logo/Gemini_Generated_Image_.png";

const errorCopy: Record<string, string> = {
  missing_code: "Google no devolvió el código de acceso. Inténtalo de nuevo.",
  invalid_state: "La sesión de Google ha caducado. Vuelve a iniciar el acceso.",
  connect_error: "No se pudo completar la conexión con Google.",
  session_error: "Google conectó correctamente, pero no se pudo crear la sesión.",
  google_missing_code: "Google no devolvió el código de acceso. Inténtalo de nuevo.",
  google_invalid_state: "La sesión de Google ha caducado. Vuelve a iniciar el acceso.",
  google_connect_error: "No se pudo completar la conexión con Google.",
  google_session_error: "Google conectó correctamente, pero no se pudo crear la sesión.",
};

export function LoginForm({ error }: { error?: string | null }) {
  return (
    <section className="flex min-h-[100svh] items-center justify-center bg-background px-4 py-8 sm:px-6 lg:px-8">
      <Card className="grid w-full max-w-6xl overflow-hidden shadow-[0_24px_80px_rgba(15,23,42,0.10)] dark:shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:min-h-[620px] md:grid-cols-[0.95fr_1.05fr]">
        <div className="flex min-h-[560px] flex-col justify-between p-6 sm:p-8 lg:p-10">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-20 items-center justify-center overflow-hidden rounded-md border bg-white p-1 shadow-sm dark:border-white/10">
                <Image
                  src={alLioVisual}
                  alt="Al-Lío"
                  className="h-full w-full object-contain"
                  sizes="80px"
                  priority
                />
              </div>
              <span className="text-sm font-semibold text-foreground">Al-Lío</span>
            </div>
            <span className="hidden rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
              Google Calendar
            </span>
          </header>

          <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                Inicia sesión en Al-Lío
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                Conecta tu calendario y organiza tus eventos en un solo lugar
              </p>
            </div>

            {error && (
              <div className="mt-6 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorCopy[error] ?? "No se pudo iniciar sesión. Vuelve a intentarlo."}
              </div>
            )}

            <div className="mt-8 space-y-4">
              <GoogleLoginButton />
              <p className="text-sm leading-6 text-muted-foreground">
                Usaremos tu cuenta de Google para sincronizar tus eventos con Google Calendar.
              </p>
            </div>
          </main>

          <footer className="text-xs text-muted-foreground">© Al-Lío</footer>
        </div>

        <aside className="relative hidden min-h-[620px] overflow-hidden border-l bg-muted/30 md:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.14),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.14),transparent_32%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(96,165,250,0.16),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(45,212,191,0.12),transparent_32%)]" />
          <div className="relative flex h-full flex-col justify-between p-8 lg:p-10">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Calendario sincronizado</span>
            </div>

            <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
              <div className="overflow-hidden rounded-lg border bg-white shadow-2xl shadow-slate-950/10 dark:border-white/10">
                <Image
                  src={alLioVisual}
                  alt="Logo de Al-Lío"
                  className="aspect-[1496/704] h-auto w-full object-cover"
                  sizes="(min-width: 768px) 45vw, 100vw"
                  priority
                />
              </div>

              <div className="grid grid-cols-2 gap-6 border-t pt-5">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Acceso seguro</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Cuenta verificada por Google.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Agenda lista</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Eventos disponibles tras entrar.</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Una entrada limpia para consultar, crear y mantener tus eventos de Google Calendar dentro de Al-Lío.
            </p>
          </div>
        </aside>
      </Card>
    </section>
  );
}
