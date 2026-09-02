"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Check, CheckCircle2, ChevronLeft, ExternalLink, Heart, Plus, Trophy, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { isPreparationComplete } from "@/lib/fp/event-lifecycle";
import { isSafeHttpUrl } from "@/lib/fp/event-cta";
import { formatDateLabel } from "@/lib/catalog/date-filters";
import { canToggleHackathonFavorite, getDisplayHackathons, getHackathonPresentation, toggleHackathonFavoriteFor } from "@/features/events/presentation";
import { useEventActions } from "@/features/events/client";
import { useLearningActions } from "@/features/learning/client";
import { useTaskActions } from "@/features/tasks/client";
import { useApplicationStore } from "@/shared/store/application-store";
import { StudentHeaderActions } from "@/components/student-header-actions";
import { PageHeader } from "@/components/page-header";
import { CatalogInfoGrid, CatalogNextLink, CatalogPanel } from "@/components/catalog/catalog-card";
import type { Hackathon, RequiredCompetency } from "@/components/store/types";
import {
  HACK_EMPTY_STYLES,
  hackathonAptitudeProgress,
  hackathonStatusLabel,
  hackathonStatusPillClass,
  isCompetencyDone,
  isHackathonArchived,
  opportunityLifecycleLabel,
  type EventsActions,
} from "./event-catalogue-model";
import { addDaysKeepingTime, isHackathonPast } from "./hackathon-dates";

