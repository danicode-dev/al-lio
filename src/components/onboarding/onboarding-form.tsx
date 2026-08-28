"use client";

import { useActionState, useState } from "react";
import { ArrowRight, BookOpen, GraduationCap, Info, Lock } from "lucide-react";
import { completeOnboardingAction, type OnboardingState } from "@/lib/profile/onboarding-actions";
import type { DbFpCycle, DbProfile } from "@/lib/db/types";
import { OnboardingBrandPanel } from "@/components/onboarding/onboarding-brand-panel";
import { FieldListbox, type FieldListboxOption } from "@/components/ui/field-listbox";

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
  const [cycleCode, setCycleCode] = useState(profile?.cycle_code ?? "");
  const [academicYear, setAcademicYear] = useState(profile?.academic_year ? String(profile.academic_year) : "");

  const cycleOptions: FieldListboxOption[] = cycles.map((cycle) => ({ value: cycle.code, label: cycle.name }));
  const yearOptions: FieldListboxOption[] = [
    { value: "1", label: "1º curso" },
    { value: "2", label: "2º curso" },
  ];

  return (
    <>
      <style>{`
        :root {
          --alio-terracotta: #E15D2D;
          --alio-terracotta-soft: #FBE7DD;
          --alio-graphite: #111111;
          --alio-cream: #F5F2EC;
          --alio-sage: #4C7A68;
        }

        .onboarding-shell {
          min-height: 100svh;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(440px, 0.95fr);
          background: var(--alio-cream);
        }

        .onboarding-brand-panel {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          padding: clamp(32px, 6vw, 96px);
        }

        .onboarding-kinetic-lines {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        .onboarding-brand-logo {
          position: relative;
          z-index: 1;
          width: clamp(220px, 22vw, 320px);
          height: auto;
        }

        .onboarding-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(24px, 4vw, 56px);
          background: var(--alio-cream);
        }

        .onboarding-card {
          width: 100%;
          max-width: 560px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 24px 60px rgba(17, 17, 17, 0.08);
          padding: clamp(28px, 4vw, 48px);
        }

        .onboarding-step-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .onboarding-step-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(225, 93, 45, 0.35);
          background: var(--alio-terracotta-soft);
          color: var(--alio-terracotta);
          font-size: 12.5px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
        }

        .onboarding-step-badge-icon { width: 13px; height: 13px; }

        .onboarding-heading {
          font-size: clamp(1.7rem, 2.6vw, 2.1rem);
          font-weight: 800;
          color: var(--alio-graphite);
          margin: 0 0 8px 0;
          line-height: 1.15;
          font-family: var(--font-barlow, sans-serif);
        }

        .onboarding-subheading {
          color: #6b6f72;
          font-size: 14.5px;
          line-height: 1.55;
          margin: 0 0 28px 0;
          max-width: 42ch;
        }

        .onboarding-error {
          margin: 0 0 16px 0;
          border-radius: 12px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          padding: 10px 14px;
          font-size: 14px;
          color: #dc2626;
        }

        .onboarding-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .onboarding-submit {
          height: 54px;
          border-radius: 14px;
          border: 1px solid var(--al-action-soft-border);
          cursor: pointer;
          font-size: 15px;
          font-weight: 700;
          color: var(--al-action-soft-text);
          background: var(--al-action-soft-bg);
          box-shadow: 0 6px 18px rgba(80, 43, 27, 0.07);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
        }
        .onboarding-submit:hover:not(:disabled) { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); transform: translateY(-1px); }
        .onboarding-submit:active:not(:disabled) { transform: translateY(0); }
        .onboarding-submit:focus-visible { outline: 3px solid var(--al-action-soft-focus); outline-offset: 2px; }
        .onboarding-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .onboarding-submit-icon { width: 17px; height: 17px; }

        .onboarding-helper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin: 4px 0 0 0;
          font-size: 12.5px;
          color: #9a9589;
        }

        .onboarding-helper-icon { width: 12px; height: 12px; }

        @media (max-width: 900px) {
          .onboarding-shell { display: block; }
          .onboarding-brand-panel { display: none; }
          .onboarding-form-panel { min-height: 100dvh; padding: 24px 16px; }
          .onboarding-card { box-shadow: none; border: 1px solid #ECE7DC; }
        }
      `}</style>

      <div className="onboarding-shell">
        <OnboardingBrandPanel />

        <main className="onboarding-form-panel">
          <div className="onboarding-card">
            <div className="onboarding-step-row">
              <span className="onboarding-step-badge">
                <Info className="onboarding-step-badge-icon" aria-hidden="true" />
                Paso 1 de 1
              </span>
            </div>

            <h1 className="onboarding-heading">Cuéntanos qué estudias</h1>
            <p className="onboarding-subheading">Así te mostramos lo que encaja con tu ciclo. Tarda menos de un minuto.</p>

            {state.error && <p className="onboarding-error">{errorCopy[state.error] ?? "No se pudo guardar. Inténtalo de nuevo."}</p>}

            <form action={formAction} className="onboarding-form">
              <FieldListbox
                id="cycleCode"
                name="cycleCode"
                label="¿Qué estudias?"
                icon={GraduationCap}
                iconTone="terracotta"
                placeholder="Selecciona tu ciclo"
                options={cycleOptions}
                value={cycleCode}
                onChange={setCycleCode}
              />

              <FieldListbox
                id="academicYear"
                name="academicYear"
                label="¿En qué curso estás?"
                icon={BookOpen}
                iconTone="sage"
                placeholder="Selecciona tu curso"
                options={yearOptions}
                value={academicYear}
                onChange={setAcademicYear}
              />

              <button type="submit" disabled={isPending || !cycleCode || !academicYear} className="onboarding-submit">
                {isPending ? (
                  "Guardando..."
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="onboarding-submit-icon" aria-hidden="true" />
                  </>
                )}
              </button>

              <p className="onboarding-helper">
                <Lock className="onboarding-helper-icon" aria-hidden="true" />
                Podrás cambiar estos datos más adelante.
              </p>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
