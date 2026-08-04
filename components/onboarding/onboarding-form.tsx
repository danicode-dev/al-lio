"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { completeOnboardingAction, type OnboardingState } from "@/lib/profile/onboarding-actions";
import { ONBOARDING_INTEREST_OPTIONS } from "@/lib/profile/onboarding-options";
import type { DbFpCycle, DbProfile } from "@/lib/db/types";

const INTEREST_LABELS: Record<(typeof ONBOARDING_INTEREST_OPTIONS)[number], string> = {
  herramientas: "Herramientas",
  cursos: "Cursos",
  portfolio: "Portfolio y evidencias",
  hackathons: "Hackathons y convocatorias",
  organizacion: "Organización",
};

const errorCopy: Record<string, string> = {
  onboarding_invalid: "Revisa los datos e inténtalo de nuevo.",
  onboarding_save_failed: "No se pudo guardar tu perfil. Inténtalo de nuevo.",
};

const initialState: OnboardingState = { error: null };

export function OnboardingForm({
  cycles,
  profile,
}: {
  cycles: DbFpCycle[];
  profile: DbProfile | null;
}) {
  const [state, formAction, isPending] = useActionState(completeOnboardingAction, initialState);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col items-center gap-2 text-center">
        <div className="relative h-8 w-32">
          <Image
            src="/assets/al_lio_logo_horizontal_transparent.png"
            alt="AL-LIO"
            width={615}
            height={214}
            className="block h-auto w-32 object-contain dark:hidden"
            priority
          />
          <Image
            src="/assets/al_lio_logo_horizontal_white_transparent.png"
            alt="AL-LIO"
            width={560}
            height={115}
            className="hidden h-auto w-32 object-contain dark:block"
            priority
          />
        </div>
        <CardTitle className="text-xl">Cuéntanos qué estudias</CardTitle>
        <CardDescription>Así te mostramos lo que encaja con tu ciclo. Tarda menos de un minuto.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          {state.error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorCopy[state.error] ?? "No se pudo guardar. Inténtalo de nuevo."}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cycleCode" className="text-sm font-medium">
              ¿Qué estudias?
            </label>
            <Select id="cycleCode" name="cycleCode" required defaultValue={profile?.cycle_code ?? ""}>
              <option value="" disabled>
                Selecciona tu ciclo
              </option>
              {cycles.map((cycle) => (
                <option key={cycle.code} value={cycle.code}>
                  {cycle.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="academicYear" className="text-sm font-medium">
              ¿En qué curso estás?
            </label>
            <Select
              id="academicYear"
              name="academicYear"
              required
              defaultValue={profile?.academic_year ? String(profile.academic_year) : ""}
            >
              <option value="" disabled>
                Selecciona tu curso
              </option>
              <option value="1">1º curso</option>
              <option value="2">2º curso</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Te interesa (opcional)</span>
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_INTEREST_OPTIONS.map((interest) => (
                <label
                  key={interest}
                  className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    name="interests"
                    value={interest}
                    defaultChecked={profile?.interests?.includes(interest) ?? false}
                    className="h-3.5 w-3.5 rounded border-input"
                  />
                  {INTEREST_LABELS[interest]}
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Guardando..." : "Continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
