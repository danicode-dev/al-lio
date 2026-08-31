"use client";

import { Component, type ReactNode, useMemo } from "react";
import Link from "next/link";
import { Building2, BookOpen, ExternalLink, Heart, Trophy, type LucideIcon } from "lucide-react";
import { useCourseActions, type CourseActions } from "@/features/courses/client";
import { useEventActions, type EventActions } from "@/features/events/client";
import { useLearningActions, type LearningActions } from "@/features/learning/client";
import { useWorkActions, type WorkActions } from "@/features/work/client";
import { useApplicationStore } from "@/shared/store/application-store";
import { canToggleCourseFavorite, getDisplayCourses, toggleCourseFavoriteFor } from "@/features/courses";
import { getDisplayHackathons } from "@/features/events";
import type { Course, Hackathon } from "@/components/store/types";
import { getCoursePresentation } from "@/features/courses/presentation";
import { canToggleHackathonFavorite, getHackathonPresentation, toggleHackathonFavoriteFor } from "@/features/events/presentation";
import { isSafeHttpUrl } from "@/lib/fp/event-cta";

const VISIBLE_PER_SECTION = 4;

// A rendering bug in one saved-content section must never take down the
// rest of Perfil, including the profile edit form above it (issue #136:
// "a saved-items outage must not prevent the student from editing their
// profile"). React only supports catching render errors from a class
// component, hence the small hand-rolled boundary instead of a hook.
class SavedHubBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <section className="mt-6 min-w-0 rounded-[20px] border border-[#ece7dc] bg-white p-4 text-sm text-[#6b6f72] shadow-[0_12px_32px_rgba(17,17,17,0.06)] sm:p-6">
          No se pudieron cargar tus guardados ahora mismo. El resto de tu perfil sigue disponible.
        </section>
      );
    }
    return this.props.children;
  }
}

export function SavedHub() {
  return (
    <SavedHubBoundary>
      <SavedHubContent />
    </SavedHubBoundary>
  );
}

function SavedHubContent() {
  const { store } = useApplicationStore();
  const actions = { ...useCourseActions(), ...useEventActions(), ...useLearningActions(), ...useWorkActions() };

  // Every list here is derived from the same live, already user/cycle-scoped
  // store the rest of the app renders from - no separate fetch, no parallel
  // storage. Toggling a heart on any origin module (Trabajo/Cursos/Eventos)
  // updates this instantly, and a favorite whose underlying catalogue row
  // has since disappeared simply stops appearing here too (is_favorite lives
  // on the row itself, so there is no separate id list that can go stale).
  const savedCompanies = useMemo(() => store.companies.filter((c) => c.is_favorite), [store.companies]);
  const savedCourses = useMemo(
    () => getDisplayCourses(store.courses, store.techOpportunities, store.fpContent).filter((c) => c.is_favorite),
    [store.courses, store.techOpportunities, store.fpContent],
  );
  const savedHackathons = useMemo(
    () => getDisplayHackathons(store.hackathons, store.techOpportunities, store.fpContent).filter((h) => h.is_favorite),
    [store.hackathons, store.techOpportunities, store.fpContent],
  );

  const totalSaved = savedCompanies.length + savedCourses.length + savedHackathons.length;

  return (
    <section className="mt-6 min-w-0 space-y-4">
      <div className="min-w-0">
        <p className="al-page-header-eyebrow">Tu actividad</p>
        <h2 className="al-page-header-title" style={{ fontSize: "clamp(20px, 2.4vw, 26px)" }}>Guardados</h2>
        <p className="al-page-header-subtitle">Empresas, cursos y eventos que has marcado con el corazón, todos en un solo sitio.</p>
      </div>

      {totalSaved === 0 ? (
        <div className="rounded-[20px] border border-[#ece7dc] bg-white p-4 text-center shadow-[0_12px_32px_rgba(17,17,17,0.06)] sm:p-6">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbe7dd] text-[#E15D2D]"><Heart className="h-5 w-5" /></span>
          <p className="text-sm font-bold text-[#111111]">Todavía no has guardado nada</p>
          <p className="mx-auto mt-1 max-w-[40ch] text-xs leading-5 text-[#6b6f72]">
            Toca el corazón de una empresa en Trabajo, un curso en Cursos, o un evento en Eventos y retos para verlo aquí.
          </p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
          <SavedSection
            icon={Building2}
            title="Empresas"
            count={savedCompanies.length}
            viewAllHref="/work"
            emptyHint="Toca el corazón de una empresa en Trabajo para guardarla aquí."
          >
            {savedCompanies.slice(0, VISIBLE_PER_SECTION).map((company) => (
              <SavedRow
                key={company.id}
                title={company.nombre}
                subtitle={company.categoria}
                primaryHref="/work"
                secondaryHref={isSafeHttpUrl(company.web) ? company.web : undefined}
                onUnsave={() => actions.toggleCompanyFavorite(company.id)}
              />
            ))}
          </SavedSection>

          <SavedSection
            icon={BookOpen}
            title="Cursos"
            count={savedCourses.length}
            viewAllHref="/courses"
            emptyHint="Toca el corazón de un curso en Cursos para guardarlo aquí."
          >
            {savedCourses.slice(0, VISIBLE_PER_SECTION).map((course) => (
              <SavedCourseRow key={course.id} course={course} actions={actions} />
            ))}
          </SavedSection>

          <SavedSection
            icon={Trophy}
            title="Eventos y retos"
            count={savedHackathons.length}
            viewAllHref="/hackathons"
            emptyHint="Toca el corazón de un evento en Eventos y retos para guardarlo aquí."
          >
            {savedHackathons.slice(0, VISIBLE_PER_SECTION).map((hackathon) => (
              <SavedHackathonRow key={hackathon.id} hackathon={hackathon} actions={actions} />
            ))}
          </SavedSection>
        </div>
      )}
    </section>
  );
}

