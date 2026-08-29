import "server-only";

import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db/pool";
import type { RadarLearningDelivery, RadarLearningResource } from "@/lib/radar/learning-contract";

export class RadarLearningDeliveryConflictError extends Error {
  constructor(message = "learning delivery or revision conflicts with persisted data") {
    super(message);
    this.name = "RadarLearningDeliveryConflictError";
  }
}

export interface RadarLearningIngestResult {
  duplicate: boolean;
  resourceCount: number;
  mappingCount: number;
}

function resourceSnapshot(item: RadarLearningResource) {
  return {
    provider: item.resource.provider,
    externalId: item.resource.externalId,
    canonicalUrl: item.resource.canonicalUrl,
    channelId: item.resource.channelId,
    channelName: item.resource.channelName,
    title: item.resource.title,
    description: item.resource.description ?? null,
    language: item.resource.language,
    durationSeconds: item.resource.durationSeconds,
    availability: item.resource.availability,
    verifiedAt: item.resource.verifiedAt,
    revision: item.resource.revision,
    supersedesExternalId: item.resource.supersedesExternalId ?? null,
    mappings: item.mappings,
  };
}

async function assertCanonicalMappings(client: PoolClient, item: RadarLearningResource): Promise<void> {
  for (const mapping of item.mappings) {
    const result = await client.query(
      `SELECT 1 FROM public.fp_cycle_skills WHERE cycle_code = $1 AND skill_id = $2`,
      [mapping.cycleCode, mapping.competencyKey],
    );
    if (result.rowCount !== 1) {
      throw new RadarLearningDeliveryConflictError(
        `unknown canonical cycle/skill mapping: ${mapping.cycleCode}/${mapping.competencyKey}`,
      );
    }
  }
}

