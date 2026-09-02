"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { updateProfileAction, type ProfileUpdateState } from "@/lib/profile/onboarding-actions";
import type { DbFpCycle, DbProfile } from "@/lib/db/types";
import type { RoadmapOverview } from "@/lib/fp/roadmap";
import { FieldListbox } from "@/components/ui/field-listbox";
import { PageHeader } from "@/components/page-header";
import { StudentHeaderActions } from "@/components/student-header-actions";
import { SavedHub } from "@/components/profile/saved-hub";
import {
  ACADEMIC_YEAR_OPTIONS,
  buildCycleOptions,
  canSubmitProfileChanges,
  deriveInitials,
  describeProfileSaveState,
  resolveAccountDisplayName,
  resolveProfileErrorCopy,
} from "@/features/account/account-model";

const initialState: ProfileUpdateState = { error: null, savedAt: null };

export function ProfileForm({
  cycles,
  profile,
  account,
  learningOverview,
}: {
  cycles: DbFpCycle[];
  profile: DbProfile;
  account: { email: string; displayName: string | null };
  learningOverview: RoadmapOverview | null;
}) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);
  const [cycleCode, setCycleCode] = useState(profile.cycle_code ?? "");
  const [academicYear, setAcademicYear] = useState(profile.academic_year ? String(profile.academic_year) : "");
  const displayName = resolveAccountDisplayName(account);
  const initials = deriveInitials(displayName);
  const selectedCycle = cycles.find((cycle) => cycle.code === cycleCode);
  const saveState = describeProfileSaveState(state, isPending);

  const cycleOptions = buildCycleOptions(cycles);
  const yearOptions = ACADEMIC_YEAR_OPTIONS;

  return (
    <>
      <style>{`

        .al-profile-shell {
          min-width: 0;
          container-type: inline-size;
        }

        .al-profile-grid {
          display: grid;
          min-width: 0;
          grid-template-columns: minmax(0, 1fr);
          gap: 20px;
        }
        .al-profile-grid > * { min-width: 0; }

        .al-profile-identity {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
          border-bottom: 1px solid #f0ece2;
          padding-bottom: 20px;
        }
        .al-profile-avatar {
          display: grid;
          width: 54px;
          height: 54px;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 18px;
          background: linear-gradient(145deg, #fbe7dd, #f7d3c2);
          color: #c94f21;
          font-size: 17px;
          font-weight: 900;
        }
        .al-profile-name { margin: 0; color: #111111; font-size: 16px; font-weight: 800; }
        .al-profile-email { margin: 3px 0 0; color: #777269; font-size: 12px; overflow-wrap: anywhere; }
        .al-profile-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .al-profile-badge { border-radius: 999px; background: #f7f4ee; padding: 4px 8px; color: #5f5a52; font-size: 10px; font-weight: 800; }

        .al-profile-card {
          min-width: 0;
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

        .al-profile-actions { display: flex; align-items: center; gap: 12px; }

        .al-profile-submit {
          height: 46px;
          border-radius: 12px;
          border: 1px solid var(--al-action-soft-border);
          cursor: pointer;
          padding: 0 22px;
          font-size: 14.5px;
          font-weight: 700;
          color: var(--al-action-soft-text);
          background: var(--al-action-soft-bg);
          box-shadow: 0 4px 12px rgba(80, 43, 27, 0.05);
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .al-profile-submit:hover:not(:disabled) { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
        .al-profile-submit:focus-visible { outline: 3px solid var(--al-action-soft-focus); outline-offset: 2px; }
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
          min-width: 0;
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

        .al-profile-progress-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
        .al-profile-progress-ring {
          display: grid;
          width: 68px;
          height: 68px;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 999px;
          position: relative;
        }
        .al-profile-progress-ring::after { content: ""; position: absolute; inset: 7px; border-radius: 999px; background: white; }
        .al-profile-progress-value { position: relative; z-index: 1; color: #111111; font-size: 14px; font-weight: 900; }
        .al-profile-focus { margin-top: 18px; border-top: 1px solid #f0ece2; padding-top: 14px; }
        .al-profile-focus-row { padding: 9px 0; color: #4b4740; font-size: 12px; }
        .al-profile-focus-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .al-profile-focus-meta strong { color: #111111; font-size: 11px; }
        .al-profile-focus-track { height: 4px; margin-top: 7px; overflow: hidden; border-radius: 999px; background: #eee9df; }
        .al-profile-focus-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #f06a37, #e15d2d); }
        .al-profile-next-step {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 2px 12px;
          margin-top: 14px;
          border: 1px solid #f3d7ca;
          border-radius: 14px;
          background: #fff7f3;
          padding: 12px 14px;
          color: #111111;
          transition: border-color 0.15s, transform 0.15s;
        }
        .al-profile-next-step:hover { border-color: #f0a686; transform: translateY(-1px); }
        .al-profile-next-step span { color: #8e5a43; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
        .al-profile-next-step strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }
        .al-profile-next-step-icon { grid-column: 2; grid-row: 1 / span 2; align-self: center; width: 16px; height: 16px; color: #e15d2d; }
        .al-profile-roadmap-link { margin-top: 14px; display: inline-flex; align-items: center; gap: 6px; color: #e15d2d; font-size: 12px; font-weight: 800; }

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

        @container (min-width: 700px) {
          .al-profile-grid { grid-template-columns: minmax(0, 1.4fr) minmax(240px, 1fr); }
        }

        @media (max-width: 480px) {
          .al-profile-card,
          .al-profile-stats-card {
            border-radius: 16px;
            padding: 16px;
          }
          .al-profile-identity { align-items: flex-start; gap: 12px; margin-bottom: 16px; padding-bottom: 16px; }
          .al-profile-avatar { width: 48px; height: 48px; border-radius: 15px; }
          .al-profile-actions { align-items: stretch; flex-direction: column; }
          .al-profile-submit { width: 100%; }
          .al-profile-saved { justify-content: center; }
          .al-profile-progress-head { align-items: flex-start; }
          .al-profile-progress-ring { width: 60px; height: 60px; }
          .al-profile-stat-row { align-items: flex-start; gap: 16px; }
          .al-profile-stat-row strong { flex: 0 0 auto; }
        }
      `}</style>

      <div className="al-profile-shell">
        <PageHeader
          eyebrow="Tu cuenta"
          title="Tu perfil"
          subtitle="Actualiza tu ciclo y curso para mantener tus recomendaciones al día."
          actions={
            <div className="hidden md:flex md:items-center md:gap-2">
              <StudentHeaderActions />
            </div>
          }
        />

      <div className="al-profile-grid">
        <div className="al-profile-card">
          <div className="al-profile-identity">
            <div className="al-profile-avatar" aria-hidden="true">{initials}</div>
            <div className="min-w-0">
              <p className="al-profile-name">{displayName}</p>
              <p className="al-profile-email">{account.email}</p>
              <div className="al-profile-badges">
                <span className="al-profile-badge">{selectedCycle?.short_name ?? cycleCode}</span>
                {academicYear && <span className="al-profile-badge">{academicYear}º curso</span>}
              </div>
            </div>
          </div>
          {saveState === "error" && <p className="al-profile-error">{resolveProfileErrorCopy(state.error)}</p>}

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

            <div className="al-profile-actions">
              <button
                type="submit"
                disabled={!canSubmitProfileChanges({ cycleCode, academicYear, isPending })}
                className="al-profile-submit"
              >
                {isPending ? "Guardando..." : "Guardar cambios"}
              </button>
              {saveState === "saved" && (
                <span className="al-profile-saved">
                  <CheckCircle2 className="al-profile-saved-icon" aria-hidden="true" />
                  Guardado
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="al-profile-stats-card">
          <div className="al-profile-progress-head">
            <div>
              <h2 className="al-profile-stats-title">Progreso de competencias</h2>
              <p className="m-0 text-xs leading-5 text-[#777269]">Vídeos completados dentro de tu ciclo.</p>
            </div>
            <div className="al-profile-progress-ring" style={{ background: `conic-gradient(#1f7a4d ${learningOverview?.completion.percent ?? 0}%, #eee9df 0)` }}>
              <span className="al-profile-progress-value">{learningOverview?.completion.percent ?? 0}%</span>
            </div>
          </div>
          <div className="al-profile-stat-row"><span>Recursos completados</span><strong>{learningOverview?.completion.completed ?? 0} / {learningOverview?.completion.total ?? 0}</strong></div>
          <div className="al-profile-stat-row"><span>Ciclo activo</span><strong>{learningOverview?.cycleCode ?? cycleCode}</strong></div>
          {learningOverview?.nextStep && (
            <Link href={learningOverview.nextStep.href} className="al-profile-next-step">
              <span>Continúa por</span>
              <strong>{learningOverview.nextStep.skillTitle}</strong>
              <ArrowRight className="al-profile-next-step-icon" aria-hidden="true" />
            </Link>
          )}
          <div className="al-profile-focus">
            <h3 className="m-0 text-xs font-extrabold uppercase tracking-[0.08em] text-[#8e887e]">Siguiente enfoque</h3>
            {learningOverview?.focusModules.length ? learningOverview.focusModules.map((module) => (
              <div key={module.code} className="al-profile-focus-row">
                <div className="al-profile-focus-meta"><span>{module.name}</span><strong>{module.completed}/{module.total}</strong></div>
                <div className="al-profile-focus-track" aria-hidden="true">
                  <div className="al-profile-focus-fill" style={{ width: `${module.percent}%` }} />
                </div>
              </div>
            )) : <p className="mt-3 text-xs leading-5 text-[#777269]">No tienes competencias pendientes con contenido disponible.</p>}
            <Link href="/roadmap" className="al-profile-roadmap-link">Ver todas las competencias <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </div>

        <SavedHub />
      </div>
    </>
  );
}