type SavedActions = CourseActions & EventActions & LearningActions & WorkActions;

function SavedCourseRow({ course, actions }: { course: Course; actions: SavedActions }) {
  const presentation = getCoursePresentation(course);
  return (
    <SavedRow
      title={presentation.title}
      subtitle={presentation.provider}
      primaryHref={`/courses/${encodeURIComponent(course.id)}`}
      secondaryHref={isSafeHttpUrl(presentation.sourceUrl) ? presentation.sourceUrl : undefined}
      onUnsave={canToggleCourseFavorite(course) ? () => toggleCourseFavoriteFor(course, actions) : undefined}
    />
  );
}

function SavedHackathonRow({ hackathon, actions }: { hackathon: Hackathon; actions: SavedActions }) {
  const presentation = getHackathonPresentation(hackathon);
  return (
    <SavedRow
      title={presentation.title}
      subtitle={presentation.organizer}
      primaryHref={`/hackathons/${encodeURIComponent(hackathon.id)}`}
      secondaryHref={isSafeHttpUrl(presentation.sourceUrl) ? presentation.sourceUrl : undefined}
      onUnsave={canToggleHackathonFavorite(hackathon) ? () => toggleHackathonFavoriteFor(hackathon, actions) : undefined}
    />
  );
}

function SavedSection({
  icon: Icon,
  title,
  count,
  viewAllHref,
  emptyHint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  viewAllHref: string;
  emptyHint: string;
  children: ReactNode;
}) {
  const hasMore = count > VISIBLE_PER_SECTION;
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-[20px] border border-[#ece7dc] bg-white p-3.5 shadow-[0_12px_32px_rgba(17,17,17,0.06)] sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#fbe7dd] text-[#E15D2D]"><Icon className="h-4 w-4" /></span>
          <p className="min-w-0 text-[13.5px] font-bold leading-tight text-[#111111]">{title}</p>
        </div>
        <span className="rounded-full bg-[#f7f4ee] px-2 py-0.5 text-[11px] font-bold text-[#5f5a52]">{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-xs leading-5 text-[#6b6f72]">{emptyHint}</p>
      ) : (
        <>
          <div className="space-y-1.5">{children}</div>
          <Link href={viewAllHref} className="mt-1 text-xs font-bold text-[#c94f21] hover:underline">
            {hasMore ? `Ver todos (${count})` : "Ver módulo"}
          </Link>
        </>
      )}
    </div>
  );
}

function SavedRow({
  title,
  subtitle,
  primaryHref,
  secondaryHref,
  onUnsave,
}: {
  title: string;
  subtitle?: string;
  primaryHref: string;
  secondaryHref?: string;
  onUnsave?: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1 rounded-xl border border-[#f0ece2] py-1.5 pl-2.5 pr-1.5 sm:gap-2 sm:py-2 sm:pr-2.5">
      <Link href={primaryHref} className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold text-[#333029]">{title}</p>
        {subtitle && <p className="truncate text-[11px] text-[#9a958a]">{subtitle}</p>}
      </Link>
      {secondaryHref && (
        <a href={secondaryHref} target="_blank" rel="noopener noreferrer" aria-label="Abrir enlace oficial" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#9a958a] hover:text-[#c94f21] sm:h-8 sm:w-8">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      {onUnsave && (
        <button type="button" onClick={onUnsave} aria-label="Quitar de guardados" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#E15D2D] hover:bg-[#fbe7dd] sm:h-8 sm:w-8">
          <Heart className="h-3.5 w-3.5" fill="currentColor" />
        </button>
      )}
    </div>
  );
}
