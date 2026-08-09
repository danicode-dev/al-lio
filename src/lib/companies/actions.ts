"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { toggleCompanyFavorite } from "@/lib/db/repositories/companies";

export async function toggleCompanyFavoriteAction(
  companyId: string
): Promise<{ error: string | null; isFavorite: boolean | null }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const isFavorite = await toggleCompanyFavorite(session.uid, companyId);
    return { error: null, isFavorite };
  } catch {
    return { error: "favorite_save_failed", isFavorite: null };
  }
}
