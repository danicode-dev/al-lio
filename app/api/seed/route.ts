import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { deleteTasksByUserLike, createTask } from "@/lib/db/repositories/tasks";
import { deleteHackathonsByUserLike, createHackathon } from "@/lib/db/repositories/hackathons";
import { deleteCoursesByUserLike, createCourse } from "@/lib/db/repositories/courses";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Seed endpoint disabled in production" }, { status: 404 });
  }

  // Auth still via Supabase — replaced in Fase 6.
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "No user found" }, { status: 401 });
  }

  const userId = userData.user.id;

  await deleteTasksByUserLike(userId, "[Demo]%");
  await deleteHackathonsByUserLike(userId, "[Demo]%");
  await deleteCoursesByUserLike(userId, "[Demo]%");

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  await Promise.all([
    createTask(userId, { title: "[Demo] Terminar landing page", due_date: today.toISOString().split("T")[0], status: "pendiente", category: "trabajo", priority: "alta" }),
    createTask(userId, { title: "[Demo] Revisar feedback de usuarios", due_date: tomorrow.toISOString().split("T")[0], status: "pendiente", category: "trabajo", priority: "media" }),
    createTask(userId, { title: "[Demo] Comprar vuelo a Madrid", due_date: nextWeek.toISOString().split("T")[0], status: "pendiente", category: "personal", priority: "media" }),
    createTask(userId, { title: "[Demo] Correr 5km", due_date: today.toISOString().split("T")[0], status: "completada", category: "personal", priority: "baja" }),
    createHackathon(userId, { name: "[Demo] Hackathon AI Google", organizer: "Google", province: "Madrid", city: "Madrid", type: "hackathon", event_start_date: nextWeek.toISOString().split("T")[0], status: "inscripcion_abierta", priority: "alta" }),
    createHackathon(userId, { name: "[Demo] IndieHackers Spain", organizer: "IndieHackers", province: "Online", city: "Online", type: "hackathon", registration_deadline: tomorrow.toISOString().split("T")[0], status: "pendiente", priority: "media" }),
    createCourse(userId, { title: "[Demo] Advanced Next.js 15", platform: "Udemy", deadline: nextWeek.toISOString().split("T")[0], status: "empezado" }),
  ]);

  return NextResponse.json({ success: true });
}
