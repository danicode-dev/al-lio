import "server-only";
import { redirect } from "next/navigation";
import { getValidatedSession } from "@/lib/auth/session";

export async function getCurrentUserId(): Promise<string> {
  const session = await getValidatedSession();
  if (!session) redirect("/login");
  return session.uid;
}

export async function tryGetCurrentUserId(): Promise<string | null> {
  const session = await getValidatedSession();
  return session?.uid ?? null;
}
