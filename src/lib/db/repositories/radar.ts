import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db/pool";
import type { RadarCycleCode, RadarDelivery, RadarDeliveryItem } from "@/lib/radar/contract";
import type { NewsItem, NewsListFilters, NewsStatus, NewsSyncStatus } from "@/lib/news/types";

type DeliveryInsertResult = { duplicate: boolean; itemCount: number };

type RadarItemRow = {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  summary: string;
  canonical_url: string;
  kind: NewsItem["kind"];
  published_at: string | null;
  fetched_at: string;
  expires_at: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  registration_url: string | null;
  registration_deadline: string | null;
  locality: string | null;
  province: string | null;
  target_cycle_codes: RadarCycleCode[];
  module_codes: string[];
  topics: string[];
  trust_tier: NewsItem["trustTier"];
  status: NewsStatus;
};

type RadarStatsRow = {
  total_items: string;
  new_items: string;
  saved_items: string;
  last_received_at: string | null;
};

export async function ingestRadarDelivery(delivery: RadarDelivery, rawBody: string): Promise<DeliveryInsertResult> {
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");

  return withTransaction(async (client) => {
    const existing = await client.query<{ payload_hash: string; item_count: number }>(
      `SELECT payload_hash, item_count FROM public.radar_deliveries WHERE delivery_id = $1 FOR UPDATE`,
      [delivery.deliveryId],
    );
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.payload_hash !== payloadHash || row.item_count !== delivery.items.length) {
        throw new RadarDeliveryConflictError();
      }
      return { duplicate: true, itemCount: row.item_count };
    }

    await client.query(
      `INSERT INTO public.radar_deliveries (delivery_id, schema_version, payload_hash, item_count)
       VALUES ($1, $2, $3, $4)`,
      [delivery.deliveryId, delivery.schemaVersion, payloadHash, delivery.items.length],
    );

    for (const item of delivery.items) {
      const radarItemId = await upsertRadarItem(client, item);
      await client.query(
        `INSERT INTO public.radar_delivery_items (delivery_id, radar_item_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [delivery.deliveryId, radarItemId],
      );
    }

    return { duplicate: false, itemCount: delivery.items.length };
  });
}

async function upsertRadarItem(client: PoolClient, item: RadarDeliveryItem): Promise<string> {
  const values = [
    item.schemaVersion, item.sourceId, item.sourceName, item.externalId, item.canonicalUrl,
    item.title, item.summary, item.publishedAt, item.fetchedAt, item.expiresAt,
    item.eventStartsAt, item.eventEndsAt, item.registrationUrl, item.registrationDeadline,
    item.kind, item.locality, item.province, item.targetCycleCodes, item.moduleCodes,
    item.topics, item.matchedRuleIds, item.matchedKeywords, item.trustTier, item.reviewStatus,
    item.reviewedBy, item.reviewedAt, item.reviewReason, item.sourceUrl, item.contentHash,
  ];
  const result = await client.query<{ id: string }>(
    `INSERT INTO public.radar_items (
       schema_version, source_id, source_name, external_id, canonical_url, title, summary,
       published_at, fetched_at, expires_at, event_starts_at, event_ends_at, registration_url,
       registration_deadline, kind, locality, province, target_cycle_codes, module_codes,
       topics, matched_rule_ids, matched_keywords, trust_tier, review_status, reviewed_by,
       reviewed_at, review_reason, source_url, content_hash
     ) VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")})
     ON CONFLICT (source_id, canonical_url) DO UPDATE SET
       source_name = excluded.source_name,
       external_id = excluded.external_id,
       title = excluded.title,
       summary = excluded.summary,
       published_at = excluded.published_at,
       fetched_at = excluded.fetched_at,
       expires_at = excluded.expires_at,
       event_starts_at = excluded.event_starts_at,
       event_ends_at = excluded.event_ends_at,
       registration_url = excluded.registration_url,
       registration_deadline = excluded.registration_deadline,
       kind = excluded.kind,
       locality = excluded.locality,
       province = excluded.province,
       target_cycle_codes = excluded.target_cycle_codes,
       module_codes = excluded.module_codes,
       topics = excluded.topics,
       matched_rule_ids = excluded.matched_rule_ids,
       matched_keywords = excluded.matched_keywords,
       trust_tier = excluded.trust_tier,
       review_status = excluded.review_status,
       reviewed_by = excluded.reviewed_by,
       reviewed_at = excluded.reviewed_at,
       review_reason = excluded.review_reason,
       source_url = excluded.source_url,
       content_hash = excluded.content_hash
     WHERE excluded.fetched_at >= public.radar_items.fetched_at
     RETURNING id::text`,
    values,
  );
  if (result.rows[0]) return result.rows[0].id;

  const existing = await client.query<{ id: string }>(
    `SELECT id::text FROM public.radar_items WHERE source_id = $1 AND canonical_url = $2`,
    [item.sourceId, item.canonicalUrl],
  );
  if (!existing.rows[0]) throw new Error("Radar item upsert did not return an id");
  return existing.rows[0].id;
}

export async function listRadarItemsForCycle(
  userId: string,
  cycleCode: RadarCycleCode,
  filters: NewsListFilters = {},
): Promise<NewsItem[]> {
  const values: unknown[] = [userId, cycleCode];
  const conditions = [
    `$2 = ANY(item.target_cycle_codes)`,
    `(item.expires_at IS NULL OR item.expires_at > now())`,
  ];

  if (filters.sourceId) {
    values.push(filters.sourceId);
    conditions.push(`item.source_id = $${values.length}`);
  }
  if (filters.status && filters.status !== "all") {
    values.push(filters.status);
    conditions.push(`COALESCE(state.status, 'new') = $${values.length}`);
  }
  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(item.title ILIKE $${values.length} OR item.summary ILIKE $${values.length})`);
  }
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 200);
  values.push(limit);

  const result = await query<RadarItemRow>(
    `SELECT item.id::text, item.source_id, item.source_name, item.title, item.summary,
            item.canonical_url, item.kind, item.published_at, item.fetched_at, item.expires_at,
            item.event_starts_at, item.event_ends_at, item.registration_url,
            item.registration_deadline, item.locality, item.province, item.target_cycle_codes,
            item.module_codes, item.topics, item.trust_tier,
            COALESCE(state.status, 'new')::text AS status
     FROM public.radar_items item
     LEFT JOIN public.radar_item_user_states state
       ON state.radar_item_id = item.id AND state.user_id = $1
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${filters.sort === "trust" ? trustOrderSql() : "COALESCE(item.published_at, item.fetched_at) DESC"}
     LIMIT $${values.length}`,
    values,
  );
  return result.rows.map(mapRadarItem);
}

