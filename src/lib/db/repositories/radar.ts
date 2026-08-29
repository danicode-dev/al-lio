import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db/pool";
import {
  RADAR_V4_SCHEMA_VERSION,
  type RadarCycleCode,
  type RadarDelivery,
  type RadarDeliveryItem,
} from "@/lib/radar/contract";
import {
  ingestRadarV4Delivery,
  RadarV4IdentityConflictError,
  RadarV4RevisionConflictError,
} from "@/lib/db/repositories/radar-v4";
import type { NewsItem, NewsListFilters, NewsStatus, NewsSyncStatus } from "@/lib/news/types";

type DeliveryInsertResult = {
  duplicate: boolean;
  itemCount: number;
  projectedItemCount: number;
  conflictCount: number;
};

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
  summary_short: string | null;
  summary_expanded: string | null;
  key_facts: string[] | null;
  why_relevant: string | null;
  source_updated_at: string | null;
  source_verified_at: string | null;
  ranking_priority: number | null;
  current_revision: number | null;
  material_fingerprint: string | null;
  primary_evidence_url: string | null;
  language: "es" | null;
  match_reasons: string[] | null;
};

type RadarStatsRow = {
  total_items: string;
  today_items: string;
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
      await insertRadarIngestEvent(client, {
        deliveryId: delivery.deliveryId,
        schemaVersion: delivery.schemaVersion,
        outcome: "duplicate",
        payloadHash,
        itemCount: row.item_count,
      });
      return { duplicate: true, itemCount: row.item_count, projectedItemCount: 0, conflictCount: 0 };
    }

    await client.query(
      `INSERT INTO public.radar_deliveries (delivery_id, schema_version, payload_hash, item_count)
       VALUES ($1, $2, $3, $4)`,
      [delivery.deliveryId, delivery.schemaVersion, payloadHash, delivery.items.length],
    );

    let projectedItemCount = 0;
    let conflictCount = 0;
    if (delivery.schemaVersion === RADAR_V4_SCHEMA_VERSION) {
      try {
        const result = await ingestRadarV4Delivery(client, delivery);
        projectedItemCount = result.projectedItemCount;
        conflictCount = result.conflictCount;
      } catch (error) {
        if (error instanceof RadarV4RevisionConflictError || error instanceof RadarV4IdentityConflictError) {
          throw new RadarDeliveryConflictError(error.message);
        }
        throw error;
      }
    } else {
      for (const item of delivery.items) {
        const radarItemId = await upsertRadarItem(client, item);
        if (item.destination !== "news") await upsertRadarCatalogItem(client, item);
        await client.query(
          `INSERT INTO public.radar_delivery_items (delivery_id, radar_item_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [delivery.deliveryId, radarItemId],
        );
      }
      projectedItemCount = delivery.items.length;
    }

    await insertRadarIngestEvent(client, {
      deliveryId: delivery.deliveryId,
      schemaVersion: delivery.schemaVersion,
      outcome: conflictCount > 0 ? "conflict" : "accepted",
      payloadHash,
      itemCount: delivery.items.length,
    });
    return { duplicate: false, itemCount: delivery.items.length, projectedItemCount, conflictCount };
  });
}

export async function recordRadarIngestRejection(input: {
  deliveryId: string;
  schemaVersion: number;
  rawBody: string;
  reasonCode: string;
}): Promise<void> {
  const payloadHash = createHash("sha256").update(input.rawBody).digest("hex");
  await query(
    `INSERT INTO public.radar_ingest_events (
       delivery_id, schema_version, outcome, reason_code, payload_hash
     ) VALUES ($1, $2, 'rejected', $3, $4)`,
    [input.deliveryId, input.schemaVersion, input.reasonCode, payloadHash],
  );
}

async function insertRadarIngestEvent(
  client: PoolClient,
  input: {
    deliveryId: string;
    schemaVersion: number;
    outcome: "accepted" | "duplicate" | "conflict";
    payloadHash: string;
    itemCount: number;
  },
) {
  await client.query(
    `INSERT INTO public.radar_ingest_events (
       delivery_id, schema_version, outcome, payload_hash, item_count
     ) VALUES ($1, $2, $3, $4, $5)`,
    [input.deliveryId, input.schemaVersion, input.outcome, input.payloadHash, input.itemCount],
  );
}

async function upsertRadarItem(client: PoolClient, item: RadarDeliveryItem): Promise<string> {
  const values = [
    item.schemaVersion, item.sourceId, item.sourceName, item.externalId, item.canonicalUrl,
    item.title, item.summary, item.publishedAt, item.fetchedAt, item.expiresAt,
    item.eventStartsAt, item.eventEndsAt, item.registrationUrl, item.registrationDeadline,
    item.kind, item.locality, item.province, item.targetCycleCodes, item.moduleCodes,
    item.topics, item.matchedRuleIds, item.matchedKeywords, item.trustTier, item.reviewStatus,
    item.reviewedBy, item.reviewedAt, item.reviewReason, item.sourceUrl, item.contentHash,
    item.destination, item.semanticKey,
  ];
  const result = await client.query<{ id: string }>(
    `INSERT INTO public.radar_items (
       schema_version, source_id, source_name, external_id, canonical_url, title, summary,
       published_at, fetched_at, expires_at, event_starts_at, event_ends_at, registration_url,
       registration_deadline, kind, locality, province, target_cycle_codes, module_codes,
       topics, matched_rule_ids, matched_keywords, trust_tier, review_status, reviewed_by,
       reviewed_at, review_reason, source_url, content_hash, destination, semantic_key
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
       content_hash = excluded.content_hash,
       destination = excluded.destination,
       semantic_key = excluded.semantic_key
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

async function upsertRadarCatalogItem(client: PoolClient, item: RadarDeliveryItem): Promise<void> {
  const contentType = item.destination === "course"
    ? "curso_complementario"
    : /\bhackathons?\b/i.test(item.title)
      ? "hackathon"
      : /\b(retos?|challenges?|concursos?|competici[oó]n(?:es)?)\b/i.test(item.title)
        ? "reto"
        : "evento";
  const relevantDate = item.registrationDeadline ?? item.eventStartsAt ?? item.eventEndsAt;
  const status = item.destination === "course" ? "activo" : relevantDate && Date.parse(relevantDate) >= Date.now() ? "abierto" : "revisar";
  const contentResult = await client.query<{ id: string }>(
    `INSERT INTO public.fp_content_items (
       id_slug, type, title, description, entity, location, province, start_date, end_date,
       status, source_url, tags, suggested_action, last_reviewed_at, notes, source_year,
       radar_semantic_key
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz::date, $9::timestamptz::date,
       $10, $11, $12, $13, $14::timestamptz::date, $15, $16, $17)
     ON CONFLICT (radar_semantic_key) WHERE radar_semantic_key IS NOT NULL DO UPDATE SET
       type = excluded.type, title = excluded.title, description = excluded.description,
       entity = excluded.entity, location = excluded.location, province = excluded.province,
       start_date = excluded.start_date, end_date = excluded.end_date, status = excluded.status,
       source_url = excluded.source_url, tags = excluded.tags,
       suggested_action = excluded.suggested_action, last_reviewed_at = excluded.last_reviewed_at,
       notes = excluded.notes, source_year = excluded.source_year, updated_at = now()
     RETURNING id::text`,
    [
      `radar-${item.destination}-${item.semanticKey.slice(0, 32)}`,
      contentType,
      item.title,
      item.summary,
      item.sourceName,
      item.locality,
      item.province,
      item.eventStartsAt,
      item.eventEndsAt ?? item.registrationDeadline,
      status,
      item.canonicalUrl,
      [...new Set([...item.topics, ...item.moduleCodes])],
      item.destination === "course" ? "Revisar la formación y guardar si encaja con tu objetivo." : "Revisar requisitos y fechas antes de participar.",
      item.reviewedAt,
      `Fuente validada por Radar. ${item.reviewReason}`,
      String(new Date(item.publishedAt ?? item.fetchedAt).getUTCFullYear()),
      item.semanticKey,
    ],
  );
  const contentId = contentResult.rows[0]?.id;
  if (!contentId) throw new Error("Radar catalogue upsert did not return an id");

  for (const cycleCode of item.targetCycleCodes) {
    await client.query(
      `INSERT INTO public.fp_content_cycle_fit (
         content_item_id, cycle_code, cycle_group, priority, fit_score, audience_year
       ) VALUES ($1, $2, $3, $4, $5, NULL)
       ON CONFLICT (content_item_id, cycle_code) DO UPDATE SET
         cycle_group = excluded.cycle_group, priority = excluded.priority,
         fit_score = excluded.fit_score, updated_at = now()`,
      [
        contentId,
        cycleCode,
        cycleCode === "DAW" || cycleCode === "DAM" ? "DEV" : cycleCode,
        item.trustTier === "official" || item.trustTier === "first_party" ? "Alta" : "Media",
        item.trustTier === "official" || item.trustTier === "first_party" ? 5 : 4,
      ],
    );
  }
}

export async function listRadarItemsForCycle(
  userId: string,
  cycleCode: RadarCycleCode,
  filters: NewsListFilters = {},
): Promise<NewsItem[]> {
  const values: unknown[] = [userId, cycleCode];
  const isSavedArchive = filters.status === "saved";
  const conditions = [
    `$2 = ANY(item.target_cycle_codes)`,
    `item.destination = 'news'`,
    `item.kind IN ('news', 'legal')`,
    `item.review_status = 'approved'`,
  ];

  if (isSavedArchive) {
    conditions.push(`state.status = 'saved'`);
  } else {
    conditions.push(`(item.expires_at IS NULL OR item.expires_at > now())`);
    conditions.push(`(
      (item.kind = 'news' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '7 days')
      OR (item.kind = 'legal' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '30 days')
    )`);
  }

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
    conditions.push(`(item.title ILIKE $${values.length} OR item.summary ILIKE $${values.length} OR canonical.summary_expanded ILIKE $${values.length})`);
  }
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 200);
  values.push(limit);

  const result = await query<RadarItemRow>(
    `SELECT item.id::text, item.source_id, item.source_name, item.title, item.summary,
            item.canonical_url, item.kind, item.published_at, item.fetched_at, item.expires_at,
            item.event_starts_at, item.event_ends_at, item.registration_url,
            item.registration_deadline, item.locality, item.province, item.target_cycle_codes,
            item.module_codes, item.topics, item.trust_tier,
            COALESCE(canonical.summary_short, item.summary) AS summary_short,
            canonical.summary_expanded, canonical.key_facts, canonical.why_relevant,
            canonical.source_updated_at, canonical.source_verified_at,
            canonical.ranking_priority, canonical.current_revision,
            canonical.material_fingerprint, canonical.primary_evidence_url,
            canonical.language, canonical.match_reasons,
            COALESCE(state.status, 'new')::text AS status
     FROM public.radar_items item
     LEFT JOIN public.radar_content_occurrences canonical
       ON canonical.legacy_radar_item_id = item.id
      AND canonical.publication_decision = 'accepted'
     LEFT JOIN public.radar_item_user_states state
       ON state.radar_item_id = item.id AND state.user_id = $1
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${filters.sort === "trust" ? trustOrderSql() : "COALESCE(canonical.ranking_priority, 0) DESC, COALESCE(item.published_at, item.fetched_at) DESC, item.id ASC"}
     LIMIT $${values.length}`,
    values,
  );
  const items = result.rows.map(mapRadarItem);
  if (isSavedArchive || items.length === 0) return items;
  const featuredId = items.reduce((best, candidate) =>
    featuredScore(candidate) > featuredScore(best) ? candidate : best,
  ).id;
  return items.map((item) => ({ ...item, isFeatured: item.id === featuredId }));
}

export async function getRadarStatsForCycle(userId: string, cycleCode: RadarCycleCode): Promise<NewsSyncStatus> {
  const result = await query<RadarStatsRow>(
    `SELECT
       count(*) FILTER (WHERE
         (item.expires_at IS NULL OR item.expires_at > now())
         AND ((item.kind = 'news' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '7 days')
           OR (item.kind = 'legal' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '30 days'))
       )::text AS total_items,
       count(*) FILTER (WHERE
         timezone('Europe/Madrid', COALESCE(item.published_at, item.fetched_at))::date = timezone('Europe/Madrid', now())::date
         AND (item.expires_at IS NULL OR item.expires_at > now())
       )::text AS today_items,
       count(*) FILTER (WHERE state.status IS NULL
         AND (item.expires_at IS NULL OR item.expires_at > now())
         AND ((item.kind = 'news' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '7 days')
           OR (item.kind = 'legal' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '30 days'))
       )::text AS new_items,
       count(*) FILTER (WHERE state.status = 'saved')::text AS saved_items,
       max(item.fetched_at) FILTER (WHERE
         (item.expires_at IS NULL OR item.expires_at > now())
         AND ((item.kind = 'news' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '7 days')
           OR (item.kind = 'legal' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '30 days'))
       )::text AS last_received_at
     FROM public.radar_items item
     LEFT JOIN public.radar_item_user_states state
       ON state.radar_item_id = item.id AND state.user_id = $1
     WHERE $2 = ANY(item.target_cycle_codes)
       AND item.destination = 'news'
       AND item.kind IN ('news', 'legal')
       AND item.review_status = 'approved'
      `,
    [userId, cycleCode],
  );
  const row = result.rows[0];
  return {
    cycleCode,
    totalItems: Number(row?.total_items ?? 0),
    todayItems: Number(row?.today_items ?? 0),
    newItems: Number(row?.new_items ?? 0),
    savedItems: Number(row?.saved_items ?? 0),
    lastReceivedAt: row?.last_received_at ?? null,
  };
}

/**
 * Mutates read/saved state for one item, under the same visibility boundary
 * as the news list and the detail query:
 *   - an item the caller has not already saved can only be touched while it
 *     is still live (cycle, destination, kind, not expired, within the
 *     freshness window) — this closes an enumeration path where a guessed,
 *     stale item id could be saved and, from that point on, stay reachable
 *     through the detail route regardless of authorization;
 *   - an item the caller has already saved stays reachable and mutable
 *     (matches the saved-archive behaviour) regardless of freshness;
 *   - status transitions are monotonic — "saved" never reverts to "read",
 *     including on a read request that lands after a save request completed.
 * A false/0-row result means the item does not exist, is not in the
 * caller's cycle, or is a non-news/stale item never saved by this caller —
 * these are intentionally indistinguishable.
 */
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
       AND item.destination = 'news'
       AND item.kind IN ('news', 'legal')
       AND item.review_status = 'approved'
       AND (
         EXISTS (
           SELECT 1 FROM public.radar_item_user_states existing
           WHERE existing.user_id = $1 AND existing.radar_item_id = item.id AND existing.status = 'saved'
         )
         OR (
           (item.expires_at IS NULL OR item.expires_at > now())
           AND (
             (item.kind = 'news' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '7 days')
             OR (item.kind = 'legal' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '30 days')
           )
         )
       )
     ON CONFLICT (user_id, radar_item_id) DO UPDATE SET
       status = CASE
         WHEN public.radar_item_user_states.status = 'saved' THEN 'saved'
         ELSE excluded.status
       END
     RETURNING radar_item_id`,
    [userId, itemId, cycleCode, status],
  );
  return Boolean(result.rowCount);
}

/**
 * Single-item counterpart of listRadarItemsForCycle. Mirrors the exact same
 * cycle/destination/kind/freshness boundary, plus the same saved-archive
 * bypass (a saved item stays reachable after it expires out of the live
 * feed). Cross-cycle, non-news and unapproved items are indistinguishable
 * from a nonexistent id to the caller — this returns null for all of them.
 */
export async function getRadarItemDetailForUser(
  userId: string,
  cycleCode: RadarCycleCode,
  itemId: string,
): Promise<NewsItem | null> {
  const result = await query<RadarItemRow>(
    `SELECT item.id::text, item.source_id, item.source_name, item.title, item.summary,
            item.canonical_url, item.kind, item.published_at, item.fetched_at, item.expires_at,
            item.event_starts_at, item.event_ends_at, item.registration_url,
            item.registration_deadline, item.locality, item.province, item.target_cycle_codes,
            item.module_codes, item.topics, item.trust_tier,
            COALESCE(canonical.summary_short, item.summary) AS summary_short,
            canonical.summary_expanded, canonical.key_facts, canonical.why_relevant,
            canonical.source_updated_at, canonical.source_verified_at,
            canonical.ranking_priority, canonical.current_revision,
            canonical.material_fingerprint, canonical.primary_evidence_url,
            canonical.language, canonical.match_reasons,
            COALESCE(state.status, 'new')::text AS status
     FROM public.radar_items item
     LEFT JOIN public.radar_content_occurrences canonical
       ON canonical.legacy_radar_item_id = item.id
      AND canonical.publication_decision = 'accepted'
     LEFT JOIN public.radar_item_user_states state
       ON state.radar_item_id = item.id AND state.user_id = $1
     WHERE item.id = $3::bigint
       AND $2 = ANY(item.target_cycle_codes)
       AND item.destination = 'news'
       AND item.kind IN ('news', 'legal')
       AND item.review_status = 'approved'
       AND (
         state.status = 'saved'
         OR (
           (item.expires_at IS NULL OR item.expires_at > now())
           AND (
             (item.kind = 'news' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '7 days')
             OR (item.kind = 'legal' AND COALESCE(item.published_at, item.fetched_at) >= now() - interval '30 days')
           )
         )
       )
     LIMIT 1`,
    [userId, cycleCode, itemId],
  );
  const row = result.rows[0];
  return row ? mapRadarItem(row) : null;
}

/**
 * Related items reuse listRadarItemsForCycle verbatim (no new query/rules)
 * and rank in memory by shared topics/modules, so "related" can never show
 * anything the live feed itself wouldn't already allow.
 */
export async function getRelatedNewsItems(
  userId: string,
  cycleCode: RadarCycleCode,
  currentItem: NewsItem,
  limit = 4,
): Promise<NewsItem[]> {
  const candidates = await listRadarItemsForCycle(userId, cycleCode, { limit: 40 });
  const currentTopics = new Set(currentItem.topics);
  const currentModules = new Set(currentItem.moduleCodes);
  return candidates
    .filter((candidate) => candidate.id !== currentItem.id)
    .map((candidate) => ({
      candidate,
      score:
        candidate.topics.filter((topic) => currentTopics.has(topic)).length * 2 +
        candidate.moduleCodes.filter((moduleCode) => currentModules.has(moduleCode)).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

/** The next article is taken from the exact same authorised live ordering as the list. */
export async function getNextRadarNewsItem(
  userId: string,
  cycleCode: RadarCycleCode,
  currentItemId: string,
): Promise<NewsItem | null> {
  const authorised = await listRadarItemsForCycle(userId, cycleCode, { limit: 200, sort: "date" });
  const index = authorised.findIndex((item) => item.id === currentItemId);
  return index >= 0 && index + 1 < authorised.length ? authorised[index + 1] ?? null : null;
}

function mapRadarItem(row: RadarItemRow): NewsItem {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceName: row.source_name,
    title: row.title,
    summaryShort: (row.summary_short ?? row.summary) || undefined,
    summaryExpanded: row.summary_expanded ?? undefined,
    keyFacts: row.key_facts ?? [],
    whyRelevant: row.why_relevant ?? undefined,
    description: (row.summary_short ?? row.summary) || undefined,
    url: row.canonical_url,
    kind: row.kind,
    publishedAt: row.published_at ?? undefined,
    sourceUpdatedAt: row.source_updated_at ?? undefined,
    verifiedAt: row.source_verified_at ?? undefined,
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
    language: row.language ?? undefined,
    matchReasons: row.match_reasons ?? [],
    rankingPriority: row.ranking_priority ?? undefined,
    revision: row.current_revision ?? undefined,
    materialFingerprint: row.material_fingerprint ?? undefined,
    primaryEvidenceUrl: row.primary_evidence_url ?? undefined,
    trustTier: row.trust_tier,
    status: row.status,
    isFeatured: false,
  };
}

function featuredScore(item: NewsItem): number {
  if (item.rankingPriority !== undefined) return item.rankingPriority;
  const trustWeight: Record<NewsItem["trustTier"], number> = {
    official: 5,
    institutional: 4,
    first_party: 3,
    sector: 2,
    reference: 1,
  };
  const ageHours = Math.max(0, (Date.now() - Date.parse(itemDate(item))) / 3_600_000);
  const recency = ageHours <= 24 ? 100 : ageHours <= 72 ? 60 : 20;
  return recency + trustWeight[item.trustTier] * 8 + Math.min(item.topics.length, 3) * 3 + (item.status === "new" ? 5 : 0);
}

function itemDate(item: NewsItem): string {
  return item.publishedAt ?? item.fetchedAt;
}

function trustOrderSql(): string {
  return `CASE item.trust_tier
    WHEN 'official' THEN 5 WHEN 'institutional' THEN 4 WHEN 'first_party' THEN 3
    WHEN 'sector' THEN 2 ELSE 1 END DESC, COALESCE(item.published_at, item.fetched_at) DESC`;
}

export class RadarDeliveryConflictError extends Error {
  constructor(message = "delivery id already exists with different payload") {
    super(message);
    this.name = "RadarDeliveryConflictError";
  }
}
