"use client";

import { useActionState, useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Folder,
  GraduationCap,
  Trophy,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProfileAction, type ProfileUpdateState } from "@/lib/profile/onboarding-actions";
import { ONBOARDING_INTEREST_OPTIONS } from "@/lib/profile/onboarding-options";
import type { DbFpCycle, DbProfile } from "@/lib/db/types";
import { FieldListbox, type FieldListboxOption } from "@/components/ui/field-listbox";

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

const initialState: ProfileUpdateState = { error: null, savedAt: null };

export type ProfileStats = {
  coursesTotal: number;
  coursesDone: number;
  hackathonsTotal: number;
  hackathonsDone: number;
  fpSaved: number;
  fpCompleted: number;
};

export function ProfileForm({
  cycles,
  profile,
  stats,
}: {
  cycles: DbFpCycle[];
  profile: DbProfile;
  stats: ProfileStats;
}) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);
  const [cycleCode, setCycleCode] = useState(profile.cycle_code ?? "");
  const [academicYear, setAcademicYear] = useState(profile.academic_year ? String(profile.academic_year) : "");
  const [interests, setInterests] = useState<string[]>(profile.interests ?? []);

  function toggleInterest(id: string) {
    setInterests((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  const cycleOptions: FieldListboxOption[] = cycles.map((cycle) => ({ value: cycle.code, label: cycle.name }));
  const yearOptions: FieldListboxOption[] = [
    { value: "1", label: "1º curso" },
    { value: "2", label: "2º curso" },
  ];

  return (
    <>
      <style>{`
        .al-profile-header { margin-bottom: 20px; }
        .al-profile-title {
          font-size: clamp(1.5rem, 2.2vw, 1.9rem);
          font-weight: 800;
          color: #111111;
          margin: 0 0 4px 0;
          font-family: var(--font-barlow, sans-serif);
        }
        .al-profile-subtitle { color: #6b6f72; font-size: 14px; margin: 0; }

        .al-profile-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(240px, 1fr);
          gap: 20px;
        }

        .al-profile-card {
          background: white;
          border: 1px solid #ece7dc;
          border-radius: 20px;
          box-shadow: 0 12px 32px rgba(17, 17, 17, 0.06);
          padding: clamp(20px, 3vw, 32px);
        }

        .al-profile-error {
          margin: 0 0 16px 0;
          border-radius: 12px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          padding: 10px 14px;
          font-size: 14px;
          color: #dc2626;
        }

        .al-profile-form { display: flex; flex-direction: column; gap: 20px; }

        .al-profile-chip-grid { display: flex; flex-wrap: wrap; gap: 8px; }

        .al-profile-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #e4dfd5;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13.5px;
          color: #111111;
          cursor: pointer;
          background: white;
          transition: border-color 0.15s, background 0.15s;
        }
        .al-profile-chip:hover { border-color: #d8d1c2; }
        .al-profile-chip-checked { border-color: rgba(225, 93, 45, 0.4); background: #fbe7dd; }
        .al-profile-chip-checkbox { width: 14px; height: 14px; accent-color: #e15d2d; }
        .al-profile-chip-icon { width: 15px; height: 15px; flex-shrink: 0; }

        .al-profile-actions { display: flex; align-items: center; gap: 12px; }

        .al-profile-submit {
          height: 46px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          padding: 0 22px;
          font-size: 14.5px;
          font-weight: 700;
          color: white;
          background: linear-gradient(180deg, #F06A37 0%, #E15D2D 100%);
          box-shadow: 0 10px 24px rgba(225, 93, 45, 0.22);
          transition: filter 0.15s;
        }
        .al-profile-submit:hover:not(:disabled) { filter: brightness(1.08); }
        .al-profile-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .al-profile-saved {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #1f7a4d;
          font-size: 13.5px;
          font-weight: 600;
        }
        .al-profile-saved-icon { width: 16px; height: 16px; }

        .al-profile-stats-card {
          background: white;
          border: 1px solid #ece7dc;
          border-radius: 20px;
          box-shadow: 0 12px 32px rgba(17, 17, 17, 0.06);
          padding: clamp(20px, 3vw, 28px);
          height: fit-content;
        }

        .al-profile-stats-title {
          font-size: 15px;
          font-weight: 700;
          color: #111111;
          margin: 0 0 16px 0;
        }

        .al-profile-stat-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-top: 1px solid #f0ece2;
          font-size: 13.5px;
          color: #4b4740;
        }
        .al-profile-stat-row:first-of-type { border-top: none; }
        .al-profile-stat-row strong { color: #111111; font-size: 14px; }

        @media (max-width: 800px) {
          .al-profile-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="al-profile-header">
        <h1 className="al-profile-title">Tu perfil</h1>
        <p className="al-profile-subtitle">Cambia tu ciclo, curso o intereses cuando quieras. Se aplica en tus recomendaciones al instante.</p>
      </div>

      <div className="al-profile-grid">
        <div className="al-profile-card">
          {state.error && <p className="al-profile-error">{errorCopy[state.error] ?? "No se pudo guardar. Inténtalo de nuevo."}</p>}

          <form action={formAction} className="al-profile-form">
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

            <div className="al-field">
              <span className="al-field-label">Te interesa</span>
              <div className="al-profile-chip-grid">
                {ONBOARDING_INTEREST_OPTIONS.map((id) => {
                  const meta = INTEREST_META[id];
                  const Icon = meta.icon;
                  const checked = interests.includes(id);
                  return (
                    <label key={id} className={cn("al-profile-chip", checked && "al-profile-chip-checked")}>
                      <input
                        type="checkbox"
                        name="interests"
                        value={id}
                        checked={checked}
                        onChange={() => toggleInterest(id)}
                        className="al-profile-chip-checkbox"
                      />
                      <Icon className="al-profile-chip-icon" style={{ color: meta.accent }} aria-hidden="true" />
                      <span>{meta.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="al-profile-actions">
              <button type="submit" disabled={isPending || !cycleCode || !academicYear} className="al-profile-submit">
                {isPending ? "Guardando..." : "Guardar cambios"}
              </button>
              {state.savedAt && !isPending && !state.error && (
                <span className="al-profile-saved">
                  <CheckCircle2 className="al-profile-saved-icon" aria-hidden="true" />
                  Guardado
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="al-profile-stats-card">
          <h2 className="al-profile-stats-title">Tu progreso</h2>
          <div className="al-profile-stat-row">
            <span>Cursos completados</span>
            <strong>
              {stats.coursesDone} / {stats.coursesTotal}
            </strong>
          </div>
          <div className="al-profile-stat-row">
            <span>Hackathons realizados</span>
            <strong>
              {stats.hackathonsDone} / {stats.hackathonsTotal}
            </strong>
          </div>
          <div className="al-profile-stat-row">
            <span>Contenido FP guardado</span>
            <strong>{stats.fpSaved}</strong>
          </div>
          <div className="al-profile-stat-row">
            <span>Contenido FP completado</span>
            <strong>{stats.fpCompleted}</strong>
          </div>
        </div>
      </div>
    </>
  );
}
