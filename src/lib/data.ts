import { redirect } from "next/navigation";
import { cache } from "react";
import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";
import { getSession } from "@/lib/auth/session";
import { getTasksByUser } from "@/lib/db/repositories/tasks";
import { getCoursesByUser } from "@/lib/db/repositories/courses";
import { getHackathonsByUser } from "@/lib/db/repositories/hackathons";
import { getOpportunitiesByUser } from "@/lib/db/repositories/opportunities";
import { getQuickLinksByUser } from "@/lib/db/repositories/quick_links";
import { getAllTechOpportunities } from "@/lib/db/repositories/tech_opportunities";
import { getCompaniesByCycleGroup, getFavoriteCompanyIds } from "@/lib/db/repositories/companies";
import { getUserById } from "@/lib/db/repositories/users";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getLearningOverview } from "@/lib/learning/overview";
import {
  getFpContentForProfile,
  getRequiredCompetenciesForItems,
  getLearningItemsForCompetencies,
  getUserContentStatesForItems,
  type CompetencyLearningItem,
} from "@/lib/db/repositories/fp_catalog";

export const FP_APTITUDE_GATED_TYPES = new Set(["hackathon", "evento", "reto", "convocatoria_practicas"]);

export type StoreLoadSection = "tasks" | "courses" | "hackathons" | "opportunities" | "companies" | "roadmap";

export const getGlobalStore = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.uid;

  const [profile, pgUser] = await Promise.all([
    getProfileByUser(userId),
    getUserById(userId),
  ]);
  if (!profile || !profile.onboarding_completed_at) redirect("/onboarding");

  const issues: StoreLoadSection[] = [];

  const [tasks, courses, hackathons, techOpportunities, opportunities, links, fpContent, dbCompanies, favoriteCompanyIds, roadmap] =
    await Promise.all([
      loadStoreSection("tasks", getTasksByUser(userId), [], issues),
      loadStoreSection("courses", getCoursesByUser(userId), [], issues),
      loadStoreSection("hackathons", getHackathonsByUser(userId), [], issues),
      loadStoreSection("opportunities", getAllTechOpportunities(), [], issues),
      getOpportunitiesByUser(userId),
      getQuickLinksByUser(userId),
      loadStoreSection("opportunities", getFpContentForProfile(userId, profile), [], issues),
      profile.cycle_group
        ? loadStoreSection("companies", getCompaniesByCycleGroup(profile.cycle_group), [], issues)
        : Promise.resolve([]),
      loadStoreSection("companies", getFavoriteCompanyIds(userId), new Set<string>(), issues),
      loadStoreSection("roadmap", getLearningOverview(userId, profile), null, issues),
    ]);

  const aptitudeGatedItemIds = fpContent
    .filter((item) => FP_APTITUDE_GATED_TYPES.has(item.type))
    .map((item) => item.id);
  const requiredCompetenciesByItem = await getRequiredCompetenciesForItems(aptitudeGatedItemIds);
  const requiredCompetencyIds = [...new Set([...requiredCompetenciesByItem.values()].flat().map((c) => c.id))];
  const learningItemsByCompetency = profile.cycle_code
    ? await getLearningItemsForCompetencies(requiredCompetencyIds, profile.cycle_code)
    : new Map();
  const learningItemIds = [...new Set([...learningItemsByCompetency.values()].flat().map((li) => li.id))];
  const learningItemStatusById = await getUserContentStatesForItems(userId, learningItemIds);

  const rawName =
    pgUser?.display_name ||
    session.name ||
    session.email.split("@")[0] ||
    "Invitado";
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  return {
    version: 2 as const,
    userName,
    tasks: serializeTasks(tasks),
    opportunities: opportunities.map((o) => ({
      ...o,
      published_at: iso(o.published_at),
      detected_at: iso(o.detected_at),
      created_at: iso(o.created_at),
      updated_at: iso(o.updated_at),
    })),
    techOpportunities: sortTechOpportunities(
      (techOpportunities as unknown as TechOpportunity[]).map((item) => ({
        ...item,
        fecha_inicio: ymd(item.fecha_inicio),
        fecha_fin: ymd(item.fecha_fin),
        ultima_revision: ymd(item.ultima_revision),
        created_at: iso(item.created_at),
        updated_at: iso(item.updated_at),
      })),
    ),
    courses: serializeCourses(courses),
    fpContent: fpContent.map((item) => ({
      ...item,
      start_date: ymd(item.start_date),
      end_date: ymd(item.end_date),
      last_reviewed_at: ymd(item.last_reviewed_at),
      created_at: iso(item.created_at),
      updated_at: iso(item.updated_at),
      requiredCompetencies: (requiredCompetenciesByItem.get(item.id) ?? []).map((competency) => ({
        ...competency,
        ultima_revision: ymd(competency.ultima_revision),
        created_at: iso(competency.created_at),
        updated_at: iso(competency.updated_at),
        learningItems: (learningItemsByCompetency.get(competency.id) ?? []).map((learningItem: CompetencyLearningItem) => ({
          ...learningItem,
          user_status: learningItemStatusById.get(learningItem.id) ?? null,
        })),
      })),
    })),
    hackathons: serializeHackathons(hackathons),
    links: links.map((l) => ({
      ...l,
      created_at: iso(l.created_at),
      updated_at: iso(l.updated_at),
    })),
    reminders: [],
    roadmap,
    companies: dbCompanies.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      web: c.web ?? undefined,
      empleo_url: c.empleo_url ?? undefined,
      categoria: c.categoria ?? undefined,
      granada_note: c.granada_note ?? undefined,
      is_favorite: favoriteCompanyIds.has(c.id),
    })),
    loadIssues: [...new Set(issues)],
  };
});

