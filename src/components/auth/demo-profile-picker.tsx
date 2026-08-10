"use client";

import { ChevronDown, UserRound } from "lucide-react";
import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAsDemoAction } from "@/lib/auth/demo-login";
import { DEMO_PROFILES, type DemoProfile } from "@/lib/auth/demo-profiles";

export function DemoProfilePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-[#ddd7ce] bg-white/65 max-[900px]:border-[#282828] max-[900px]:bg-[#111111]">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-[#111111] transition-colors hover:bg-[#f7f3ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e15d2d] max-[900px]:text-white max-[900px]:hover:bg-[#191919]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fce9df] text-[#e15d2d] max-[900px]:bg-[#2a1a14]">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Probar con un perfil demo</span>
          <span className="block text-xs text-[#777168] max-[900px]:text-[#8f8982]">
            Acceso en un clic, sin registro
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#777168] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div id={panelId} className="border-t border-[#e8e2d9] px-3 pb-3 pt-2 max-[900px]:border-[#282828]">
          <p className="px-1 pb-2 text-xs leading-5 text-[#777168] max-[900px]:text-[#8f8982]">
            Elige un caso de uso. Los datos y cambios de estas cuentas son compartidos.
          </p>
          <div className="space-y-1.5">
            {DEMO_PROFILES.map((profile) => (
              <form action={loginAsDemoAction} key={profile.key}>
                <input type="hidden" name="profile" value={profile.key} />
                <DemoProfileButton profile={profile} />
              </form>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DemoProfileButton({ profile }: { profile: DemoProfile }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex min-h-12 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[#f7f3ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e15d2d] disabled:cursor-wait disabled:opacity-60 max-[900px]:hover:bg-[#1b1b1b]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ead8cf] bg-[#fff7f2] text-[10px] font-bold tracking-wide text-[#d55225] max-[900px]:border-[#513124] max-[900px]:bg-[#241711]">
        {profile.initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[#111111] max-[900px]:text-white">
          {profile.title}
        </span>
        <span className="block text-xs text-[#817b72] max-[900px]:text-[#8f8982]">{profile.detail}</span>
      </span>
      <span className="text-xs font-semibold text-[#e15d2d]" aria-live="polite">
        {pending ? "Entrando…" : "Acceder"}
      </span>
    </button>
  );
}
