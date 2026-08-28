import type { FpCycleCode } from "@/lib/db/types";

export type NewsStatus = "new" | "read" | "saved";
export type NewsTrustTier = "official" | "institutional" | "first_party" | "sector" | "reference";
export type NewsKind = "news" | "event" | "call" | "legal";

export type NewsItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  summaryShort?: string;
  summaryExpanded?: string;
  keyFacts: string[];
  whyRelevant?: string;
  description?: string;
  url: string;
  kind: NewsKind;
  publishedAt?: string;
  sourceUpdatedAt?: string;
  verifiedAt?: string;
  fetchedAt: string;
  expiresAt?: string;
  eventStartsAt?: string;
  eventEndsAt?: string;
  registrationUrl?: string;
  registrationDeadline?: string;
  locality?: string;
  province?: string;
  targetCycleCodes: FpCycleCode[];
  moduleCodes: string[];
  topics: string[];
  language?: "es";
  matchReasons: string[];
  rankingPriority?: number;
  revision?: number;
  materialFingerprint?: string;
  primaryEvidenceUrl?: string;
  trustTier: NewsTrustTier;
  status: NewsStatus;
  isFeatured: boolean;
};

export type NewsSyncStatus = {
  cycleCode: FpCycleCode;
  totalItems: number;
  todayItems: number;
  newItems: number;
  savedItems: number;
  lastReceivedAt: string | null;
};

export type NewsListFilters = {
  sourceId?: string;
  status?: NewsStatus | "all";
  search?: string;
  sort?: "date" | "trust";
  limit?: number;
};
