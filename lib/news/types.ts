import type { NewsCategory } from "@/lib/sources/source-registry";

export type NewsStatus = "new" | "read" | "saved";

export type NewsItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  category: NewsCategory;
  title: string;
  description?: string;
  url: string;
  publishedAt?: string;
  fetchedAt: string;
  tags: string[];
  relevanceScore: number;
  status: NewsStatus;
};

export type SourceSyncRecord = {
  sourceId: string;
  lastSyncAt: string;
  ok: boolean;
  itemsAdded: number;
  itemsUpdated: number;
  error?: string;
};

export type SyncStatus = {
  lastSyncAt: string | null;
  lastSyncOk: boolean;
  totalItems: number;
  newToday: number;
  sources: SourceSyncRecord[];
};

export type NewsListFilters = {
  category?: NewsCategory | "all";
  sourceId?: string;
  status?: NewsStatus | "all";
  search?: string;
  sort?: "date" | "score";
  limit?: number;
};
