"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BookOpen, Check, CheckCircle2, ChevronLeft, ExternalLink, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNextCatalogItem } from "@/lib/catalog/next-item";
import { formatDateLabel } from "@/lib/catalog/date-filters";
import { Badge } from "@/components/ui/badge";
import { isSafeHttpUrl } from "@/lib/fp/event-cta";
import { getCoursePresentation, getDisplayCourses } from "@/features/courses/presentation";
import { useCourseActions } from "@/features/courses/client";
import { useLearningActions } from "@/features/learning/client";
import { useApplicationStore } from "@/shared/store/application-store";
import { StudentHeaderActions } from "@/components/student-header-actions";
import { PageHeader } from "@/components/page-header";
import { CatalogInfoGrid, CatalogNextLink, CatalogPanel } from "@/components/catalog/catalog-card";
import {
  canToggleCourseFavorite,
  COURSE_EMPTY_STYLES,
  courseHeroImage,
  courseStatusClass,
  isCourseArchived,
  opportunityLifecycleLabel,
  toggleCourseFavoriteFor,
} from "./course-catalogue-model";

export function CourseDetailView({ id }: { id: string }) {
  const { store } = useApplicationStore();
  const actions = { ...useCourseActions(), ...useLearningActions() };
  const allCourses = useMemo(
    () => getDisplayCourses(store.courses, store.techOpportunities, store.fpContent),
    [store.courses, store.techOpportunities, store.fpContent]
  );
  const item = useMemo(() => allCourses.find((c) => c.id === id) ?? null, [allCourses, id]);

  if (!item) {
    return (
      <div className="space-y-4">
        <style>{COURSE_EMPTY_STYLES}</style>
        <PageHeader
          eyebrow="Cursos"
          title="Curso no disponible"
          actions={
            <div className="hidden md:flex md:items-center md:gap-2">
              <StudentHeaderActions />
            </div>
          }
        />
        <div className="al-course-empty">
          <span className="al-course-empty-icon"><BookOpen className="h-6 w-6" /></span>
          <p className="al-course-empty-title">Ya no podemos mostrar este curso</p>
          <p className="al-course-empty-desc">Puede haberse retirado del catálogo o no estar disponible para tu ciclo. Vuelve al listado para ver los cursos activos.</p>
          <Link href="/courses" className="al-course-empty-btn">Volver a Cursos</Link>
        </div>
      </div>
    );
  }

  const presentation = getCoursePresentation(item);
  const canFavorite = canToggleCourseFavorite(item);
  const archived = isCourseArchived(item);
  const aptitudes = item.aptitudes ?? [];

  const learnings = [...new Set([
    ...presentation.learningOutcomes,
    ...aptitudes.filter((a) => a.relation === "ensena").map((a) => a.titulo),
  ].filter(Boolean))];
  const requirements = [...new Set([
    ...(presentation.minimumEducation ? [`Formación mínima: ${presentation.minimumEducation}`] : []),
    ...presentation.otherEligibility,
    ...presentation.requirements,
  ].filter(Boolean))];
  const startKey = (presentation.startDate ?? "").slice(0, 10);
  const daysUntil = startKey ? Math.ceil((new Date(`${startKey}T00:00:00`).getTime() - Date.now()) / 86_400_000) : null;
  const nextCourse = getNextCatalogItem(allCourses, item.id);
  const infoRows: Array<[string, string | undefined]> = [
    ["Certificación", presentation.certification],
    ["Nivel de la acreditación", presentation.credentialLevel],
    ["Modalidad", presentation.modality],
    ["Entidad", presentation.provider],
    ["Duración", presentation.duration],
    ["Precio", presentation.price],
    ["Disponibilidad", opportunityLifecycleLabel(presentation.lifecycle)],
  ];
  const overviewRows = [
    presentation.startDate ? { label: "Fechas", value: `${formatDateLabel(presentation.startDate)}${presentation.endDate ? ` → ${formatDateLabel(presentation.endDate)}` : ""}` } : null,
    presentation.location ? { label: "Ubicación", value: presentation.location } : null,
    presentation.modality ? { label: "Modalidad", value: presentation.modality } : null,
    presentation.courseDifficulty ? { label: "Dificultad", value: presentation.courseDifficulty } : null,
    presentation.minimumEducation ? { label: "Formación mínima", value: presentation.minimumEducation } : null,
    presentation.duration ? { label: "Duración", value: presentation.duration } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <div className="space-y-5">
      <Link href="/courses" className="inline-flex items-center gap-1 text-xs font-semibold text-[#6b6f72] transition hover:text-[#c94f21]">
        <ChevronLeft className="h-3.5 w-3.5" />Cursos
      </Link>
      <PageHeader
        eyebrow="Curso"
        title={presentation.title}
        subtitle={presentation.provider}
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
              <img src={courseHeroImage(item)} alt="" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn(courseStatusClass(item.status))}>{item.status}</Badge>
            </div>
            {overviewRows.length > 0 && <CatalogInfoGrid items={overviewRows} />}
          </CatalogPanel>

          {(presentation.description || learnings.length > 0 || requirements.length > 0) && (
            <div className="al-catalog-detail-cols">
            {presentation.description && <CatalogPanel title="Sobre el curso">
              <p className="whitespace-pre-wrap text-[12.5px] leading-6 text-[#4b4740]">{presentation.description}</p>
            </CatalogPanel>}
            {learnings.length > 0 && <CatalogPanel title="Qué aprenderás">
                <ul className="space-y-2">
                  {learnings.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1f7a4d]" />{t}</li>
                  ))}
                </ul>
            </CatalogPanel>}
            {requirements.length > 0 && <CatalogPanel title="Requisitos de acceso">
                <ul className="space-y-2">
                  {requirements.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#4b4740]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9a958a]" />{t}</li>
                  ))}
                </ul>
            </CatalogPanel>}
            </div>
          )}

          {aptitudes.length > 0 && (
            <CatalogPanel title="Estructura del curso">
              <ol className="space-y-2.5">
                {aptitudes.map((a, i) => (
                  <li key={`${a.id}-${a.relation}`} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fbe7dd] text-[11px] font-bold text-[#c94f21]">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-[#111111]">{a.titulo}</p>
                      {a.descripcion && <p className="mt-0.5 text-[11.5px] leading-5 text-[#6b6f72]">{a.descripcion}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </CatalogPanel>
          )}

          {infoRows.some(([, value]) => value) && <CatalogPanel title="Información adicional">
            <CatalogInfoGrid items={infoRows.filter(([, value]) => value).map(([label, value]) => ({ label, value }))} />
          </CatalogPanel>}

        </div>

        <div className="space-y-4">
          <CatalogPanel>
            <p className="al-catalog-side-title">Estado del curso</p>
            <Badge className={cn(courseStatusClass(item.status))}>{item.status}</Badge>
            {presentation.startDate && <div>
              <p className="al-catalog-info-k">Próximo hito</p>
              <p className="al-catalog-info-v">Inicio · {formatDateLabel(presentation.startDate)}</p>
            </div>}
            {typeof daysUntil === "number" && daysUntil >= 0 && (
              <div className="rounded-xl bg-[#e7f5ee] px-3 py-2 text-[12px] font-semibold text-[#1f7a4d]">
                {daysUntil === 0 ? "Empieza hoy" : `Faltan ${daysUntil} ${daysUntil === 1 ? "día" : "días"}`}
              </div>
            )}
            <div className="flex flex-col gap-2 pt-1">
              {isSafeHttpUrl(presentation.sourceUrl) && (
                <a href={presentation.sourceUrl} target="_blank" rel="noopener noreferrer" className="al-catalog-action al-catalog-action-solid">
                  <ExternalLink className="h-3.5 w-3.5" />Abrir curso
                </a>
              )}
              {canFavorite && (
                <button
                  type="button"
                  className={cn("al-catalog-action", item.is_favorite && "al-catalog-action-soft")}
                  aria-pressed={!!item.is_favorite}
                  onClick={() => toggleCourseFavoriteFor(item, actions)}
                >
                  <Heart className="h-3.5 w-3.5" fill={item.is_favorite ? "currentColor" : "none"} />
                  {item.is_favorite ? "Guardado en favoritos" : "Guardar en favoritos"}
                </button>
              )}
              {!archived && (
                <button type="button" className="al-catalog-action" onClick={() => actions.completeCourse(item).catch(() => {})}>
                  <CheckCircle2 className="h-3.5 w-3.5" />Marcar como terminado
                </button>
              )}
            </div>
          </CatalogPanel>

          {nextCourse && (
            <CatalogPanel>
              <p className="al-catalog-side-title">Siguiente curso</p>
              <CatalogNextLink
                href={`/courses/${encodeURIComponent(nextCourse.id)}`}
                title={nextCourse.title}
                meta={(nextCourse.fecha_inicio || nextCourse.start_at)
                  ? `Inicio · ${formatDateLabel((nextCourse.fecha_inicio || nextCourse.start_at)!)}`
                  : nextCourse.entidad || "Ver curso"}
                actionLabel="Ver curso"
              />
            </CatalogPanel>
          )}
        </div>
      </div>
    </div>
  );
}
