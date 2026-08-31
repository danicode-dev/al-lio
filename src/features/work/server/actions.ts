"use server";

import { z } from "zod";

import { getValidatedSession } from "@/lib/auth/session";
import { buildJobSearchUrl, jobPlatforms } from "@/lib/deeplinks/job-search-urls";
import {
  getQuickSearchesByUser,
  replaceQuickSearch,
  toggleCompanyFavorite,
} from "@/features/work/server/repository";

export type SavedQuickSearch = { platform: string; keyword: string; location: string | null };

const companyIdSchema = z.string().uuid();
const quickSearchSchema = z.object({
  platform: z.enum(jobPlatforms),
  keyword: z.string().trim().min(1).max(160),
  location: z.string().trim().max(160),
}).strict();

export async function toggleCompanyFavoriteAction(
  input: unknown,
): Promise<{ error: string | null; isFavorite: boolean | null }> {
  const parsed = companyIdSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input", isFavorite: null };
  const session = await getValidatedSession();
  if (!session) return { error: "not_authenticated", isFavorite: null };
  try {
    return { error: null, isFavorite: await toggleCompanyFavorite(session.uid, parsed.data) };
  } catch {
    return { error: "favorite_save_failed", isFavorite: null };
  }
}

export async function getQuickSearchesAction(): Promise<SavedQuickSearch[]> {
  const session = await getValidatedSession();
  if (!session) return [];
  try {
    return (await getQuickSearchesByUser(session.uid))
      .filter((row) => row.category === "work")
      .map((row) => ({ platform: row.platform, keyword: row.keyword, location: row.location }));
  } catch {
    return [];
  }
}

export async function saveQuickSearchAction(
  platform: unknown,
  keyword: unknown,
  location: unknown,
): Promise<{ error: string | null }> {
  const parsed = quickSearchSchema.safeParse({ platform, keyword, location });
  if (!parsed.success) return { error: "invalid_input" };
  const session = await getValidatedSession();
  if (!session) return { error: "not_authenticated" };
  try {
    const data = parsed.data;
    await replaceQuickSearch(session.uid, {
      title: `${data.keyword} - ${data.location || "España"}`,
      platform: data.platform,
      keyword: data.keyword,
      location: data.location || null,
      generated_url: buildJobSearchUrl(data.platform, data.keyword, data.location),
    });
    return { error: null };
  } catch {
    return { error: "save_failed" };
  }
}
