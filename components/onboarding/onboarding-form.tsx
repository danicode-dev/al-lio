"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Folder,
  GraduationCap,
  Info,
  Lock,
  Trophy,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { completeOnboardingAction, type OnboardingState } from "@/lib/profile/onboarding-actions";
import { ONBOARDING_INTEREST_OPTIONS } from "@/lib/profile/onboarding-options";
import type { DbFpCycle, DbProfile } from "@/lib/db/types";
import { OnboardingBrandPanel } from "@/components/onboarding/onboarding-brand-panel";

const INTEREST_META: Record<
  (typeof ONBOARDING_INTEREST_OPTIONS)[number],
  { label: string; icon: LucideIcon; accent: string }
> = {
  herramientas: { label: "Herramientas", icon: Wrench, accent: "#E15D2D" },
  cursos: { label: "Cursos", icon: BookOpen, accent: "#2F6FED" },
  portfolio: { label: "Portfolio y evidencias", icon: Folder, accent: "#E15D2D" },
  hackathons: { label: "Hackathons y convocatorias", icon: Trophy, accent: "#D6A419" },
  organizacion: { label: "Organización", icon: Calendar, accent: "#4C7A68" },
};

const errorCopy: Record<string, string> = {
  onboarding_invalid: "Revisa los datos e inténtalo de nuevo.",
  onboarding_save_failed: "No se pudo guardar tu perfil. Inténtalo de nuevo.",
};

const initialState: OnboardingState = { error: null };

type ListboxOption = { value: string; label: string };

function FieldListbox({
  id,
  name,
  label,
  icon: Icon,
  iconTone,
  placeholder,
  options,
  value,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  icon: LucideIcon;
  iconTone: "terracotta" | "sage";
  placeholder: string;
  options: ListboxOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="onboarding-field">
      <label htmlFor={id} className="onboarding-field-label">
        {label}
      </label>
      <div className="onboarding-listbox" ref={containerRef}>
        <input type="hidden" name={name} value={value} />
        <button
          ref={triggerRef}
          type="button"
          id={id}
          className="onboarding-listbox-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <Icon
            className={cn(
              "onboarding-listbox-icon-svg",
              iconTone === "terracotta" ? "onboarding-listbox-icon-terracotta" : "onboarding-listbox-icon-sage"
            )}
            aria-hidden="true"
          />
          <span className={cn("onboarding-listbox-value", !selected && "onboarding-listbox-placeholder")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="onboarding-listbox-chevron" aria-hidden="true" />
        </button>

        {open && (
          <ul className="onboarding-listbox-panel" role="listbox" aria-labelledby={id}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn("onboarding-listbox-option", isSelected && "onboarding-listbox-option-selected")}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    {isSelected && <Check className="onboarding-listbox-check" aria-hidden="true" />}
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

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
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);

  function toggleInterest(id: string) {
    setInterests((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  const cycleOptions: ListboxOption[] = cycles.map((cycle) => ({ value: cycle.code, label: cycle.name }));
  const yearOptions: ListboxOption[] = [
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
        .onboarding-step-dot { color: #c7c0b3; font-size: 12px; }
        .onboarding-step-caption { color: #8a8577; font-size: 12.5px; font-weight: 500; }

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

        .onboarding-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .onboarding-field-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--alio-graphite);
        }

        .onboarding-listbox { position: relative; }

        .onboarding-listbox-trigger {
          width: 100%;
          height: 54px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 12px;
          border: 1px solid #E4DFD5;
          background: white;
          padding: 0 14px;
          cursor: pointer;
          font-size: 14.5px;
          color: var(--alio-graphite);
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .onboarding-listbox-trigger:hover { border-color: #d8d1c2; }
        .onboarding-listbox-trigger[aria-expanded="true"] {
          border-color: rgba(225, 93, 45, 0.5);
          box-shadow: 0 0 0 3px rgba(225, 93, 45, 0.12);
        }

        .onboarding-listbox-icon-svg { width: 17px; height: 17px; flex-shrink: 0; }
        .onboarding-listbox-icon-terracotta { color: var(--alio-terracotta); }
        .onboarding-listbox-icon-sage { color: var(--alio-sage); }

        .onboarding-listbox-value { flex: 1; text-align: left; }
        .onboarding-listbox-placeholder { color: #a39d8e; }

        .onboarding-listbox-chevron {
          width: 16px;
          height: 16px;
          color: #9a9589;
          transition: transform 0.15s;
          flex-shrink: 0;
        }
        .onboarding-listbox-trigger[aria-expanded="true"] .onboarding-listbox-chevron { transform: rotate(180deg); }

        .onboarding-listbox-panel {
          position: absolute;
          z-index: 20;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ECE7DC;
          border-radius: 14px;
          box-shadow: 0 16px 40px rgba(17, 17, 17, 0.12);
          padding: 6px;
          margin: 0;
          list-style: none;
          max-height: 280px;
          overflow-y: auto;
        }

        .onboarding-listbox-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          padding: 10px 12px;
          border-radius: 9px;
          border: none;
          background: transparent;
          font-size: 14px;
          color: var(--alio-graphite);
          cursor: pointer;
        }

        .onboarding-listbox-option:hover { background: #F7F4EE; }
        .onboarding-listbox-option-selected {
          background: var(--alio-terracotta-soft);
          color: var(--alio-terracotta);
          font-weight: 600;
        }

        .onboarding-listbox-check { width: 15px; height: 15px; flex-shrink: 0; }

        .onboarding-chip-grid { display: flex; flex-wrap: wrap; gap: 8px; }

        .onboarding-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #E4DFD5;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13.5px;
          color: var(--alio-graphite);
          cursor: pointer;
          background: white;
          transition: border-color 0.15s, background 0.15s;
        }

        .onboarding-chip:hover { border-color: #d8d1c2; }
        .onboarding-chip-checked {
          border-color: rgba(225, 93, 45, 0.4);
          background: var(--alio-terracotta-soft);
        }

        .onboarding-chip-checkbox {
          width: 14px;
          height: 14px;
          accent-color: var(--alio-terracotta);
        }

        .onboarding-chip-icon { width: 15px; height: 15px; flex-shrink: 0; }

        .onboarding-submit {
          height: 54px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 700;
          color: white;
          background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%);
          box-shadow: 0 16px 32px rgba(225, 93, 45, 0.24);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: filter 0.15s;
        }
        .onboarding-submit:hover:not(:disabled) { filter: brightness(1.08); }
        .onboarding-submit:active:not(:disabled) { filter: brightness(0.93); }
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
              <span className="onboarding-step-dot" aria-hidden="true">
                •
              </span>
              <span className="onboarding-step-caption">Personalización inicial</span>
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

              <div className="onboarding-field">
                <span className="onboarding-field-label">Te interesa (opcional)</span>
                <div className="onboarding-chip-grid">
                  {ONBOARDING_INTEREST_OPTIONS.map((id) => {
                    const meta = INTEREST_META[id];
                    const Icon = meta.icon;
                    const checked = interests.includes(id);
                    return (
                      <label key={id} className={cn("onboarding-chip", checked && "onboarding-chip-checked")}>
                        <input
                          type="checkbox"
                          name="interests"
                          value={id}
                          checked={checked}
                          onChange={() => toggleInterest(id)}
                          className="onboarding-chip-checkbox"
                        />
                        <Icon className="onboarding-chip-icon" style={{ color: meta.accent }} aria-hidden="true" />
                        <span>{meta.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

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
                Podrás cambiar estas preferencias más adelante.
              </p>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
