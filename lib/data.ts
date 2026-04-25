import { createClient } from "@/lib/supabase/server";

export async function getGlobalStore() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    throw new Error("Unauthorized");
  }

  const [
    { data: tasks },
    { data: courses },
    { data: hackathons },
    { data: opportunities },
    { data: links }
  ] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("courses").select("*").order("created_at", { ascending: false }),
    supabase.from("hackathons").select("*").order("created_at", { ascending: false }),
    supabase.from("opportunities").select("*").order("created_at", { ascending: false }),
    supabase.from("quick_links").select("*").order("created_at", { ascending: false }),
  ]);

  const meta = userData.user.user_metadata || {};
  const userName = meta.display_name || meta.name || userData.user.email?.split("@")[0] || "Invitado";

  return {
    version: 2 as const,
    userName: userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase(),
    tasks: (tasks || []).map((t: any) => ({ ...t, due_at: t.due_date, progress_notes: t.progress_notes || [] })),
    opportunities: opportunities || [],
    courses: (courses || []).map((c: any) => ({ ...c, deadline_at: c.deadline })),
    hackathons: (hackathons || []).map((h: any) => ({
      ...h,
      start_at: h.event_start_date,
      end_at: h.event_end_date,
      registration_deadline_at: h.registration_deadline
    })),
    links: links || [],
    reminders: [],
    companies: (opportunities || []).map((o: any) => ({
      id: o.id,
      name: o.company || o.title,
      web: o.source,
      employment_url: o.url,
      granada: o.location === "Granada",
      tech_stack: o.tags || [],
      link_status: "ok",
      notes: o.notes,
      category: o.category,
      created_at: o.created_at
    })),
  };
}
