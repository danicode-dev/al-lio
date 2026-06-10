"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { asString } from "@/lib/utils";
import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  createTask as pgCreateTask,
  updateTaskStatus as pgUpdateTaskStatus,
  updateTask as pgUpdateTask,
  deleteTask as pgDeleteTask,
} from "@/lib/db/repositories/tasks";
import {
  createOpportunity as pgCreateOpportunity,
  updateOpportunityStatus as pgUpdateOpportunityStatus,
  deleteOpportunity as pgDeleteOpportunity,
} from "@/lib/db/repositories/opportunities";
import {
  createCourse as pgCreateCourse,
  updateCourseStatus as pgUpdateCourseStatus,
  deleteCourse as pgDeleteCourse,
} from "@/lib/db/repositories/courses";
import {
  createQuickLink as pgCreateQuickLink,
  deleteQuickLink as pgDeleteQuickLink,
} from "@/lib/db/repositories/quick_links";
import {
  createHackathon as pgCreateHackathon,
  updateHackathon as pgUpdateHackathon,
} from "@/lib/db/repositories/hackathons";
import { createReminder as pgCreateReminder } from "@/lib/db/repositories/reminders";
import { ensurePostgresUserForSupabaseUser } from "@/lib/auth/sync-postgres-user";

const requiredText = z.string().trim().min(1);

// ── Auth actions — still use Supabase Auth (migrated in Fase 6) ───────────────

export async function loginProfile(formData: FormData) {
  const email = requiredText.email().parse(formData.get("email"));
  const displayName = asString(formData.get("display_name")) ?? "Usuario";
  const supabase = await createClient();

  const passwords = [
    process.env.PROFILES_SHARED_PASSWORD,
    "muchosmantecados11",
    "d1os-panel-2026",
  ].filter(Boolean) as string[];

  for (const pwd of passwords) {
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (!error) {
      if (signInData.user) {
        await ensurePostgresUserForSupabaseUser({ id: signInData.user.id, email: signInData.user.email!, displayName });
      }
      redirect("/dashboard");
    }
  }

  const activePassword = process.env.PROFILES_SHARED_PASSWORD ?? "d1os-panel-2026";
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password: activePassword,
    options: { data: { display_name: displayName } },
  });

  if (signUpError) {
    redirect("/login?error=" + encodeURIComponent(signUpError.message));
  }

  if (data.user) {
    await ensurePostgresUserForSupabaseUser({ id: data.user.id, email: data.user.email!, displayName });
  }
  redirect("/dashboard");
}

