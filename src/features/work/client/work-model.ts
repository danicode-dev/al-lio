import type { Company } from "@/components/store/types";
import type { JobApplication } from "@/lib/job-radar/types";
import type { VerifiedJob } from "@/lib/jobs/types";

/**
 * Framework-free state helpers for the Work feature: portal-search field
 * hydration, saved-search deduplication, the company and application filters,
 * and the verified-jobs payload normaliser (the "provider unavailable" state).
 * No React and no runtime module alias, so tests/unit/work/work-model.test.mjs
 * executes it directly. Portal URL construction stays pure in
 * `@/lib/deeplinks/job-search-urls`.
 */

export type SavedQuickSearchLike = { keyword: string; location?: string | null };

export type QuickSearchFields = { keyword: string; province: string; remote: boolean };

function normalizeLocation(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Turn a persisted quick search into the card's field values: a bare
 * "Teletrabajo" location becomes the remote switch, any other non-empty
 * location pre-selects the province, and the keyword is carried across.
 */
export function deriveQuickSearchFields(saved: SavedQuickSearchLike | undefined): QuickSearchFields {
  if (!saved) return { keyword: "", province: "", remote: false };
  const location = saved.location ?? "";
  if (normalizeLocation(location) === "teletrabajo") {
    return { keyword: saved.keyword, province: "", remote: true };
  }
  return { keyword: saved.keyword, province: location, remote: false };
}

export type QuickSearchRow = SavedQuickSearchLike & { platform: string };

/** The first saved search per platform wins; later rows for the same platform are ignored. */
export function firstQuickSearchPerPlatform<T extends QuickSearchRow>(rows: T[]): Record<string, T> {
  const map: Record<string, T> = {};
  for (const row of rows) {
    if (!map[row.platform]) map[row.platform] = row;
  }
  return map;
}

export type CompanyFilter = { search: string; favoritesOnly: boolean };

export function filterCompanies(companies: Company[], filter: CompanyFilter): Company[] {
  const needle = filter.search.trim().toLowerCase();
  return companies.filter((company) => {
    if (filter.favoritesOnly && !company.is_favorite) return false;
    if (!needle) return true;
    return `${company.nombre} ${company.categoria ?? ""}`.toLowerCase().includes(needle);
  });
}

export function filterApplicationsByStatus(applications: JobApplication[], status: string): JobApplication[] {
  return applications.filter((application) => !status || application.status === status);
}

/**
 * Normalise the /api/verified-jobs response into a safe shape. A missing,
 * disabled or malformed payload yields the disabled/empty state rather than a
 * render-time crash.
 */
export function normalizeVerifiedJobsPayload(payload: unknown): { enabled: boolean; jobs: VerifiedJob[] } {
  const record = (payload ?? {}) as { enabled?: unknown; jobs?: unknown };
  return {
    enabled: Boolean(record.enabled),
    jobs: Array.isArray(record.jobs) ? (record.jobs as VerifiedJob[]) : [],
  };
}
