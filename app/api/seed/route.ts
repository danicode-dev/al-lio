import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Seed endpoint disabled in production" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "No user found" }, { status: 401 });
  }

  const userId = userData.user.id;

  // Cleanup old dummy data generated today just in case
  await supabase.from("tasks").delete().eq("user_id", userId).like("title", "[Demo]%");
  await supabase.from("hackathons").delete().eq("user_id", userId).like("name", "[Demo]%");
  await supabase.from("courses").delete().eq("user_id", userId).like("title", "[Demo]%");

  // Seed tasks
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
  
  await supabase.from("tasks").insert([
    { user_id: userId, title: "[Demo] Terminar landing page", due_date: today.toISOString().split("T")[0], status: "pendiente", category: "trabajo", priority: "alta" },
    { user_id: userId, title: "[Demo] Revisar feedback de usuarios", due_date: tomorrow.toISOString().split("T")[0], status: "pendiente", category: "trabajo", priority: "media" },
    { user_id: userId, title: "[Demo] Comprar vuelo a Madrid", due_date: nextWeek.toISOString().split("T")[0], status: "pendiente", category: "personal", priority: "media" },
    { user_id: userId, title: "[Demo] Correr 5km", due_date: today.toISOString().split("T")[0], status: "completada", category: "personal", priority: "baja", completed_at: new Date().toISOString() }
  ]);

  // Seed Hackathons
  await supabase.from("hackathons").insert([
    { user_id: userId, name: "[Demo] Hackathon AI Google", organizer: "Google", city: "Madrid", event_start_date: nextWeek.toISOString().split("T")[0], status: "inscripcion_abierta", priority: "alta" },
    { user_id: userId, name: "[Demo] IndieHackers Spain", organizer: "IndieHackers", city: "Online", registration_deadline: tomorrow.toISOString().split("T")[0], status: "pendiente", priority: "media" }
  ]);

  // Seed Courses
  await supabase.from("courses").insert([
    { user_id: userId, title: "[Demo] Advanced Next.js 15", platform: "Udemy", deadline: nextWeek.toISOString().split("T")[0], status: "empezado" }
  ]);

  return NextResponse.json({ success: true });
}