export async function loginOrRegisterProfile(formData: FormData) {
  const email = requiredText.email().parse(formData.get("email"));
  const password = requiredText.parse(formData.get("password"));
  const displayName = asString(formData.get("display_name")) ?? "Usuario";
  const supabase = await createClient();

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (signUpError) {
      if (
        signUpError.message.includes("already registered") ||
        signUpError.message.toLowerCase().includes("user already exists")
      ) {
        redirect("/login?error=Contraseña%20incorrecta");
      }
      redirect("/login?error=" + encodeURIComponent(signUpError.message));
    }

    if (data.user) {
      await ensurePostgresUserForSupabaseUser({ id: data.user.id, email: data.user.email!, displayName });
    }
  } else if (signInData.user) {
    await ensurePostgresUserForSupabaseUser({ id: signInData.user.id, email: signInData.user.email!, displayName });
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = requiredText.email().parse(formData.get("email"));
  const password = z.string().min(6).parse(formData.get("password"));
  const displayName = asString(formData.get("display_name")) ?? "Dani";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) redirect("/register?error=No%20se%20pudo%20crear%20la%20cuenta");
  if (data.user) {
    await ensurePostgresUserForSupabaseUser({ id: data.user.id, email: data.user.email!, displayName });
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ── Data actions — PostgreSQL via repositories ────────────────────────────────

export async function createTask(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgCreateTask(userId, {
    title: requiredText.parse(formData.get("title")),
    description: asString(formData.get("description")),
    category: asString(formData.get("category")) ?? "personal",
    priority: asString(formData.get("priority")) ?? "media",
    status: asString(formData.get("status")) ?? "pendiente",
    due_date: asString(formData.get("due_date")),
    related_type: asString(formData.get("related_type")),
    related_id: asString(formData.get("related_id")),
  });
  revalidatePath("/tasks");
}

export async function updateTaskStatus(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgUpdateTaskStatus(
    userId,
    requiredText.parse(formData.get("id")),
    requiredText.parse(formData.get("status"))
  );
  revalidatePath("/tasks");
}

export async function postponeTaskTomorrow(formData: FormData) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const userId = await getCurrentUserId();
  await pgUpdateTask(userId, requiredText.parse(formData.get("id")), {
    status: "pospuesta",
    due_date: tomorrow.toISOString().slice(0, 10),
  });
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

export async function deleteTask(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgDeleteTask(userId, requiredText.parse(formData.get("id")));
  revalidatePath("/tasks");
}

export async function createOpportunity(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgCreateOpportunity(userId, {
    source: asString(formData.get("source")) ?? "manual",
    source_type: "manual",
    title: requiredText.parse(formData.get("title")),
    company: asString(formData.get("company")),
    location: asString(formData.get("location")),
    province: asString(formData.get("province")),
    remote: formData.get("remote") === "on",
    url: requiredText.url().parse(formData.get("url")),
    status: asString(formData.get("status")) ?? "guardada",
    notes: asString(formData.get("notes")),
  });
  revalidatePath("/work");
}

export async function updateOpportunityStatus(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgUpdateOpportunityStatus(
    userId,
    requiredText.parse(formData.get("id")),
    requiredText.parse(formData.get("status"))
  );
  revalidatePath("/work");
}

export async function deleteOpportunity(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgDeleteOpportunity(userId, requiredText.parse(formData.get("id")));
  revalidatePath("/work");
}

export async function createCourse(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgCreateCourse(userId, {
    title: requiredText.parse(formData.get("title")),
    platform: asString(formData.get("platform")),
    url: asString(formData.get("url")),
    category: asString(formData.get("category")),
    status: asString(formData.get("status")) ?? "pendiente",
    start_date: asString(formData.get("start_date")),
    deadline: asString(formData.get("deadline")),
    notes: asString(formData.get("notes")),
  });
  revalidatePath("/courses");
}

export async function updateCourseStatus(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgUpdateCourseStatus(
    userId,
    requiredText.parse(formData.get("id")),
    requiredText.parse(formData.get("status"))
  );
  revalidatePath("/courses");
}

export async function deleteCourse(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgDeleteCourse(userId, requiredText.parse(formData.get("id")));
  revalidatePath("/courses");
}

export async function createQuickLink(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgCreateQuickLink(userId, {
    name: requiredText.parse(formData.get("name")),
    url: requiredText.url().parse(formData.get("url")),
    category: asString(formData.get("category")),
    description: asString(formData.get("description")),
    is_favorite: formData.get("is_favorite") === "on",
  });
  revalidatePath("/links");
}

export async function deleteQuickLink(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgDeleteQuickLink(userId, requiredText.parse(formData.get("id")));
  revalidatePath("/links");
}

export async function createHackathon(formData: FormData) {
  const userId = await getCurrentUserId();
  await pgCreateHackathon(userId, {
    name: requiredText.parse(formData.get("name")),
    organizer: asString(formData.get("organizer")),
    province: requiredText.parse(formData.get("province")),
    city: asString(formData.get("city")),
    type: asString(formData.get("type")) ?? "hackathon",
    status: asString(formData.get("status")) ?? "revisar_futura_edicion",
    url: asString(formData.get("url")),
    notes: asString(formData.get("notes")),
    priority: asString(formData.get("priority")) ?? "media",
    next_review_at: asString(formData.get("next_review_at")),
  });
  revalidatePath("/hackathons");
}

export async function markHackathonReviewed(formData: FormData) {
  const userId = await getCurrentUserId();
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  await pgUpdateHackathon(userId, requiredText.parse(formData.get("id")), {
    last_reviewed_at: new Date().toISOString().slice(0, 10),
    next_review_at: next.toISOString().slice(0, 10),
  });
  revalidatePath("/hackathons");
}

export async function createTaskFromHackathon(formData: FormData) {
  const userId = await getCurrentUserId();
  const name = requiredText.parse(formData.get("name"));
  await pgCreateTask(userId, {
    title: `Revisar ${name}`,
    category: "hackathon",
    priority: asString(formData.get("priority")) ?? "media",
    due_date: asString(formData.get("next_review_at")),
    related_type: "hackathon",
    related_id: requiredText.parse(formData.get("id")),
  });
  revalidatePath("/tasks");
  revalidatePath("/hackathons");
}

export async function createReminderFromHackathon(formData: FormData) {
  const userId = await getCurrentUserId();
  const name = requiredText.parse(formData.get("name"));
  const remindAt =
    asString(formData.get("next_review_at")) ?? new Date().toISOString().slice(0, 10);
  await pgCreateReminder(userId, {
    title: `Recordar ${name}`,
    remind_at: `${remindAt}T09:00:00`,
    related_type: "hackathon",
    related_id: requiredText.parse(formData.get("id")),
  });
  revalidatePath("/calendar");
  revalidatePath("/hackathons");
}

// Deprecated: used Supabase RPC seed_hackathons_for_current_user (auth.uid()).
// Not available in PostgreSQL propio. Pending Fase 6.
export async function seedHackathons() {
  console.warn("[seedHackathons] RPC not available in PostgreSQL. Pending Fase 6.");
  revalidatePath("/hackathons");
}