async function loadStoreSection<T>(
  section: StoreLoadSection,
  promise: Promise<T>,
  fallback: T,
  issues: StoreLoadSection[],
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    issues.push(section);
    console.error(`[store] No se pudo cargar ${section}`, error);
    return fallback;
  }
}

function serializeTasks(tasks: Awaited<ReturnType<typeof getTasksByUser>>) {
  return tasks.map((task) => ({
    ...task,
    due_date: ymd(task.due_date),
    due_at: ymd(task.due_date),
    category: task.category ?? "diario",
    reminder_at: iso(task.reminder_at),
    progress_notes: Array.isArray(task.progress_notes) ? task.progress_notes : [],
    completed_at: iso(task.completed_at),
    created_at: iso(task.created_at),
    updated_at: iso(task.updated_at),
  }));
}

function serializeCourses(courses: Awaited<ReturnType<typeof getCoursesByUser>>) {
  return courses.map((course) => ({
    ...course,
    start_date: ymd(course.start_date),
    deadline: ymd(course.deadline),
    deadline_at: ymd(course.deadline),
    start_at: ymd(course.start_date),
    fecha_inicio: ymd(course.fecha_inicio),
    fecha_fin: ymd(course.fecha_fin),
    ultima_revision: ymd(course.ultima_revision),
    created_at: iso(course.created_at),
    updated_at: iso(course.updated_at),
  }));
}

function serializeHackathons(hackathons: Awaited<ReturnType<typeof getHackathonsByUser>>) {
  return hackathons.map((hackathon) => ({
    ...hackathon,
    event_start_date: ymd(hackathon.event_start_date),
    event_end_date: ymd(hackathon.event_end_date),
    registration_deadline: ymd(hackathon.registration_deadline),
    start_at: ymd(hackathon.event_start_date),
    end_at: ymd(hackathon.event_end_date),
    registration_deadline_at: ymd(hackathon.registration_deadline),
    inscripcion_hasta: ymd(hackathon.inscripcion_hasta),
    ultima_revision: ymd(hackathon.ultima_revision),
    detected_at: ymd(hackathon.detected_at),
    last_reviewed_at: ymd(hackathon.last_reviewed_at),
    next_review_at: ymd(hackathon.next_review_at),
    created_at: iso(hackathon.created_at),
    updated_at: iso(hackathon.updated_at),
  }));
}

function iso(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }
  return String(value);
}

function ymd(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export type GlobalStore = Awaited<ReturnType<typeof getGlobalStore>>;

const priorityRank: Record<string, number> = { alta: 0, media: 1, baja: 2 };

function sortTechOpportunities(items: TechOpportunity[]) {
  return [...items].sort((a, b) => {
    const priorityDiff =
      (priorityRank[String(a.prioridad || "").toLowerCase()] ?? 9) -
      (priorityRank[String(b.prioridad || "").toLowerCase()] ?? 9);
    if (priorityDiff) return priorityDiff;

    const dawDiff = (b.encaje_daw_1_5 ?? 0) - (a.encaje_daw_1_5 ?? 0);
    if (dawDiff) return dawDiff;

    const granadaDiff =
      (a.provincia?.toLowerCase() === "granada" ? 0 : 1) -
      (b.provincia?.toLowerCase() === "granada" ? 0 : 1);
    if (granadaDiff) return granadaDiff;

    return String(a.fecha_inicio || "9999-99-99").localeCompare(
      String(b.fecha_inicio || "9999-99-99")
    );
  });
}
