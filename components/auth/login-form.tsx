import Image from "next/image";
import { CalendarDays, Play, ShieldCheck, Sparkles } from "lucide-react";
import { GoogleLoginButton } from "@/components/auth/google-login-button";

const errorCopy: Record<string, string> = {
  missing_code: "Google no devolvio el codigo de acceso. Intentalo de nuevo.",
  invalid_state: "La sesion de Google ha caducado. Vuelve a iniciar el acceso.",
  connect_error: "No se pudo completar la conexion con Google.",
  session_error: "Google conectó correctamente, pero no se pudo crear la sesión.",
  google_missing_code: "Google no devolvio el codigo de acceso. Intentalo de nuevo.",
  google_invalid_state: "La sesion de Google ha caducado. Vuelve a iniciar el acceso.",
  google_connect_error: "No se pudo completar la conexion con Google.",
  google_session_error: "Google conectó correctamente, pero no se pudo crear la sesión.",
};

export function LoginForm({ error }: { error?: string | null }) {
  return (
    <section className="grid min-h-[100svh] place-items-center bg-neutral-950 px-4 py-6 text-neutral-950 sm:px-6">
      <div className="grid w-full max-w-[980px] gap-5 rounded-lg bg-[#f6f5f2] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.42)] md:min-h-[620px] md:grid-cols-[0.98fr_1.02fr] md:p-5">
        <div className="flex min-h-[560px] flex-col rounded-lg border border-[#ece6d6] bg-[#fbf8f1] px-6 py-7 text-center sm:px-9">
          <header className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-950 p-1.5">
                <Image
                  src="/brand/logo-mark-white.png"
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <Image
                src="/brand/signature.png"
                alt="Al-Lio"
                width={120}
                height={28}
                className="h-6 w-auto"
                priority
              />
            </div>
            <span className="hidden shrink-0 rounded-full border border-[#ddd5c1] bg-[#fbf8f1] px-3 py-1.5 text-xs font-medium text-neutral-800 sm:inline-flex">
              Google Calendar
            </span>
          </header>

          <main className="mx-auto flex w-full max-w-[360px] flex-1 flex-col items-center justify-center py-10">
            <div className="mb-5 grid h-[84px] w-[84px] place-items-center rounded-lg bg-neutral-950 p-4 shadow-lg shadow-black/25">
              <Image
                src="/brand/logo-mark-white.png"
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-contain"
                priority
              />
            </div>

            <h1 className="flex flex-col items-center gap-2 text-[26px] font-semibold leading-tight tracking-tight text-neutral-950 sm:text-[28px]">
              <span className="whitespace-nowrap">Inicia sesion en</span>
              <Image
                src="/brand/signature.png"
                alt="Al-Lio"
                width={300}
                height={70}
                className="h-16 w-auto"
                priority
              />
            </h1>

            <p className="mt-2 max-w-[38ch] text-sm leading-6 text-[#5d564a]">
              Conecta tu calendario y organiza tus eventos en un solo lugar.
            </p>

            {error && (
              <div className="mt-5 w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-left text-sm text-red-700">
                {errorCopy[error] ?? "No se pudo iniciar sesion. Vuelve a intentarlo."}
              </div>
            )}

            <div className="mt-6 w-full">
              <GoogleLoginButton />
              <p className="mx-auto mt-3.5 max-w-[46ch] text-xs leading-5 text-[#7a7160]">
                Usaremos tu cuenta de Google para sincronizar tus eventos con Google Calendar.
              </p>
            </div>
          </main>

          <footer className="flex items-center justify-center gap-2 text-xs text-[#9a8f7a] sm:justify-start">
            <Image
              src="/brand/logo-mark.png"
              alt=""
              width={14}
              height={14}
              className="opacity-70"
            />
            <span>© Al-Lio</span>
          </footer>
        </div>

        <aside className="hidden rounded-lg border border-neutral-900 bg-[#0b0b0c] p-7 text-[#fbf8f1] md:flex md:flex-col">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#bdb6a4]">
            <CalendarDays className="h-4 w-4 opacity-80" />
            <span>Descubre Al-Lio en 60 segundos</span>
          </div>

          <div className="relative grid flex-1 place-items-center overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 aspect-[16/10]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(251,248,241,0.12),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
            <div className="relative flex flex-col items-center gap-4 text-[#bdb6a4]">
              <div className="grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-white/10 text-white shadow-2xl shadow-black/40 backdrop-blur">
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </div>
              <Image
                src="/brand/signature-white.png"
                alt="Al-Lio"
                width={180}
                height={44}
                className="h-9 w-auto opacity-90"
              />
            </div>
          </div>

          <p className="mx-auto mt-4 max-w-[40ch] text-center text-[12.5px] leading-relaxed text-[#a8a195]">
            Mira como conectar tu calendario, crear eventos y mantener tu agenda al dia dentro de Al-Lio.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <Feature
              title="Acceso seguro"
              body="Cuenta verificada por Google."
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <Feature
              title="Agenda lista"
              body="Eventos disponibles tras entrar."
              icon={<Sparkles className="h-4 w-4" />}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}

function Feature({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center text-[#fbf8f1]">
        {icon}
      </span>
      <div className="text-left">
        <h2 className="text-[13px] font-semibold text-[#fbf8f1]">{title}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-[#a8a195]">{body}</p>
      </div>
    </div>
  );
}
