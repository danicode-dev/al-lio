import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { TechOpportunity } from "@/lib/tech-opportunity-types";
import { getTasksByUser } from "@/lib/db/repositories/tasks";
import { getCoursesByUser } from "@/lib/db/repositories/courses";
import { getHackathonsByUser } from "@/lib/db/repositories/hackathons";
import { getOpportunitiesByUser } from "@/lib/db/repositories/opportunities";
import { getQuickLinksByUser } from "@/lib/db/repositories/quick_links";
import { getAllTechOpportunities } from "@/lib/db/repositories/tech_opportunities";
import { getUserById } from "@/lib/db/repositories/users";

export async function getGlobalStore() {
  // Auth still via Supabase — replaced in Fase 6 (auth propia).
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const userId = userData.user.id;

  const [tasks, courses, hackathons, techOpportunities, opportunities, links, pgUser] =
    await Promise.all([
      getTasksByUser(userId),
      getCoursesByUser(userId),
      getHackathonsByUser(userId),
      getAllTechOpportunities(),
      getOpportunitiesByUser(userId),
      getQuickLinksByUser(userId),
      getUserById(userId),
    ]);

  const rawName =
    pgUser?.display_name ||
    userData.user.user_metadata?.display_name ||
    userData.user.user_metadata?.name ||
    userData.user.email?.split("@")[0] ||
    "Invitado";
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  return {
    version: 2 as const,
    userName,
    tasks: tasks.map((t) => ({
      ...t,
      due_at: t.due_date ?? "",
      category: t.category ?? "diario",
      reminder_at: t.reminder_at ?? "",
      progress_notes: Array.isArray(t.progress_notes) ? t.progress_notes : [],
      completed_at: t.completed_at ?? "",
    })),
    opportunities,
    techOpportunities: sortTechOpportunities(techOpportunities as unknown as TechOpportunity[]),
    courses: courses.map((c) => ({
      ...c,
      deadline_at: c.deadline ?? "",
      start_at: c.start_date ?? "",
    })),
    hackathons: hackathons.map((h) => ({
      ...h,
      start_at: h.event_start_date ?? "",
      end_at: h.event_end_date ?? "",
      registration_deadline_at: h.registration_deadline ?? "",
    })),
    links,
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
      created_at: String(o.created_at || ""),
    })),
  };
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
