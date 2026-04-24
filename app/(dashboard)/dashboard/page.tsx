import { Briefcase, CalendarDays, FolderKanban, GraduationCap, LinkIcon, ListTodo } from "lucide-react";
import { DashboardSummary } from "@/components/dashboard-summary";
import { FolderCard } from "@/components/folder-card";
import { createClient } from "@/lib/supabase/server";
import { greeting } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [tasks, opportunities, hackathons, courses, links] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "completada"),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["guardada", "pendiente_revision"]),
    supabase.from("hackathons").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["pendiente", "revisar_futura_edicion", "inscripcion_abierta"]),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["pendiente", "empezado"]),
    supabase.from("quick_links").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const folderItems = [
    { href: "/work", title: "Trabajo", description: "Ofertas, busquedas y candidaturas", count: `${opportunities.count ?? 0} guardadas`, icon: Briefcase },
    { href: "/courses", title: "Cursos", description: "Formacion pendiente y activa", count: `${courses.count ?? 0} pendientes`, icon: GraduationCap },
    { href: "/hackathons", title: "Hackathons", description: "Eventos y retos por provincia", count: `${hackathons.count ?? 0} revisar`, icon: FolderKanban },
    { href: "/tasks", title: "Tareas", description: "Pendientes y recordatorios", count: `${tasks.count ?? 0} abiertas`, icon: ListTodo },
    { href: "/calendar", title: "Calendario", description: "Fechas internas", count: "mensual", icon: CalendarDays },
    { href: "/links", title: "Enlaces rapidos", description: "Accesos utiles", count: `${links.count ?? 0} enlaces`, icon: LinkIcon },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Panel personal</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal">{greeting("Dani")}</h1>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {folderItems.map((item) => (
          <FolderCard key={item.href} {...item} />
        ))}
      </section>
      <DashboardSummary
        items={[
          { label: "Tareas pendientes", value: tasks.count ?? 0 },
          { label: "Ofertas guardadas", value: opportunities.count ?? 0 },
          { label: "Hackathons para revisar", value: hackathons.count ?? 0 },
          { label: "Cursos pendientes", value: courses.count ?? 0 },
        ]}
      />
    </div>
  );
}
