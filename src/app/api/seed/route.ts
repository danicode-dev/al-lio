// COMPAT-REGISTER: nonprod-seed-endpoint (docs/architecture/COMPATIBILITY_REGISTER.md)
//
// Non-production demo-data endpoint. Returns 404 when NODE_ENV === "production"
// and otherwise requires an authenticated user. Classified as a removal
// candidate (owner confirmation required) by issue #357: no in-repo caller was
// found. Removal is tracked in a follow-up issue; nothing is deleted here.
import { NextResponse } from "next/server";
import { tryGetCurrentUserId } from "@/lib/auth/current-user";
import { deleteTasksByUserLike, createTask } from "@/features/tasks/server/repository";
import { deleteHackathonsByUserLike, createHackathon } from "@/features/events/server/repository";
import { deleteCoursesByUserLike, createCourse } from "@/features/courses/server/repository";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Seed endpoint disabled in production" }, { status: 404 });
  }

  const userId = await tryGetCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "No user found" }, { status: 401 });
  }

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
