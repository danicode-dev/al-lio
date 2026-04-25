"use client";

import { useState } from "react";
import { signIn } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { PlusCircle } from "lucide-react";

const PROFILES = [
  { name: "Dani", email: "dani@d1os.com", color: "bg-blue-600 hover:bg-blue-500", src: "" },
  { name: "Luli", email: "luli@d1os.com", color: "bg-rose-600 hover:bg-rose-500", src: "/luli.jpg" },
  { name: "Alberto", email: "alberto@d1os.com", color: "bg-emerald-600 hover:bg-emerald-500", src: "" },
  { name: "Eric", email: "eric@d1os.com", color: "bg-violet-600 hover:bg-violet-500", src: "" },
  { name: "Yeray", email: "yeray@d1os.com", color: "bg-amber-600 hover:bg-amber-500", src: "" },
];

const SHARED_PASSWORD = "muchosmantecados11";

export function LoginForm() {
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get("error");
  const [showTraditional, setShowTraditional] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState<string | null>(null);

  if (!showTraditional) {
    return (
      <div className="flex flex-col items-center justify-center space-y-12 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-4">
          <img src="/al-lio-logo.png" alt="Al-Lio" className="h-16 w-auto" />
          <h1 className="text-4xl md:text-5xl font-light text-foreground tracking-tight">¿Quién eres?</h1>
        </div>

        {errorMsg && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            Error de acceso. Vuelve a intentarlo.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {PROFILES.map((profile) => (
            <form action={signIn} key={profile.email} onSubmit={() => setLoadingProfile(profile.name)}>
              <input type="hidden" name="email" value={profile.email} />
              <input type="hidden" name="password" value={SHARED_PASSWORD} />

              <button
                type="submit"
                disabled={loadingProfile !== null}
                className="group flex flex-col items-center w-28 md:w-36 focus:outline-none transition-transform active:scale-95"
              >
                <div className={cn(
                  "w-28 h-28 md:w-36 md:h-36 rounded-md shadow-lg flex items-center justify-center transition-all duration-300 ease-in-out border-2 border-transparent group-hover:border-foreground/50",
                  profile.color,
                  loadingProfile === profile.name && "opacity-70 animate-pulse pointer-events-none"
                )}>
                  {loadingProfile === profile.name ? (
                    <div className="w-8 h-8 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                  ) : profile.src ? (
                    <Image src={profile.src} alt={profile.name} width={144} height={144} className="object-cover w-full h-full rounded-md" />
                  ) : (
                    <span className="text-5xl font-semibold text-white drop-shadow-md">
                      {profile.name.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="mt-4 text-lg md:text-xl font-medium text-foreground/70 group-hover:text-foreground transition-colors">
                  {profile.name}
                </span>
              </button>
            </form>
          ))}

          <button
            onClick={() => setShowTraditional(true)}
            className="group flex flex-col items-center w-28 md:w-36 focus:outline-none opacity-80 hover:opacity-100 transition-opacity"
          >
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all duration-300 border border-muted-foreground/30 bg-muted/20 group-hover:bg-muted/40">
              <PlusCircle className="w-10 h-10 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <span className="mt-4 text-base font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Otra cuenta
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Formulario tradicional
  return (
    <Card className="w-full max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300 border-none shadow-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Acceso Manual</CardTitle>
        <CardDescription>Inicia sesión con credenciales directas</CardDescription>
      </CardHeader>
      <form action={signIn}>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{errorMsg}</div>
          )}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Correo Electrónico</label>
            <Input id="email" name="email" type="email" placeholder="yo@ejemplo.com" required className="bg-background/50" />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
            <Input id="password" name="password" type="password" required className="bg-background/50" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" type="submit">Entrar al panel</Button>
          <button type="button" onClick={() => setShowTraditional(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Volver a selección de perfiles
          </button>
        </CardFooter>
      </form>
    </Card>
  );
}
