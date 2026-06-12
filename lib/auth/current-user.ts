import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export async function getCurrentUserId(): Promise<string> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.uid;
}

export async function tryGetCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.uid ?? null;
}
