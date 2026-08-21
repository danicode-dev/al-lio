import "server-only";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/db/repositories/users";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return getUserById(session.uid);
}

export async function isCurrentUserAdmin() {
  return (await getCurrentUser())?.role === "admin";
}

export async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
