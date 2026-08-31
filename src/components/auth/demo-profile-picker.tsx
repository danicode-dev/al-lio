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
    <section className="mt-4 overflow-hidden rounded-xl border border-[#E6DED2] bg-white/65">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-[#2F2A24] transition-colors hover:bg-[#F0EBDF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1F5B46]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E7EFEA] text-[#1F5B46]">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Probar con un perfil demo</span>
          <span className="block text-xs text-[#7A736B]">
            Acceso en un clic, sin registro
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#7A736B] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div id={panelId} className="border-t border-[#E6DED2] px-3 pb-3 pt-2">
          <p className="px-1 pb-2 text-xs leading-5 text-[#7A736B]">
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
      className="group flex min-h-12 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[#F0EBDF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5B46] disabled:cursor-wait disabled:opacity-60"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#CDE2D6] bg-[#E7EFEA] text-[10px] font-bold tracking-wide text-[#1F5B46]">
        {profile.initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[#2F2A24]">
          {profile.title}
        </span>
        <span className="block text-xs text-[#7A736B]">{profile.detail}</span>
      </span>
      <span className="text-xs font-semibold text-[#1F5B46]" aria-live="polite">
        {pending ? "Entrando…" : "Acceder"}
      </span>
    </button>
  );
}