export async function getRadarStatsForCycle(userId: string, cycleCode: RadarCycleCode): Promise<NewsSyncStatus> {
  const result = await query<RadarStatsRow>(
    `SELECT
       count(*)::text AS total_items,
       count(*) FILTER (WHERE state.status IS NULL)::text AS new_items,
       count(*) FILTER (WHERE state.status = 'saved')::text AS saved_items,
       (SELECT max(received_at)::text FROM public.radar_deliveries) AS last_received_at
     FROM public.radar_items item
     LEFT JOIN public.radar_item_user_states state
       ON state.radar_item_id = item.id AND state.user_id = $1
     WHERE $2 = ANY(item.target_cycle_codes)
       AND (item.expires_at IS NULL OR item.expires_at > now())`,
    [userId, cycleCode],
  );
  const row = result.rows[0];
  return {
    cycleCode,
    totalItems: Number(row?.total_items ?? 0),
    newItems: Number(row?.new_items ?? 0),
    savedItems: Number(row?.saved_items ?? 0),
    lastReceivedAt: row?.last_received_at ?? null,
  };
}

export async function setRadarItemStatus(
  userId: string,
  cycleCode: RadarCycleCode,
  itemId: string,
  status: Exclude<NewsStatus, "new">,
): Promise<boolean> {
  const result = await query(
    `INSERT INTO public.radar_item_user_states (user_id, radar_item_id, status)
     SELECT $1, item.id, $4
     FROM public.radar_items item
     WHERE item.id = $2::bigint
       AND $3 = ANY(item.target_cycle_codes)
       AND (item.expires_at IS NULL OR item.expires_at > now())
     ON CONFLICT (user_id, radar_item_id) DO UPDATE SET status = excluded.status
     RETURNING radar_item_id`,
    [userId, itemId, cycleCode, status],
  );
  return Boolean(result.rowCount);
}

function mapRadarItem(row: RadarItemRow): NewsItem {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceName: row.source_name,
    title: row.title,
    description: row.summary || undefined,
    url: row.canonical_url,
    kind: row.kind,
    publishedAt: row.published_at ?? undefined,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at ?? undefined,
    eventStartsAt: row.event_starts_at ?? undefined,
    eventEndsAt: row.event_ends_at ?? undefined,
    registrationUrl: row.registration_url ?? undefined,
    registrationDeadline: row.registration_deadline ?? undefined,
    locality: row.locality ?? undefined,
    province: row.province ?? undefined,
    targetCycleCodes: row.target_cycle_codes,
    moduleCodes: row.module_codes,
    topics: row.topics,
    trustTier: row.trust_tier,
    status: row.status,
  };
}

function trustOrderSql(): string {
  return `CASE item.trust_tier
    WHEN 'official' THEN 5 WHEN 'institutional' THEN 4 WHEN 'first_party' THEN 3
    WHEN 'sector' THEN 2 ELSE 1 END DESC, COALESCE(item.published_at, item.fetched_at) DESC`;
}

export class RadarDeliveryConflictError extends Error {
  constructor() {
    super("delivery id already exists with different payload");
    this.name = "RadarDeliveryConflictError";
  }
}