function RequirementRow({ competency, actions }: { competency: RequiredCompetency; actions: EventsActions }) {
  const done = isCompetencyDone(competency);
  const resources = competency.preparationResources ?? [];
  const roleLabel = { primary: "Principal", alternative: "Alternativa", extension: "Ampliación" } as const;
  const statusLabel = { started: "En curso", completed: "Completado" } as const;

  return (
    <div className="rounded-2xl border border-[#ece7dc] p-3.5">
      <div className="flex items-start gap-2.5">
        <span className={cn("al-modal-req-check mt-0.5", done ? "al-modal-req-check-done" : "al-modal-req-check-pending")}>
          <Check className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13.5px] font-bold text-[#111111]">{competency.titulo}</p>
            <span className={cn("al-modal-step-badge", competency.obligatoria_para_item ? "al-modal-step-badge-oblig" : "al-modal-step-badge-reco")}>
              {competency.obligatoria_para_item ? "Imprescindible" : "Recomendada"}
            </span>
          </div>
          {competency.descripcion && <p className="mt-1.5 text-xs leading-5 text-[#4b4740]">{competency.descripcion}</p>}
          <div className="mt-3 space-y-2">
            {resources.map((resource) => {
              const watchedPercent = resource.saved_duration_seconds && resource.last_position_seconds > 0
                ? Math.min(100, Math.round((resource.last_position_seconds / resource.saved_duration_seconds) * 100))
                : null;
              return (
                <div key={resource.id} className="rounded-xl border border-[#ece7dc] bg-[#faf8f4] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("al-modal-step-badge", resource.role === "primary" ? "al-modal-step-badge-oblig" : "al-modal-step-badge-reco")}>{roleLabel[resource.role]}</span>
                        <span className="text-[10.5px] font-semibold text-[#6b6f72]">{resource.provider}</span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] font-bold text-[#22201c]">{resource.title}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10.5px] font-semibold text-[#4b4740]">
                      {resource.user_status ? statusLabel[resource.user_status] : "Sin empezar"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-5 text-[#6b6f72]">{resource.mapping_rationale}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-[#8a857c]">
                    {resource.duration_seconds && <span>{Math.max(1, Math.round(resource.duration_seconds / 60))} min</span>}
                    <span>Verificado {formatDateLabel(resource.source_verified_at)}</span>
                    {watchedPercent !== null && <span>Visto {watchedPercent}%</span>}
                    {resource.user_status === "completed" && resource.completion_method === "self_declared" && <span>Declarado por ti</span>}
                  </div>
                  <Link href={resource.deep_link} className="al-modal-req-btn al-modal-req-btn-video mt-2">
                    {resource.resource_type.startsWith("youtube") ? <Youtube className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                    {resource.user_status === "started" ? "Continuar recurso" : resource.user_status === "completed" ? "Revisar recurso" : "Abrir recurso"}
                  </Link>
                </div>
              );
            })}
            {resources.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#ded8cc] bg-[#faf8f4] px-3 py-2.5">
                <p className="text-[11.5px] font-semibold text-[#6b6f72]">Aún no hay un recurso verificado para esta aptitud.</p>
                <p className="mt-0.5 text-[10.5px] leading-4 text-[#9a958a]">La carencia queda registrada para buscar una opción fiable; no mostraremos un enlace genérico.</p>
              </div>
            )}
          </div>
          {done ? (
            <span className="al-modal-mark-done al-modal-mark-done-active mt-3">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {competency.completion_method === "resource_observed" ? "Completado con evidencia" : "Marcado como hecho"}
            </span>
          ) : (
            <button type="button" className="al-modal-mark-done mt-3" onClick={() => actions.markCompetencyCompleted(competency.id)}>
              <Check className="h-3.5 w-3.5" />Marcar como hecho
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function HackathonDetailView({ id }: { id: string }) {
  const { store } = useApplicationStore();
  const actions = { ...useEventActions(), ...useLearningActions(), ...useTaskActions() };
  const allHackathons = useMemo(
    () => getDisplayHackathons(store.hackathons, store.techOpportunities, store.fpContent),
    [store.hackathons, store.techOpportunities, store.fpContent]
  );
  const item = useMemo(() => allHackathons.find((h) => h.id === id) ?? null, [allHackathons, id]);
  const [pendingComplete, setPendingComplete] = useState(false);

  if (!item) {
    return (
      <div className="space-y-4">
        <style>{HACK_EMPTY_STYLES}</style>
        <PageHeader
          eyebrow="Eventos y retos"
          title="Evento no disponible"
          actions={
            <div className="hidden md:flex md:items-center md:gap-2">
              <StudentHeaderActions />
            </div>
          }
        />
        <div className="al-hack-empty">
          <span className="al-hack-empty-icon"><Trophy className="h-6 w-6" /></span>
          <p className="al-hack-empty-title">Ya no podemos mostrar este evento</p>
          <p className="al-hack-empty-desc">Puede haberse retirado del catálogo o no estar disponible para tu ciclo. Vuelve al listado para ver los eventos activos.</p>
          <Link href="/hackathons" className="al-hack-empty-btn">Volver a Eventos y retos</Link>
        </div>
      </div>
    );
  }

  const presentation = getHackathonPresentation(item);
  const canFavorite = canToggleHackathonFavorite(item);
  const inscripcionFin = presentation.registrationDeadline;
  const requirements = item.requiredCompetencies ?? [];
  const progress = hackathonAptitudeProgress(item);
  const past = isHackathonPast(item);
  const archived = isHackathonArchived(item);
  const requiredSkills = requirements.filter((competency) => competency.obligatoria_para_item);
  const testedSkills = [...new Set([
    ...presentation.skillsTested,
    ...requiredSkills.map((competency) => competency.titulo),
  ].filter(Boolean))];
  const preparationTips = presentation.preparationTips;
  const eligibility = [...new Set([...presentation.audience, ...presentation.otherEligibility, ...presentation.requirements].filter(Boolean))];
  const overviewRows = [
    presentation.startDate ? { label: "Fechas", value: `${formatDateLabel(presentation.startDate)}${presentation.endDate ? ` → ${formatDateLabel(presentation.endDate)}` : ""}` } : null,
    presentation.location ? { label: "Ubicación", value: presentation.location } : null,
    presentation.modality ? { label: "Modalidad", value: presentation.modality } : null,
    inscripcionFin ? { label: "Inscripción hasta", value: formatDateLabel(inscripcionFin) } : null,
    opportunityLifecycleLabel(presentation.lifecycle) ? { label: "Estado", value: opportunityLifecycleLabel(presentation.lifecycle)! } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  const additionalRows = [
    presentation.type ? { label: "Tipo", value: presentation.type } : null,
    presentation.organizer ? { label: "Entidad", value: presentation.organizer } : null,
    presentation.certification ? { label: "Certificación", value: presentation.certification } : null,
    presentation.prize ? { label: "Premio", value: presentation.prize } : null,
    presentation.price ? { label: "Precio", value: presentation.price } : null,
    presentation.modality ? { label: "Modalidad", value: presentation.modality } : null,
    presentation.location ? { label: "Ubicación", value: presentation.location } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  const startKey = (presentation.startDate ?? "").slice(0, 10);
  const nextHackathon = (() => {
    const pool = allHackathons
      .filter((candidate) => candidate.id !== item.id && !isHackathonArchived(candidate))
      .map((candidate) => ({ candidate, key: (candidate.start_at || "").slice(0, 10) }))
      .filter(({ key }) => key)
      .sort((a, b) => a.key.localeCompare(b.key));
    return (pool.find(({ key }) => key >= startKey) ?? pool[0])?.candidate ?? null;
  })();

  async function handleComplete(target: Hackathon) {
    if (pendingComplete) return;
    setPendingComplete(true);
    try {
      await actions.completeHackathon(target);
    } catch {
      // Store action already surfaced a toast and rolled back optimistic state.
    } finally {
      setPendingComplete(false);
    }
  }

  return (
    <div className="space-y-5">
      <style>{`
        .al-modal-req-check { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 999px; flex-shrink: 0; }
        .al-modal-req-check-done { background: linear-gradient(180deg, #4C9A6E, #1f7a4d); color: white; }
        .al-modal-req-check-pending { border: 2px solid #e4dfd5; color: transparent; }
        .al-modal-step-badge { display: inline-flex; align-items: center; height: 20px; padding: 0 9px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; flex-shrink: 0; }
        .al-modal-step-badge-oblig { background: #e7f5ee; color: #1f7a4d; }
        .al-modal-step-badge-reco { background: #fdf1dd; color: #b4791f; }
        .al-modal-req-actions { display: flex; flex-wrap: wrap; gap: 6px; }
        .al-modal-req-btn { display: inline-flex; align-items: center; gap: 5px; height: 29px; padding: 0 10px; border-radius: 8px; border: 1px solid #ece7dc; background: white; font-size: 11px; font-weight: 600; color: #333029; text-decoration: none; cursor: pointer; }
        .al-modal-req-btn-video { border-color: rgba(225, 93, 45, 0.3); background: #fbe7dd; color: #c94f21; }
        .al-modal-mark-done { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 9px; border: none; cursor: pointer; font-size: 11.5px; font-weight: 700; background: linear-gradient(180deg, #4C9A6E, #1f7a4d); color: white; }
        .al-modal-mark-done-active { background: #e7f5ee; color: #1f7a4d; cursor: default; }
      `}</style>
      <Link href="/hackathons" className="inline-flex items-center gap-1 text-xs font-semibold text-[#6b6f72] transition hover:text-[#c94f21]">
        <ChevronLeft className="h-3.5 w-3.5" />Eventos y retos
      </Link>
      <PageHeader
        eyebrow={presentation.type || "Evento o reto"}
        title={presentation.title}
        subtitle={presentation.organizer}
        actions={
          <div className="hidden md:flex md:items-center md:gap-2">
            <StudentHeaderActions />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <CatalogPanel>
            <div className="al-catalog-hero-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/hackathons/eventos-hero.svg" alt="" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("al-catalog-status", hackathonStatusPillClass(item.status))}>{hackathonStatusLabel(item.status)}</span>
              {!archived && isPreparationComplete(item) && (
                <Badge className="al-hack-prep-ready al-hack-chip-green"><CheckCircle2 className="h-3 w-3" />Preparación lista</Badge>
              )}
            </div>
            {past && <p className="rounded-lg bg-[#f3ece1] px-3 py-2 text-xs font-semibold text-[#6b6f72]">Este evento ya ha finalizado.</p>}
            {overviewRows.length > 0 && <CatalogInfoGrid items={overviewRows} />}
          </CatalogPanel>

          {(presentation.description || testedSkills.length > 0 || preparationTips.length > 0 || eligibility.length > 0) && (
            <div className="al-catalog-detail-cols">
            {presentation.description && <CatalogPanel title="Sobre el evento o reto">
              <p className="whitespace-pre-wrap text-[12.5px] leading-6 text-[#4b4740]">{presentation.description}</p>
            </CatalogPanel>}
            {testedSkills.length > 0 && <CatalogPanel title="Qué pondrás a prueba">
                <ul className="space-y-2">
                  {testedSkills.slice(0, 6).map((skill) => (
                    <li key={skill} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1f7a4d]" />{skill}</li>
                  ))}
                </ul>
            </CatalogPanel>}
            {preparationTips.length > 0 && <CatalogPanel title="Cómo prepararte">
              <ul className="space-y-2">
                {preparationTips.map((tip) => <li key={tip} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9a958a]" />{tip}</li>)}
              </ul>
            </CatalogPanel>}
            {eligibility.length > 0 && <CatalogPanel title="Quién puede participar">
              <ul className="space-y-2">
                {eligibility.map((rule) => <li key={rule} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9a958a]" />{rule}</li>)}
              </ul>
            </CatalogPanel>}
            </div>
          )}

          {requirements.length > 0 && (
            <CatalogPanel title="Recursos para prepararte">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] leading-5 text-[#6b6f72]">Cada aptitud muestra sólo recursos exactos, disponibles y verificados para tu ciclo.</p>
                {(progress.requiredTotal > 0 || progress.recommendedTotal > 0) && (
                  <span className="shrink-0 text-right text-[10.5px] font-semibold leading-4 text-[#9a958a]">
                    Obligatorias {progress.requiredDone}/{progress.requiredTotal}<br />
                    Recomendadas {progress.recommendedDone}/{progress.recommendedTotal}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {requirements.map((competency) => (
                  <RequirementRow key={competency.id} competency={competency} actions={actions} />
                ))}
              </div>
            </CatalogPanel>
          )}

          {additionalRows.length > 0 && <CatalogPanel title="Información adicional">
            <CatalogInfoGrid items={additionalRows} />
          </CatalogPanel>}
        </div>

        <div className="space-y-4">
          <CatalogPanel>
            <p className="al-catalog-side-title">Estado del evento</p>
            <span className={cn("al-catalog-status w-fit", hackathonStatusPillClass(item.status))}>{hackathonStatusLabel(item.status)}</span>
            {(inscripcionFin || presentation.startDate) && <div>
              <p className="al-catalog-info-k">Próximo hito</p>
              <p className="al-catalog-info-v">
                {inscripcionFin
                  ? `Cierre de inscripción · ${formatDateLabel(inscripcionFin)}`
                  : `Inicio · ${formatDateLabel(presentation.startDate!)}`}
              </p>
            </div>}
            {progress.total > 0 && (
              <div className="rounded-xl bg-[#faf8f4] p-3">
                <div className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-[#4b4740]">
                  <span>Tu avance de preparación</span>
                  <span>{progress.done}/{progress.total}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eee7dc]">
                  <div className="h-full rounded-full bg-[#1f7a4d] transition-[width]" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
                </div>
                <p className="mt-2 text-[10.5px] leading-4 text-[#8a857c]">
                  Recursos: {progress.resourcesCompleted} completados · {progress.resourcesStarted} en curso. Este indicador organiza tu preparación; no evalúa tu nivel.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-1">
              {isSafeHttpUrl(presentation.sourceUrl) && (
                <a href={presentation.sourceUrl} target="_blank" rel="noopener noreferrer" className="al-catalog-action al-catalog-action-solid">
                  <ExternalLink className="h-3.5 w-3.5" />Abrir convocatoria oficial
                </a>
              )}
              {canFavorite && (
                <button
                  type="button"
                  className={cn("al-catalog-action", item.is_favorite && "al-catalog-action-soft")}
                  aria-pressed={!!item.is_favorite}
                  onClick={() => toggleHackathonFavoriteFor(item, actions)}
                >
                  <Heart className="h-3.5 w-3.5" fill={item.is_favorite ? "currentColor" : "none"} />
                  {item.is_favorite ? "Guardado en favoritos" : "Guardar en favoritos"}
                </button>
              )}
              <button type="button" className="al-catalog-action" onClick={() => actions.addTask({ title: `Revisar ${item.name}`, due_at: addDaysKeepingTime("", 1), status: "pendiente", priority: "media", description: "Evento o reto" }).catch(() => {})}>
                <Plus className="h-3.5 w-3.5" />Crear tarea
              </button>
              {!archived && item.sourceTable !== "tech_opportunities" && (
                <button type="button" className="al-catalog-action" disabled={pendingComplete} onClick={() => handleComplete(item)}>
                  <CheckCircle2 className="h-3.5 w-3.5" />{pendingComplete ? "Guardando…" : "Realizado"}
                </button>
              )}
            </div>
          </CatalogPanel>

          {nextHackathon && (() => {
            const nextPresentation = getHackathonPresentation(nextHackathon);
            return (
              <CatalogPanel>
                <p className="al-catalog-side-title">Siguiente evento o reto</p>
                <CatalogNextLink
                  href={`/hackathons/${encodeURIComponent(nextHackathon.id)}`}
                  title={nextPresentation.title}
                  meta={nextPresentation.startDate ? `Inicio · ${formatDateLabel(nextPresentation.startDate)}` : nextPresentation.organizer || "Ver evento"}
                  actionLabel="Ver evento"
                />
              </CatalogPanel>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