async function upsertLearningResource(
  client: PoolClient,
  deliveryId: string,
  item: RadarLearningResource,
): Promise<{ resourceId: string; changed: boolean }> {
  const snapshot = resourceSnapshot(item);
  const existing = await client.query<{
    id: string;
    resource_revision: number;
    radar_revision: number | null;
    provider_resource_id: string | null;
  }>(
    `SELECT id, resource_revision, radar_revision, provider_resource_id FROM public.fp_learning_resources
     WHERE resource_type = 'youtube_video' AND provider_resource_id = $1
     FOR UPDATE`,
    [item.resource.externalId],
  );
  let current = existing.rows[0];
  if (!current) {
    const legacy = await client.query<{
      id: string;
      resource_revision: number;
      radar_revision: number | null;
      provider_resource_id: string | null;
    }>(
      `SELECT resource.id, resource.resource_revision, resource.radar_revision,
              resource.provider_resource_id
       FROM public.fp_learning_resources resource
       WHERE resource.provider_resource_id is null
         AND resource.resource_type = 'youtube_video'
         AND resource.youtube_url ~ '^https://(www\\.)?(youtube\\.com/watch\\?v=|youtu\\.be/)'
         AND position($1 in resource.youtube_url) > 0
       ORDER BY
         (SELECT count(*) FROM public.fp_user_learning_state state WHERE state.resource_id = resource.id) DESC,
         (SELECT count(*) FROM public.fp_learning_notes note WHERE note.resource_id = resource.id) DESC,
         resource.id
       LIMIT 1 FOR UPDATE`,
      [item.resource.externalId],
    );
    current = legacy.rows[0];
  }
  if (current?.radar_revision && item.resource.revision < current.radar_revision) {
    return { resourceId: current.id, changed: false };
  }
  if (current?.radar_revision && item.resource.revision === current.radar_revision) {
    const revision = await client.query<{ matches: boolean }>(
      `SELECT snapshot = $3::jsonb as matches
       FROM public.fp_learning_resource_revisions
       WHERE resource_id = $1 AND revision = $2`,
      [current.id, current.resource_revision, JSON.stringify(snapshot)],
    );
    if (revision.rows[0] && !revision.rows[0].matches) {
      throw new RadarLearningDeliveryConflictError(`revision ${item.resource.revision} changed for ${item.resource.externalId}`);
    }
    return { resourceId: current.id, changed: false };
  }
  const storedRevision = current ? current.resource_revision + 1 : 1;

  let supersedesResourceId: string | null = null;
  if (item.resource.supersedesExternalId) {
    const superseded = await client.query<{ id: string }>(
      `SELECT id FROM public.fp_learning_resources
       WHERE resource_type = 'youtube_video' AND provider_resource_id = $1`,
      [item.resource.supersedesExternalId],
    );
    supersedesResourceId = superseded.rows[0]?.id ?? null;
  }
  const generatedId = current?.id ?? `radar-youtube-${item.resource.externalId}`;
  const values = [
    generatedId,
    item.resource.title,
    item.resource.description ?? item.resource.title,
    item.resource.channelName,
    item.resource.canonicalUrl,
    item.resource.durationSeconds,
    item.resource.verifiedAt,
    item.mappings.flatMap((mapping) => mapping.selectionReasons).join("; ").slice(0, 2_000),
    item.resource.externalId,
    item.resource.channelId,
    `radar-learning:${deliveryId}`,
    storedRevision,
    item.resource.revision,
    supersedesResourceId,
    JSON.stringify({ authority: "radar-learning-v1", deliveryId }),
  ];
  const result = current
    ? await client.query<{ id: string }>(
      `UPDATE public.fp_learning_resources SET
         title = $2, description = $3, provider = $4, youtube_url = $5,
         duration_seconds = $6, reviewed_at = $7::timestamptz::date,
         reviewed_by = 'radar-learning-v1', review_reason = $8,
         provider_resource_id = $9, canonical_url = $5,
         deep_link = coalesce(deep_link, '/aprende/' || slug), channel_id = $10,
         channel_name = $4, publication_state = 'approved', availability_state = 'available',
         source_kind = 'radar', source_ref = $11, source_verified_at = $7,
         resource_revision = $12, radar_revision = $13, supersedes_resource_id = $14,
         provenance = $15::jsonb, is_active = true
       WHERE id = $1 RETURNING id`,
      values,
    )
    : await client.query<{ id: string }>(
      `INSERT INTO public.fp_learning_resources (
       id, slug, title, description, provider, language, level, youtube_url,
       duration_seconds, review_status, reviewed_at, reviewed_by, review_reason,
       resource_type, provider_resource_id, canonical_url, deep_link, channel_id,
       channel_name, publication_state, availability_state, source_kind, source_ref,
       source_verified_at, resource_revision, radar_revision, supersedes_resource_id, provenance, is_active
     ) VALUES (
       $1, $1, $2, $3, $4, 'es', 'inicial', $5, $6, 'approved', $7::timestamptz::date,
       'radar-learning-v1', $8, 'youtube_video', $9, $5, '/aprende/' || $1,
       $10, $4, 'approved', 'available', 'radar', $11, $7, $12, $13, $14, $15::jsonb, true
     )
     ON CONFLICT (resource_type, provider_resource_id) WHERE provider_resource_id is not null
     DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       provider = excluded.provider,
       youtube_url = excluded.youtube_url,
       duration_seconds = excluded.duration_seconds,
       reviewed_at = excluded.reviewed_at,
       reviewed_by = excluded.reviewed_by,
       review_reason = excluded.review_reason,
       canonical_url = excluded.canonical_url,
       deep_link = coalesce(fp_learning_resources.deep_link, '/aprende/' || fp_learning_resources.slug),
       channel_id = excluded.channel_id,
       channel_name = excluded.channel_name,
       publication_state = 'approved',
       availability_state = 'available',
       source_kind = 'radar',
       source_ref = excluded.source_ref,
       source_verified_at = excluded.source_verified_at,
       resource_revision = excluded.resource_revision,
       radar_revision = excluded.radar_revision,
       supersedes_resource_id = excluded.supersedes_resource_id,
       provenance = excluded.provenance,
       is_active = true
       RETURNING id`,
      values,
    );
  const resourceId = result.rows[0].id;
  await client.query(
    `INSERT INTO public.fp_learning_resource_revisions (
       resource_id, revision, snapshot, source_verified_at
     ) VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (resource_id, revision) DO NOTHING`,
    [resourceId, storedRevision, JSON.stringify(snapshot), item.resource.verifiedAt],
  );
  if (supersedesResourceId) {
    await client.query(
      `UPDATE public.fp_learning_resources SET publication_state = 'retired'
       WHERE id = $1 AND id <> $2`,
      [supersedesResourceId, resourceId],
    );
    await client.query(
      `UPDATE public.fp_skill_learning_resources SET publication_state = 'retired'
       WHERE resource_id = $1 AND publication_state = 'approved'`,
      [supersedesResourceId],
    );
  }
  return { resourceId, changed: true };
}

