import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [tasks, courses, hackathons, reminders] = await Promise.all([
    supabase.from("tasks").select("id,title,due_date,status").eq("user_id", user!.id).not("due_date", "is", null),
    supabase.from("courses").select("id,title,deadline,status").eq("user_id", user!.id).not("deadline", "is", null),
    supabase.from("hackathons").select("id,name,next_review_at,status").eq("user_id", user!.id).not("next_review_at", "is", null),
    supabase.from("reminders").select("id,title,remind_at,sent").eq("user_id", user!.id).order("remind_at", { ascending: true }),
  ]);
  const events = [
    ...(tasks.data ?? []).map((item) => ({ date: item.due_date, title: item.title, type: "tarea", status: item.status })),
    ...(courses.data ?? []).map((item) => ({ date: item.deadline, title: item.title, type: "curso", status: item.status })),
    ...(hackathons.data ?? []).map((item) => ({ date: item.next_review_at, title: item.name, type: "hackathon", status: item.status })),
    ...(reminders.data ?? []).map((item) => ({ date: String(item.remind_at).slice(0, 10), title: item.title, type: "recordatorio", status: item.sent ? "enviado" : "pendiente" })),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return (
    <div>
      <PageHeader title="Calendario" />
      <Card className="p-5">
        <p className="mb-4 text-sm text-muted-foreground">{format(new Date(), "MMMM yyyy", { locale: es })}</p>
        <div className="space-y-2">
          {events.map((event, index) => (
            <div key={`${event.type}-${event.title}-${index}`} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div><p className="font-medium">{event.title}</p><p className="text-sm text-muted-foreground">{event.date}</p></div>
              <div className="flex gap-2"><Badge>{event.type}</Badge><Badge>{event.status}</Badge></div>
            </div>
          ))}
          {!events.length && <p className="text-sm text-muted-foreground">Sin fechas internas.</p>}
        </div>
      </Card>
    </div>
  );
}
