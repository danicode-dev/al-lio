import { redirect } from "next/navigation";
import type { TechOpportunity } from "@/lib/tech-opportunity-types";
import { getSession } from "@/lib/auth/session";
import { getTasksByUser } from "@/lib/db/repositories/tasks";
import { getCoursesByUser } from "@/lib/db/repositories/courses";
import { getHackathonsByUser } from "@/lib/db/repositories/hackathons";
import { getOpportunitiesByUser } from "@/lib/db/repositories/opportunities";
import { getQuickLinksByUser } from "@/lib/db/repositories/quick_links";
import { getAllTechOpportunities } from "@/lib/db/repositories/tech_opportunities";
import { getUserById } from "@/lib/db/repositories/users";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getFpContentForProfile } from "@/lib/db/repositories/fp_catalog";

export async function getGlobalStore() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.uid;

  const profile = await getProfileByUser(userId);
  if (!profile || !profile.onboarding_completed_at) redirect("/onboarding");

  const [tasks, courses, hackathons, techOpportunities, opportunities, links, pgUser, fpContent] =
    await Promise.all([
      getTasksByUser(userId),
      getCoursesByUser(userId),
      getHackathonsByUser(userId),
      getAllTechOpportunities(),
      getOpportunitiesByUser(userId),
      getQuickLinksByUser(userId),
      getUserById(userId),
      getFpContentForProfile(userId, profile),
    ]);

  const rawName =
    pgUser?.display_name ||
    session.name ||
    session.email.split("@")[0] ||
    "Invitado";
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  return {
    version: 2 as const,
    userName,
    tasks: tasks.map((t) => ({
      ...t,
      due_date: ymd(t.due_date),
      due_at: ymd(t.due_date),
      category: t.category ?? "diario",
      reminder_at: iso(t.reminder_at),
      progress_notes: Array.isArray(t.progress_notes) ? t.progress_notes : [],
      completed_at: iso(t.completed_at),
      created_at: iso(t.created_at),
      updated_at: iso(t.updated_at),
    })),
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
    courses: courses.map((c) => ({
      ...c,
      start_date: ymd(c.start_date),
      deadline: ymd(c.deadline),
      deadline_at: ymd(c.deadline),
      start_at: ymd(c.start_date),
      fecha_inicio: ymd(c.fecha_inicio),
      fecha_fin: ymd(c.fecha_fin),
      ultima_revision: ymd(c.ultima_revision),
      created_at: iso(c.created_at),
      updated_at: iso(c.updated_at),
    })),
    fpContent: fpContent.map((item) => ({
      ...item,
      start_date: ymd(item.start_date),
      end_date: ymd(item.end_date),
      last_reviewed_at: ymd(item.last_reviewed_at),
      created_at: iso(item.created_at),
      updated_at: iso(item.updated_at),
    })),
    hackathons: hackathons.map((h) => ({
      ...h,
      event_start_date: ymd(h.event_start_date),
      event_end_date: ymd(h.event_end_date),
      registration_deadline: ymd(h.registration_deadline),
      start_at: ymd(h.event_start_date),
      end_at: ymd(h.event_end_date),
      registration_deadline_at: ymd(h.registration_deadline),
      inscripcion_hasta: ymd(h.inscripcion_hasta),
      ultima_revision: ymd(h.ultima_revision),
      detected_at: ymd(h.detected_at),
      last_reviewed_at: ymd(h.last_reviewed_at),
      next_review_at: ymd(h.next_review_at),
      created_at: iso(h.created_at),
      updated_at: iso(h.updated_at),
    })),
    links: links.map((l) => ({
      ...l,
      created_at: iso(l.created_at),
      updated_at: iso(l.updated_at),
    })),
    reminders: [],
    companies: opportunities.map((o) => ({
      id: o.id,
      name: String(o.company || o.title || ""),
      web: String(o.source || ""),
      employment_url: String(o.url || ""),
      granada: o.location === "Granada" ? "Granada" : undefined,
      employment_type: "oportunidad",
      link_status: "ok" as const,
      notes: o.notes ? String(o.notes) : undefined,
      category: o.category ? String(o.category) : undefined,
      created_at: iso(o.created_at),
    })),
  };
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
