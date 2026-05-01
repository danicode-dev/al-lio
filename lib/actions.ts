"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { asString } from "@/lib/utils";

const requiredText = z.string().trim().min(1);

async function currentUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export async function loginProfile(formData: FormData) {
  const email = requiredText.email().parse(formData.get("email"));
  const displayName = asString(formData.get("display_name")) ?? "Usuario";
  const supabase = await createClient();

  // Contraseñas a probar: env var → legacy → default nueva
  const passwords = [
    process.env.PROFILES_SHARED_PASSWORD,
    "muchosmantecados11",
    "d1os-panel-2026",
  ].filter(Boolean) as string[];

  // 1. Intentar login con cada contraseña conocida
  for (const pwd of passwords) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (!error) redirect("/dashboard");
  }

  // 2. No existe aún → crear cuenta con la contraseña activa
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
    await supabase.from("profiles").upsert({
      user_id: data.user.id,
      display_name: displayName,
      full_name: displayName,
      target_role: "Usuario D1OS",
      main_location: "Granada",
    });
  }
  redirect("/dashboard");
}

export async function loginOrRegisterProfile(formData: FormData) {
  const email = requiredText.email().parse(formData.get("email"));
  const password = requiredText.parse(formData.get("password"));
  const displayName = asString(formData.get("display_name")) ?? "Usuario";
  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  
  if (signInError) {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered") || signUpError.message.toLowerCase().includes("user already exists")) {
        redirect("/login?error=Contraseña%20incorrecta");
      }
      redirect("/login?error=" + encodeURIComponent(signUpError.message));
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        user_id: data.user.id,
        display_name: displayName,
        full_name: displayName,
        target_role: "Usuario D1OS",
        main_location: "Granada",
      });
    }
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
    await supabase.from("profiles").upsert({
      user_id: data.user.id,
      display_name: displayName,
      full_name: displayName,
      target_role: "Desarrollador Web Junior",
      main_location: "Granada",
    });
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createTask(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  await supabase.from("tasks").insert({
    user_id: userId,
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
  const { supabase, userId } = await currentUserId();
  await supabase
    .from("tasks")
    .update({ status: requiredText.parse(formData.get("status")) })
    .eq("id", requiredText.parse(formData.get("id")))
    .eq("user_id", userId);
  revalidatePath("/tasks");
}

export async function postponeTaskTomorrow(formData: FormData) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const { supabase, userId } = await currentUserId();
  await supabase
    .from("tasks")
    .update({ status: "pospuesta", due_date: tomorrow.toISOString().slice(0, 10) })
    .eq("id", requiredText.parse(formData.get("id")))
    .eq("user_id", userId);
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

export async function deleteTask(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  await supabase.from("tasks").delete().eq("id", requiredText.parse(formData.get("id"))).eq("user_id", userId);
  revalidatePath("/tasks");
}

export async function createOpportunity(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  await supabase.from("opportunities").insert({
    user_id: userId,
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
  const { supabase, userId } = await currentUserId();
  await supabase
    .from("opportunities")
    .update({ status: requiredText.parse(formData.get("status")) })
    .eq("id", requiredText.parse(formData.get("id")))
    .eq("user_id", userId);
  revalidatePath("/work");
}

export async function deleteOpportunity(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  await supabase.from("opportunities").delete().eq("id", requiredText.parse(formData.get("id"))).eq("user_id", userId);
  revalidatePath("/work");
}

export async function createCourse(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  await supabase.from("courses").insert({
    user_id: userId,
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
  const { supabase, userId } = await currentUserId();
  await supabase
    .from("courses")
    .update({ status: requiredText.parse(formData.get("status")) })
    .eq("id", requiredText.parse(formData.get("id")))
    .eq("user_id", userId);
  revalidatePath("/courses");
}

export async function deleteCourse(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  await supabase.from("courses").delete().eq("id", requiredText.parse(formData.get("id"))).eq("user_id", userId);
  revalidatePath("/courses");
}

export async function createQuickLink(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  await supabase.from("quick_links").insert({
    user_id: userId,
    name: requiredText.parse(formData.get("name")),
    url: requiredText.url().parse(formData.get("url")),
    category: asString(formData.get("category")),
    description: asString(formData.get("description")),
    is_favorite: formData.get("is_favorite") === "on",
  });
  revalidatePath("/links");
}

export async function deleteQuickLink(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  await supabase.from("quick_links").delete().eq("id", requiredText.parse(formData.get("id"))).eq("user_id", userId);
  revalidatePath("/links");
}

export async function createHackathon(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  await supabase.from("hackathons").insert({
    user_id: userId,
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
  const { supabase, userId } = await currentUserId();
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  await supabase
    .from("hackathons")
    .update({ last_reviewed_at: new Date().toISOString().slice(0, 10), next_review_at: next.toISOString().slice(0, 10) })
    .eq("id", requiredText.parse(formData.get("id")))
    .eq("user_id", userId);
  revalidatePath("/hackathons");
}

export async function createTaskFromHackathon(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  const name = requiredText.parse(formData.get("name"));
  await supabase.from("tasks").insert({
    user_id: userId,
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
  const { supabase, userId } = await currentUserId();
  const name = requiredText.parse(formData.get("name"));
  const remindAt = asString(formData.get("next_review_at")) ?? new Date().toISOString().slice(0, 10);
  await supabase.from("reminders").insert({
    user_id: userId,
    title: `Recordar ${name}`,
    remind_at: `${remindAt}T09:00:00`,
    related_type: "hackathon",
    related_id: requiredText.parse(formData.get("id")),
  });
  revalidatePath("/calendar");
  revalidatePath("/hackathons");
}

export async function seedHackathons() {
  const { supabase } = await currentUserId();
  await supabase.rpc("seed_hackathons_for_current_user");
  revalidatePath("/hackathons");
}