async function upsertMappings(
  client: PoolClient,
  deliveryId: string,
  resourceId: string,
  item: RadarLearningResource,
): Promise<number> {
  for (const mapping of item.mappings) {
    const role = mapping.role === "backup" ? "alternative" : mapping.role;
    if (role === "primary") {
      await client.query(
        `UPDATE public.fp_skill_learning_resources
         SET publication_state = 'retired'
         WHERE cycle_code = $1 AND skill_id = $2 AND role = 'primary'
           AND publication_state = 'approved' AND resource_id <> $3`,
        [mapping.cycleCode, mapping.competencyKey, resourceId],
      );
    }
    await client.query(
      `INSERT INTO public.fp_skill_learning_resources (
         cycle_code, skill_id, resource_id, role, coverage_percent,
         mapping_rationale, publication_state, source_kind, source_ref,
         verified_at, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, 'approved', 'radar', $7, $8, $9)
       ON CONFLICT (cycle_code, skill_id, resource_id) DO UPDATE SET
         role = excluded.role,
         coverage_percent = excluded.coverage_percent,
         mapping_rationale = excluded.mapping_rationale,
         publication_state = 'approved',
         source_kind = 'radar',
         source_ref = excluded.source_ref,
         verified_at = excluded.verified_at,
         sort_order = excluded.sort_order`,
      [
        mapping.cycleCode,
        mapping.competencyKey,
        resourceId,
        role,
        mapping.coveragePercent ?? null,
        mapping.selectionReasons.join("; "),
        `radar-learning:${deliveryId}`,
        item.resource.verifiedAt,
        role === "primary" ? 1 : role === "alternative" ? 2 : 3,
      ],
    );
    if (role === "primary") {
      await client.query(
        `UPDATE public.fp_learning_coverage_gaps SET status = 'covered'
         WHERE cycle_code = $1 AND skill_id = $2`,
        [mapping.cycleCode, mapping.competencyKey],
      );
    }
  }
  return item.mappings.length;
}

export async function ingestRadarLearningDelivery(
  delivery: RadarLearningDelivery,
  rawBody: string,
): Promise<RadarLearningIngestResult> {
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  return withTransaction(async (client) => {
    const existing = await client.query<{ payload_hash: string; item_count: number }>(
      `SELECT payload_hash, item_count FROM public.radar_learning_deliveries
       WHERE delivery_id = $1 FOR UPDATE`,
      [delivery.deliveryId],
    );
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.payload_hash !== payloadHash || row.item_count !== delivery.resources.length) {
        throw new RadarLearningDeliveryConflictError();
      }
      return { duplicate: true, resourceCount: row.item_count, mappingCount: 0 };
    }

    await client.query(
      `INSERT INTO public.radar_learning_deliveries (delivery_id, payload_hash, item_count)
       VALUES ($1, $2, $3)`,
      [delivery.deliveryId, payloadHash, delivery.resources.length],
    );
    let mappingCount = 0;
    for (const item of delivery.resources) {
      await assertCanonicalMappings(client, item);
      const resource = await upsertLearningResource(client, delivery.deliveryId, item);
      if (resource.changed) {
        mappingCount += await upsertMappings(client, delivery.deliveryId, resource.resourceId, item);
      }
    }
    return { duplicate: false, resourceCount: delivery.resources.length, mappingCount };
  });
}
