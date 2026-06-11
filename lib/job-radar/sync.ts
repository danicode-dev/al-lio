import { RADAR_COMPANIES } from "./companies";
import { scrapeCompany } from "./scraper";
import { upsertScrapedJob } from "./store";

const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const lastSyncMap = new Map<string, number>();

export async function syncJobRadar(userId: string): Promise<{
  checked: number;
  inserted: number;
  errors: number;
  skipped: boolean;
}> {
  const now = Date.now();
  const last = lastSyncMap.get(userId) ?? 0;

  if (now - last < MIN_INTERVAL_MS) {
    return { checked: 0, inserted: 0, errors: 0, skipped: true };
  }

  lastSyncMap.set(userId, now);

  let inserted = 0;
  let errors = 0;

  const results = await Promise.allSettled(
    RADAR_COMPANIES.map((company) => scrapeCompany(company)),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      errors++;
      continue;
    }
    for (const job of result.value) {
      try {
        const { inserted: wasNew } = await upsertScrapedJob(userId, job);
        if (wasNew) inserted++;
      } catch {
        errors++;
      }
    }
  }

  return { checked: RADAR_COMPANIES.length, inserted, errors, skipped: false };
}
