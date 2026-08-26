"use server";

import { redirect } from "next/navigation";
import { getValidatedSession } from "@/lib/auth/session";
import { toggleHackathonFavorite } from "@/lib/db/repositories/hackathons";

export async function toggleHackathonFavoriteAction(
  hackathonId: string
): Promise<{ error: string | null; isFavorite: boolean | null }> {
  const session = await getValidatedSession();
  if (!session) redirect("/login");

  try {
    const isFavorite = await toggleHackathonFavorite(session.uid, hackathonId);
    if (isFavorite === null) return { error: "hackathon_not_found", isFavorite: null };
    return { error: null, isFavorite };
  } catch {
    return { error: "favorite_save_failed", isFavorite: null };
  }
}
