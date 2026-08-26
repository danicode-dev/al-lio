"use server";

import { getValidatedSession } from "@/lib/auth/session";
import { createQuickSearch, deleteQuickSearch, getQuickSearchesByUser } from "@/lib/db/repositories/quick_searches";
import { buildJobSearchUrl } from "@/lib/deeplinks/job-search-urls";

export type SavedQuickSearch = { platform: string; keyword: string; location: string | null };

// Best-effort background reads/writes behind the quick-search cards (issue
// #123) - unlike the favorite-toggle actions, these never send an
// unauthenticated caller to the login screen, since they run from a
// useEffect/onClick, not a form submission.
export async function getQuickSearchesAction(): Promise<SavedQuickSearch[]> {
  const session = await getValidatedSession();
  if (!session) return [];

  try {
    const rows = await getQuickSearchesByUser(session.uid);
    return rows
      .filter((row) => row.category === "work")
      .map((row) => ({ platform: row.platform, keyword: row.keyword, location: row.location }));
  } catch {
    return [];
  }
}

export async function saveQuickSearchAction(
  platform: string,
  keyword: string,
  location: string
): Promise<{ error: string | null }> {
  const session = await getValidatedSession();
  if (!session) return { error: "not_authenticated" };

  const cleanKeyword = keyword.trim();
  if (!cleanKeyword) return { error: "empty_keyword" };

  try {
    // createQuickSearch has no upsert - keep exactly one row per (user,
    // platform, category) by clearing out any prior search for this
    // platform before inserting the new one.
    const existing = await getQuickSearchesByUser(session.uid);
    const stale = existing.filter((row) => row.platform === platform && row.category === "work");
    await Promise.all(stale.map((row) => deleteQuickSearch(session.uid, row.id)));

    const cleanLocation = location.trim();
    await createQuickSearch(session.uid, {
      title: `${cleanKeyword} - ${cleanLocation || "España"}`,
      platform,
      keyword: cleanKeyword,
      location: cleanLocation || null,
      generated_url: buildJobSearchUrl(platform, cleanKeyword, cleanLocation),
      // createQuickSearch's own `?? null` fallback overrides the column's
      // SQL default when this is omitted, so it must be passed explicitly.
      category: "work",
      is_favorite: false,
    });
    return { error: null };
  } catch {
    return { error: "save_failed" };
  }
}
