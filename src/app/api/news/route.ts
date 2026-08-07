import { NextResponse } from "next/server";
import { filterItems, readAllItems, readSyncStatus } from "@/lib/news/store";
import { syncIfNeeded } from "@/lib/news/sync";
import type { NewsCategory } from "@/lib/sources/source-registry";
import type { NewsListFilters, NewsStatus } from "@/lib/news/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_CATEGORIES: NewsCategory[] = [
  "granada",
  "ia",
  "empresas_granada",
  "eventos_granada",
];
const VALID_STATUSES: NewsStatus[] = ["new", "read", "saved"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const auto = searchParams.get("auto");

  // Permite que el cliente lance una comprobación silenciosa al cargar el dashboard
  if (auto === "1") {
    syncIfNeeded(false).catch((e) =>
      console.warn("[news] auto sync failed:", (e as Error).message),
    );
  }

  const categoryParam = searchParams.get("category");
  const statusParam = searchParams.get("status");
  const filters: NewsListFilters = {
    category:
      categoryParam && VALID_CATEGORIES.includes(categoryParam as NewsCategory)
        ? (categoryParam as NewsCategory)
        : "all",
    status:
      statusParam && VALID_STATUSES.includes(statusParam as NewsStatus)
        ? (statusParam as NewsStatus)
        : "all",
    sourceId: searchParams.get("source") || undefined,
    search: searchParams.get("q") || undefined,
    sort: (searchParams.get("sort") as "date" | "score") || "date",
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  };

  const [allItems, status] = await Promise.all([
    readAllItems(),
    readSyncStatus(),
  ]);
  const items = filterItems(allItems, filters);
  const todayKey = new Date().toISOString().slice(0, 10);
  return NextResponse.json({
    items,
    status: {
      ...status,
      totalItems: allItems.length,
      newToday: allItems.filter((item) => item.fetchedAt.startsWith(todayKey)).length,
    },
  });
}
