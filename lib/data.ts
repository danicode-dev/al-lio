import { createClient } from "@/lib/supabase/server";
import type { TechOpportunity } from "@/lib/tech-opportunity-types";
import { redirect } from "next/navigation";

export async function getGlobalStore() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect("/login");
  }

  const [
    { data: tasks },
    { data: courses },
    { data: hackathons },
    { data: techOpportunities },
    { data: opportunities },
    { data: links },
  ] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("courses").select("*").order("created_at", { ascending: false }),
    supabase.from("hackathons").select("*").order("created_at", { ascending: false }),
    supabase.from("tech_opportunities").select("*"),
    supabase.from("opportunities").select("*").order("created_at", { ascending: false }),
    supabase.from("quick_links").select("*").order("created_at", { ascending: false }),
  ]);

  const meta = userData.user.user_metadata || {};
  const rawName = meta.display_name || meta.name || userData.user.email?.split("@")[0] || "Invitado";
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  return {
    version: 2 as const,
    userName,
    tasks: (tasks || []).map((t: Record<string, unknown>) => ({
      ...t,
      due_at: t.due_date ?? "",
      category: t.category ?? "diario",
      reminder_at: t.reminder_at ?? "",
      progress_notes: Array.isArray(t.progress_notes) ? t.progress_notes : [],
      completed_at: t.completed_at ?? "",
    })),
    opportunities: opportunities || [],
    techOpportunities: sortTechOpportunities((techOpportunities as TechOpportunity[] | null) || []),
    courses: (courses || []).map((c: Record<string, unknown>) => ({
      ...c,
      deadline_at: c.deadline ?? "",
      start_at: c.start_date ?? "",
    })),
    hackathons: (hackathons || []).map((h: Record<string, unknown>) => ({
      ...h,
      start_at: h.event_start_date ?? "",
      end_at: h.event_end_date ?? "",
      registration_deadline_at: h.registration_deadline ?? "",
    })),
    links: links || [],
    reminders: [],
    companies: (opportunities || []).map((o: Record<string, unknown>) => ({
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
    const priorityDiff = (priorityRank[String(a.prioridad || "").toLowerCase()] ?? 9) - (priorityRank[String(b.prioridad || "").toLowerCase()] ?? 9);
    if (priorityDiff) return priorityDiff;

    const dawDiff = (b.encaje_daw_1_5 ?? 0) - (a.encaje_daw_1_5 ?? 0);
    if (dawDiff) return dawDiff;

    const granadaDiff = (a.provincia?.toLowerCase() === "granada" ? 0 : 1) - (b.provincia?.toLowerCase() === "granada" ? 0 : 1);
    if (granadaDiff) return granadaDiff;

    return String(a.fecha_inicio || "9999-99-99").localeCompare(String(b.fecha_inicio || "9999-99-99"));
  });
}
