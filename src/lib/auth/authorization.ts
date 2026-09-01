import "server-only";

import { redirect } from "next/navigation";

import { getValidatedSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/db/repositories/users";

async function getCurrentUser() {
  const session = await getValidatedSession();
  if (!session) return null;
  return getUserById(session.uid);
}

export async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
