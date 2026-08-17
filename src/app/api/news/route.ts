import { NextResponse } from "next/server";
import { tryGetCurrentUserId } from "@/lib/auth/current-user";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getRadarStatsForCycle, listRadarItemsForCycle } from "@/lib/db/repositories/radar";
import type { NewsListFilters, NewsStatus } from "@/lib/news/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_STATUSES: NewsStatus[] = ["new", "read", "saved"];
const VALID_SORTS: NonNullable<NewsListFilters["sort"]>[] = ["date", "trust"];

export async function GET(req: Request) {
  const userId = await tryGetCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profile = await getProfileByUser(userId);
  if (!profile?.cycle_code) {
    return NextResponse.json({ error: "complete your FP profile first" }, { status: 409 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const sortParam = searchParams.get("sort");
  const rawSearch = searchParams.get("q")?.trim() ?? "";
  const rawLimit = Number(searchParams.get("limit") ?? 100);
  const filters: NewsListFilters = {
    status:
      statusParam && VALID_STATUSES.includes(statusParam as NewsStatus)
        ? (statusParam as NewsStatus)
        : "all",
    sourceId: normalizeSimpleFilter(searchParams.get("source"), 120),
    search: rawSearch ? rawSearch.slice(0, 120) : undefined,
    sort: sortParam && VALID_SORTS.includes(sortParam as NonNullable<NewsListFilters["sort"]>)
      ? (sortParam as NonNullable<NewsListFilters["sort"]>)
      : "date",
    limit: Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 100,
  };

  const [items, status] = await Promise.all([
    listRadarItemsForCycle(userId, profile.cycle_code, filters),
    getRadarStatsForCycle(userId, profile.cycle_code),
  ]);
  return NextResponse.json({ items, status }, { headers: { "Cache-Control": "private, no-store" } });
}

function normalizeSimpleFilter(value: string | null, maxLength: number): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > maxLength || !/^[a-z0-9-]+$/i.test(normalized)) return undefined;
  return normalized;
}
