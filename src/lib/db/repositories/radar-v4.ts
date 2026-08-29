import "server-only";
import type { PoolClient } from "pg";
import {
  RADAR_V4_FACT_FIELDS,
  radarV4FactsSchema,
  radarV4ValueHash,
  type RadarDeliveryV4,
  type RadarV4DeliveryItem,
  type RadarV4EvidenceField,
  type RadarV4FactField,
  type RadarV4Facts,
  type RadarV4Job,
} from "@/lib/radar/contract";
import {
  legacyLifecycleStatus,
  legacyRanking,
  radarV4ProjectionDestinations,
  resolveRadarV4Fact,
} from "@/lib/radar/v4-projection";

type RadarV4IngestResult = { projectedItemCount: number; conflictCount: number };

type EntityRow = { id: string; entity_key: string };
type OccurrenceRow = {
  id: string;
  entity_id: string;
  source_id: string;
  occurrence_key: string;
  current_revision: number;
  material_fingerprint: string;
  legacy_radar_item_id: string | null;
  legacy_fp_content_item_id: string | null;
};
type RevisionRow = { id: string; revision: number; material_fingerprint: string };
type CurrentFactRow = {
  field_path: RadarV4EvidenceField;
  value_json: unknown;
  authority_rank: number;
};

const ARRAY_FACT_FIELDS = new Set<RadarV4FactField>([
  "keyFacts",
  "otherEligibility",
  "requirements",
  "audience",
]);

const FACT_COLUMN_BY_FIELD: Record<RadarV4FactField, string> = {
  title: "title",
  summaryShort: "summary_short",
  summaryExpanded: "summary_expanded",
  keyFacts: "key_facts",
  organizer: "organizer",
  provider: "provider",
  courseCode: "course_code",
  startsAt: "starts_at",
  endsAt: "ends_at",
  registrationOpensAt: "registration_opens_at",
  registrationDeadline: "registration_deadline",
  registrationUrl: "registration_url",
  attendanceMode: "attendance_mode",
  country: "country",
  autonomousCommunity: "autonomous_community",
  province: "province",
  municipality: "municipality",
  venue: "venue",
  address: "address",
  durationHours: "duration_hours",
  courseDifficulty: "course_difficulty",
  minimumEducation: "minimum_education",
  otherEligibility: "other_eligibility",
  credentialLevel: "credential_level",
  priceState: "price_state",
  priceAmountMinor: "price_amount_minor",
  priceCurrency: "price_currency",
  certification: "certification",
  prize: "prize",
  requirements: "requirements",
  audience: "audience",
  sourceLifecycleStatus: "source_lifecycle_status",
};

export async function ingestRadarV4Delivery(
  client: PoolClient,
  delivery: RadarDeliveryV4,
): Promise<RadarV4IngestResult> {
  const enabledDestinations = radarV4ProjectionDestinations();
  let projectedItemCount = 0;
  let conflictCount = 0;

  for (const item of delivery.items) {
    const entity = await resolveEntity(client, item);
    const occurrence = await resolveOccurrence(client, entity, item);
    const knownRevision = await client.query<RevisionRow>(
      `SELECT id, revision, material_fingerprint
       FROM public.radar_content_revisions
       WHERE occurrence_id = $1 AND (revision = $2 OR material_fingerprint = $3)
       ORDER BY revision DESC LIMIT 1`,
      [occurrence.id, item.identity.revision, item.identity.materialFingerprint],
    );

    if (knownRevision.rows[0]) {
      const revision = knownRevision.rows[0];
      if (revision.revision !== item.identity.revision || revision.material_fingerprint !== item.identity.materialFingerprint) {
        throw new RadarV4RevisionConflictError();
      }
      await linkDeliveryRevision(client, delivery.deliveryId, revision.id);
      await recordProjectorEvent(client, delivery.deliveryId, revision.id, "canonical", "skipped", "revision_already_known");
      continue;
    }

    const revisionResult = await client.query<{ id: string }>(
      `INSERT INTO public.radar_content_revisions (
         occurrence_id, revision, material_fingerprint, publication_decision,
         ranking_priority, payload_snapshot
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id`,
      [
        occurrence.id,
        item.identity.revision,
        item.identity.materialFingerprint,
        item.publication.decision,
        item.publication.rankingPriority,
        JSON.stringify(item),
      ],
    );
    const revisionId = revisionResult.rows[0]?.id;
    if (!revisionId) throw new Error("Radar v4 revision insert did not return an id");

    await linkDeliveryRevision(client, delivery.deliveryId, revisionId);
    await insertEvidence(client, revisionId, item);
    await insertJobEvidence(client, revisionId, item);
    await insertTargets(client, revisionId, item);
    await persistAliases(client, entity, occurrence, item);

    if (item.identity.revision < occurrence.current_revision) {
      await recordProjectorEvent(client, delivery.deliveryId, revisionId, "canonical", "skipped", "stale_revision");
      continue;
    }
    if (item.identity.revision === occurrence.current_revision && occurrence.material_fingerprint !== item.identity.materialFingerprint) {
      throw new RadarV4RevisionConflictError();
    }

    const merged = await mergeCurrentFacts(client, occurrence.id, revisionId, item);
    conflictCount += merged.unresolvedConflictCount;
    const effectiveDecision = merged.unresolvedConflictCount > 0 ? "quarantined" : item.publication.decision;

    await updateOccurrence(client, occurrence.id, item, merged.facts, effectiveDecision);
    if (item.classification.destination === "job" && item.job && effectiveDecision === "accepted") {
      await upsertVerifiedJob(client, occurrence.id, revisionId, item.job);
    }
    await client.query(
      `UPDATE public.radar_content_entities
       SET destination = $2, opportunity_type = $3, title = $4, organizer = $5,
           provider = $6, last_verified_at = GREATEST(last_verified_at, $7::timestamptz)
       WHERE id = $1`,
      [
        entity.id,
        item.classification.destination,
        item.classification.opportunityType,
        merged.facts.title,
        merged.facts.organizer,
        merged.facts.provider,
        item.source.verifiedAt,
      ],
    );
    await recordProjectorEvent(
      client,
      delivery.deliveryId,
      revisionId,
      "canonical",
      merged.unresolvedConflictCount > 0 ? "conflict" : "projected",
      merged.unresolvedConflictCount > 0 ? "lower_or_equal_authority_conflict" : null,
    );

    const projectionReason = projectionSkipReason(item, effectiveDecision, enabledDestinations);
    if (projectionReason) {
      await recordProjectorEvent(
        client,
        delivery.deliveryId,
        revisionId,
        item.classification.destination === "news"
          ? "legacy_news"
          : item.classification.destination === "job"
            ? "verified_job"
            : "legacy_fp_catalogue",
        merged.unresolvedConflictCount > 0 ? "conflict" : "skipped",
        projectionReason,
      );
      continue;
    }

    if (item.classification.destination === "news") {
      await projectNews(client, occurrence.id, item, merged.facts);
      await recordProjectorEvent(client, delivery.deliveryId, revisionId, "legacy_news", "projected", null);
    } else if (item.classification.destination === "job") {
      await recordProjectorEvent(client, delivery.deliveryId, revisionId, "verified_job", "projected", null);
    } else {
      await projectCatalogue(client, occurrence.id, item, merged.facts);
      await recordProjectorEvent(client, delivery.deliveryId, revisionId, "legacy_fp_catalogue", "projected", null);
    }
    projectedItemCount += 1;
  }

  return { projectedItemCount, conflictCount };
}

async function resolveEntity(client: PoolClient, item: RadarV4DeliveryItem): Promise<EntityRow> {
  const alias = await client.query<EntityRow>(
    `SELECT entity.id, entity.entity_key
     FROM public.radar_content_identity_aliases alias
     INNER JOIN public.radar_content_entities entity ON entity.id = alias.canonical_entity_id
     WHERE alias.alias_kind = 'entity' AND alias.source_id IS NULL AND alias.alias_key = $1
     LIMIT 1`,
    [item.identity.entityKey],
  );
  if (alias.rows[0]) return alias.rows[0];

  const candidateKeys = [
    item.identity.entityKey,
    ...item.identity.aliases.filter((entry) => entry.kind === "entity").map((entry) => entry.key),
  ];
  const existing = await client.query<EntityRow>(
    `SELECT id, entity_key
     FROM public.radar_content_entities
     WHERE entity_key::text = ANY($1::text[])`,
    [candidateKeys],
  );
  const uniqueEntityIds = new Set(existing.rows.map((row) => row.id));
  if (uniqueEntityIds.size > 1) throw new RadarV4IdentityConflictError();
  if (existing.rows[0]) return existing.rows[0];

  const result = await client.query<EntityRow>(
    `INSERT INTO public.radar_content_entities (
       entity_key, destination, opportunity_type, title, organizer, provider,
       first_seen_at, last_verified_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $7::timestamptz)
     ON CONFLICT (entity_key) DO UPDATE SET
       last_verified_at = GREATEST(public.radar_content_entities.last_verified_at, excluded.last_verified_at)
     RETURNING id, entity_key`,
    [
      item.identity.entityKey,
      item.classification.destination,
      item.classification.opportunityType,
      item.facts.title,
      item.facts.organizer,
      item.facts.provider,
      item.source.verifiedAt,
    ],
  );
  if (!result.rows[0]) throw new Error("Radar v4 entity upsert did not return an id");
  return result.rows[0];
}

async function resolveOccurrence(
  client: PoolClient,
  entity: EntityRow,
  item: RadarV4DeliveryItem,
): Promise<OccurrenceRow> {
  const alias = await client.query<OccurrenceRow>(
    `SELECT occurrence.id, occurrence.entity_id, occurrence.source_id,
            occurrence.occurrence_key, occurrence.current_revision,
            occurrence.material_fingerprint, occurrence.legacy_radar_item_id::text,
            occurrence.legacy_fp_content_item_id::text
     FROM public.radar_content_identity_aliases alias
     INNER JOIN public.radar_content_occurrences occurrence ON occurrence.id = alias.canonical_occurrence_id
     WHERE alias.alias_kind = 'occurrence' AND alias.source_id = $1 AND alias.alias_key = $2
     LIMIT 1`,
    [item.source.id, item.identity.occurrenceKey],
  );
  if (alias.rows[0]) return alias.rows[0];

  const occurrenceAliases = item.identity.aliases.filter((entry) => entry.kind === "occurrence");
  const candidates: OccurrenceRow[] = [];
  for (const candidate of [
    { sourceId: item.source.id, key: item.identity.occurrenceKey },
    ...occurrenceAliases.map((entry) => ({ sourceId: entry.sourceId ?? item.source.id, key: entry.key })),
  ]) {
    const direct = await client.query<OccurrenceRow>(
      `SELECT id, entity_id, source_id, occurrence_key, current_revision, material_fingerprint,
              legacy_radar_item_id::text, legacy_fp_content_item_id::text
       FROM public.radar_content_occurrences
       WHERE source_id = $1 AND occurrence_key = $2`,
      [candidate.sourceId, candidate.key],
    );
    if (direct.rows[0]) candidates.push(direct.rows[0]);
    const aliased = await client.query<OccurrenceRow>(
      `SELECT occurrence.id, occurrence.entity_id, occurrence.source_id,
              occurrence.occurrence_key, occurrence.current_revision,
              occurrence.material_fingerprint, occurrence.legacy_radar_item_id::text,
              occurrence.legacy_fp_content_item_id::text
       FROM public.radar_content_identity_aliases alias
       INNER JOIN public.radar_content_occurrences occurrence ON occurrence.id = alias.canonical_occurrence_id
       WHERE alias.alias_kind = 'occurrence' AND alias.source_id = $1 AND alias.alias_key = $2`,
      [candidate.sourceId, candidate.key],
    );
    if (aliased.rows[0]) candidates.push(aliased.rows[0]);
  }
  const uniqueCandidates = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  if (uniqueCandidates.size > 1) throw new RadarV4IdentityConflictError();
  const resolved = [...uniqueCandidates.values()][0];
  if (resolved) {
    if (resolved.entity_id !== entity.id) {
      await client.query(
        `UPDATE public.radar_content_occurrences SET entity_id = $2 WHERE id = $1`,
        [resolved.id, entity.id],
      );
      resolved.entity_id = entity.id;
    }
    return resolved;
  }

  const result = await client.query<OccurrenceRow>(
    `INSERT INTO public.radar_content_occurrences (
       entity_id, source_id, source_name, external_id, occurrence_key, legacy_semantic_key,
       canonical_url, primary_evidence_url, supporting_evidence_urls, trust_tier,
       source_published_at, source_updated_at, source_verified_at, current_revision,
       material_fingerprint, publication_decision, source_lifecycle_status,
       ranking_priority, title, language, match_reasons
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
     )
     ON CONFLICT (source_id, occurrence_key) DO UPDATE SET
       source_verified_at = GREATEST(public.radar_content_occurrences.source_verified_at, excluded.source_verified_at)
     RETURNING id, entity_id, source_id, occurrence_key, current_revision, material_fingerprint,
               legacy_radar_item_id::text, legacy_fp_content_item_id::text`,
    [
      entity.id,
      item.source.id,
      item.source.name,
      item.source.externalId,
      item.identity.occurrenceKey,
      item.identity.legacySemanticKey,
      item.source.canonicalUrl,
      item.source.primaryEvidenceUrl,
      item.source.supportingEvidenceUrls,
      item.source.trustTier,
      item.source.publishedAt,
      item.source.updatedAt,
      item.source.verifiedAt,
      item.identity.revision,
      item.identity.materialFingerprint,
      item.publication.decision,
      item.facts.sourceLifecycleStatus,
      item.publication.rankingPriority,
      item.facts.title,
      item.classification.language,
      item.classification.matchReasons,
    ],
  );
  if (!result.rows[0]) throw new Error("Radar v4 occurrence upsert did not return an id");
  return result.rows[0];
}

async function mergeCurrentFacts(
  client: PoolClient,
  occurrenceId: string,
  revisionId: string,
  item: RadarV4DeliveryItem,
): Promise<{ facts: RadarV4Facts; unresolvedConflictCount: number }> {
  const currentResult = await client.query<CurrentFactRow>(
    `SELECT field_path, value_json, authority_rank
     FROM public.radar_content_current_facts WHERE occurrence_id = $1`,
    [occurrenceId],
  );
  const current = new Map(currentResult.rows.map((row) => [row.field_path, row]));
  const resolutions = new Map<RadarV4EvidenceField, ReturnType<typeof resolveRadarV4Fact>>();
  const incomingAuthorityRanks = new Map<RadarV4EvidenceField, number | null>();
  const candidate: Record<string, unknown> = {};
  let unresolvedConflictCount = 0;

  for (const field of RADAR_V4_FACT_FIELDS) {
    const fieldPath = `facts.${field}` as RadarV4EvidenceField;
    const currentFact = current.get(fieldPath);
    const evidenceRanks = item.evidence
      .filter((entry) => entry.fieldPath === fieldPath && entry.valueHash === radarV4ValueHash(item.facts[field]))
      .map((entry) => entry.authorityRank);
    const incomingAuthorityRank = evidenceRanks.length > 0 ? Math.max(...evidenceRanks) : null;
    incomingAuthorityRanks.set(fieldPath, incomingAuthorityRank);
    const resolution = resolveRadarV4Fact({
      currentValue: currentFact?.value_json ?? emptyFactValue(field),
      currentAuthorityRank: currentFact?.authority_rank ?? null,
      incomingValue: item.facts[field],
      incomingAuthorityRank,
      observationState: item.factStates[fieldPath],
    });
    candidate[field] = resolution.value;
    resolutions.set(fieldPath, resolution);
    if (resolution.conflict && resolution.resolution === "kept_last_known_good") unresolvedConflictCount += 1;
  }

  let factsResult = radarV4FactsSchema.safeParse(candidate);
  if (!factsResult.success && current.size > 0) {
    const previous = Object.fromEntries(RADAR_V4_FACT_FIELDS.map((field) => {
      const fieldPath = `facts.${field}` as RadarV4EvidenceField;
      return [field, current.get(fieldPath)?.value_json ?? emptyFactValue(field)];
    }));
    factsResult = radarV4FactsSchema.safeParse(previous);
    if (!factsResult.success) throw new Error("Stored Radar v4 facts violate the canonical contract");
    unresolvedConflictCount += 1;
    for (const [fieldPath, resolution] of resolutions) {
      resolutions.set(fieldPath, { ...resolution, applyIncoming: false });
    }
  }
  if (!factsResult.success) throw new Error("New Radar v4 facts violate the canonical contract");

  for (const field of RADAR_V4_FACT_FIELDS) {
    const fieldPath = `facts.${field}` as RadarV4EvidenceField;
    const resolution = resolutions.get(fieldPath);
    if (!resolution) continue;
    const currentFact = current.get(fieldPath);
    if (resolution.conflict) {
      await client.query(
        `INSERT INTO public.radar_content_conflicts (
           occurrence_id, incoming_revision_id, field_path, current_authority_rank,
           incoming_authority_rank, resolution
         ) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (incoming_revision_id, field_path) DO NOTHING`,
        [
          occurrenceId,
          revisionId,
          fieldPath,
          currentFact?.authority_rank ?? 0,
          incomingAuthorityRanks.get(fieldPath) ?? 0,
          resolution.resolution === "accepted_higher_authority" ? "accepted_higher_authority" : "kept_last_known_good",
        ],
      );
    }
    if (!resolution.applyIncoming) continue;
    await client.query(
      `INSERT INTO public.radar_content_current_facts (
         occurrence_id, field_path, value_json, observation_state,
         authority_rank, revision_id, verified_at
       ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7::timestamptz)
       ON CONFLICT (occurrence_id, field_path) DO UPDATE SET
         value_json = excluded.value_json,
         observation_state = excluded.observation_state,
         authority_rank = excluded.authority_rank,
         revision_id = excluded.revision_id,
         verified_at = excluded.verified_at,
         updated_at = now()`,
      [
        occurrenceId,
        fieldPath,
        JSON.stringify(resolution.value),
        item.factStates[fieldPath] === "verified_removed" ? "verified_removed" : "verified",
        resolution.authorityRank,
        revisionId,
        item.source.verifiedAt,
      ],
    );
  }

  return { facts: factsResult.data, unresolvedConflictCount };
}

async function updateOccurrence(
  client: PoolClient,
  occurrenceId: string,
  item: RadarV4DeliveryItem,
  facts: RadarV4Facts,
  publicationDecision: "accepted" | "rejected" | "quarantined",
) {
  const updates: Record<string, unknown> = {
    entity_id: undefined,
    source_name: item.source.name,
    external_id: item.source.externalId,
    legacy_semantic_key: item.identity.legacySemanticKey,
    canonical_url: item.source.canonicalUrl,
    primary_evidence_url: item.source.primaryEvidenceUrl,
    supporting_evidence_urls: item.source.supportingEvidenceUrls,
    trust_tier: item.source.trustTier,
    source_published_at: item.source.publishedAt,
    source_updated_at: item.source.updatedAt,
    source_verified_at: item.source.verifiedAt,
    current_revision: item.identity.revision,
    material_fingerprint: item.identity.materialFingerprint,
    publication_decision: publicationDecision,
    ranking_priority: item.publication.rankingPriority,
    language: item.classification.language,
    match_reasons: item.classification.matchReasons,
    ...Object.fromEntries(RADAR_V4_FACT_FIELDS.map((field) => [FACT_COLUMN_BY_FIELD[field], facts[field]])),
    about_summary: item.derived.aboutSummary,
    learning_outcomes: item.derived.learningOutcomes,
    skills_tested: item.derived.skillsTested,
    preparation_tips: item.derived.preparationTips,
    why_relevant: item.derived.whyRelevant,
  };
  delete updates.entity_id;
  const entries = Object.entries(updates);
  await client.query(
    `UPDATE public.radar_content_occurrences
     SET ${entries.map(([column], index) => `${column} = $${index + 1}`).join(", ")}
     WHERE id = $${entries.length + 1}`,
    [...entries.map(([, value]) => value), occurrenceId],
  );
}

async function insertEvidence(client: PoolClient, revisionId: string, item: RadarV4DeliveryItem) {
  for (const evidence of item.evidence) {
    await client.query(
      `INSERT INTO public.radar_content_field_evidence (
         revision_id, field_path, origin, evidence_kind, evidence_url,
         observed_at, value_hash, authority_rank
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (revision_id, field_path, evidence_url, value_hash) DO NOTHING`,
      [
        revisionId,
        evidence.fieldPath,
        evidence.origin,
        evidence.kind,
        evidence.url,
        evidence.observedAt,
        evidence.valueHash,
        evidence.authorityRank,
      ],
    );
  }
}

async function insertJobEvidence(client: PoolClient, revisionId: string, item: RadarV4DeliveryItem) {
  if (!item.job) return;
  for (const evidence of item.job.evidence) {
    await client.query(
      `INSERT INTO public.radar_job_field_evidence (
         revision_id, field_path, origin, evidence_kind, evidence_url,
         observed_at, value_hash, authority_rank
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (revision_id, field_path, evidence_url, value_hash) DO NOTHING`,
      [
        revisionId,
        evidence.fieldPath,
        evidence.origin,
        evidence.kind,
        evidence.url,
        evidence.observedAt,
        evidence.valueHash,
        evidence.authorityRank,
      ],
    );
  }
}

async function upsertVerifiedJob(
  client: PoolClient,
  occurrenceId: string,
  revisionId: string,
  job: RadarV4Job,
) {
  const facts = job.facts;
  await client.query(
    `INSERT INTO public.radar_verified_jobs (
       occurrence_id, current_revision_id, employer, source_vacancy_id,
       application_url, lifecycle, application_deadline, country,
       autonomous_community, province, municipality, workplace_mode,
       contract_type, working_time, schedule, salary_min_minor,
       salary_max_minor, salary_currency, salary_period, minimum_education,
       experience_requirements, languages, other_eligibility,
       source_published_at, source_updated_at, first_seen_at, last_seen_at,
       verified_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
       $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
       $27, $28
     )
     ON CONFLICT (occurrence_id) DO UPDATE SET
       current_revision_id=excluded.current_revision_id,
       employer=excluded.employer, source_vacancy_id=excluded.source_vacancy_id,
       application_url=excluded.application_url, lifecycle=excluded.lifecycle,
       application_deadline=excluded.application_deadline, country=excluded.country,
       autonomous_community=excluded.autonomous_community, province=excluded.province,
       municipality=excluded.municipality, workplace_mode=excluded.workplace_mode,
       contract_type=excluded.contract_type, working_time=excluded.working_time,
       schedule=excluded.schedule, salary_min_minor=excluded.salary_min_minor,
       salary_max_minor=excluded.salary_max_minor, salary_currency=excluded.salary_currency,
       salary_period=excluded.salary_period, minimum_education=excluded.minimum_education,
       experience_requirements=excluded.experience_requirements,
       languages=excluded.languages, other_eligibility=excluded.other_eligibility,
       source_published_at=excluded.source_published_at,
       source_updated_at=excluded.source_updated_at,
       first_seen_at=least(public.radar_verified_jobs.first_seen_at, excluded.first_seen_at),
       last_seen_at=greatest(public.radar_verified_jobs.last_seen_at, excluded.last_seen_at),
       verified_at=excluded.verified_at`,
    [
      occurrenceId,
      revisionId,
      facts.employer,
      facts.sourceVacancyId,
      facts.applicationUrl,
      facts.lifecycle,
      facts.applicationDeadline,
      facts.country,
      facts.autonomousCommunity,
      facts.province,
      facts.municipality,
      facts.workplaceMode,
      facts.contractType,
      facts.workingTime,
      facts.schedule,
      facts.salaryMinMinor,
      facts.salaryMaxMinor,
      facts.salaryCurrency,
      facts.salaryPeriod,
      facts.minimumEducation,
      facts.experienceRequirements,
      facts.languages,
      facts.otherEligibility,
      facts.sourcePublishedAt,
      facts.sourceUpdatedAt,
      facts.firstSeenAt,
      facts.lastSeenAt,
      facts.verifiedAt,
    ],
  );
}

async function insertTargets(client: PoolClient, revisionId: string, item: RadarV4DeliveryItem) {
  const targets = [
    ...item.classification.targetCycleCodes.map((value) => ["cycle", value] as const),
    ...item.classification.moduleCodes.map((value) => ["module", value] as const),
    ...item.classification.topics.map((value) => ["topic", value] as const),
    ...item.classification.skills.map((value) => ["skill", value] as const),
  ];
  for (const [type, value] of targets) {
    await client.query(
      `INSERT INTO public.radar_content_targets (revision_id, target_type, target_value)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [revisionId, type, value],
    );
  }
}

async function persistAliases(
  client: PoolClient,
  entity: EntityRow,
  occurrence: OccurrenceRow,
  item: RadarV4DeliveryItem,
) {
  const aliases = [...item.identity.aliases];
  if (entity.entity_key !== item.identity.entityKey) {
    aliases.push({
      kind: "entity",
      key: item.identity.entityKey,
      sourceId: null,
      reason: "canonical-entity-key-transition",
    });
  }
  if (occurrence.source_id !== item.source.id || occurrence.occurrence_key !== item.identity.occurrenceKey) {
    aliases.push({
      kind: "occurrence",
      key: item.identity.occurrenceKey,
      sourceId: item.source.id,
      reason: "canonical-occurrence-key-transition",
    });
  }
  for (const alias of aliases) {
    const sourceId = alias.kind === "occurrence" ? (alias.sourceId ?? item.source.id) : null;
    const occurrenceId = alias.kind === "occurrence" ? occurrence.id : null;
    await client.query(
      `INSERT INTO public.radar_content_identity_aliases (
         alias_kind, source_id, alias_key, canonical_entity_id, canonical_occurrence_id, reason
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (alias_kind, (coalesce(source_id, '')), alias_key) DO NOTHING`,
      [alias.kind, sourceId, alias.key, entity.id, occurrenceId, alias.reason],
    );
    const stored = await client.query<{ canonical_entity_id: string; canonical_occurrence_id: string | null }>(
      `SELECT canonical_entity_id, canonical_occurrence_id
       FROM public.radar_content_identity_aliases
       WHERE alias_kind = $1 AND coalesce(source_id, '') = coalesce($2, '') AND alias_key = $3`,
      [alias.kind, sourceId, alias.key],
    );
    if (
      stored.rows[0]?.canonical_entity_id !== entity.id
      || stored.rows[0]?.canonical_occurrence_id !== occurrenceId
    ) {
      throw new RadarV4IdentityConflictError();
    }
  }
}

async function projectNews(
  client: PoolClient,
  occurrenceId: string,
  item: RadarV4DeliveryItem,
  facts: RadarV4Facts,
) {
  const existing = await client.query<{ legacy_radar_item_id: string | null }>(
    `SELECT legacy_radar_item_id::text FROM public.radar_content_occurrences WHERE id = $1 FOR UPDATE`,
    [occurrenceId],
  );
  const values = legacyNewsValues(item, facts);
  let radarItemId = existing.rows[0]?.legacy_radar_item_id ?? null;
  if (!radarItemId) {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO public.radar_items (
         schema_version, source_id, source_name, external_id, canonical_url, title, summary,
         published_at, fetched_at, expires_at, event_starts_at, event_ends_at,
         registration_url, registration_deadline, kind, locality, province,
         target_cycle_codes, module_codes, topics, matched_rule_ids, matched_keywords,
         trust_tier, review_status, reviewed_by, reviewed_at, review_reason, source_url,
         content_hash, destination, semantic_key, entity_key, occurrence_key
       ) VALUES (
         4, $1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $11, $12, $13,
         $14, $15, $16, $17, $18, $19, $20, $21, 'approved', $22, $23, $24,
         $25, $26, 'news', $27, $28, $29
       )
       ON CONFLICT (source_id, canonical_url) DO UPDATE SET
         entity_key = excluded.entity_key, occurrence_key = excluded.occurrence_key
       RETURNING id::text`,
      [item.source.id, ...values],
    );
    radarItemId = inserted.rows[0]?.id ?? null;
    if (!radarItemId) throw new Error("Radar v4 news projection did not return an id");
    await client.query(
      `UPDATE public.radar_content_occurrences SET legacy_radar_item_id = $2 WHERE id = $1`,
      [occurrenceId, radarItemId],
    );
  }
  await client.query(
    `UPDATE public.radar_items SET
       schema_version = 4, source_name = $1, external_id = $2, canonical_url = $3,
       title = $4, summary = $5, published_at = $6, fetched_at = $7,
       event_starts_at = $8, event_ends_at = $9, registration_url = $10,
       registration_deadline = $11, kind = $12, locality = $13, province = $14,
       target_cycle_codes = $15, module_codes = $16, topics = $17,
       matched_rule_ids = $18, matched_keywords = $19, trust_tier = $20,
       reviewed_by = $21, reviewed_at = $22, review_reason = $23,
       source_url = $24, content_hash = $25, destination = 'news', semantic_key = $26,
       entity_key = $27, occurrence_key = $28
     WHERE id = $29`,
    [...values, radarItemId],
  );
}

function legacyNewsValues(item: RadarV4DeliveryItem, facts: RadarV4Facts): unknown[] {
  return [
    item.source.name,
    item.source.externalId,
    item.source.canonicalUrl,
    facts.title,
    facts.summaryShort ?? "",
    item.source.publishedAt,
    item.source.verifiedAt,
    facts.startsAt,
    facts.endsAt,
    facts.registrationUrl,
    facts.registrationDeadline,
    item.classification.kind === "legal" ? "legal" : "news",
    facts.municipality,
    facts.province,
    item.classification.targetCycleCodes,
    item.classification.moduleCodes,
    item.classification.topics,
    item.publication.reasonCodes,
    item.classification.topics,
    item.source.trustTier,
    item.publication.decidedBy,
    item.publication.decidedAt,
    item.publication.rationale,
    item.source.primaryEvidenceUrl,
    item.identity.materialFingerprint,
    item.identity.legacySemanticKey ?? item.identity.entityKey,
    item.identity.entityKey,
    item.identity.occurrenceKey,
  ];
}

async function projectCatalogue(
  client: PoolClient,
  occurrenceId: string,
  item: RadarV4DeliveryItem,
  facts: RadarV4Facts,
) {
  const occurrence = await client.query<{ legacy_fp_content_item_id: string | null }>(
    `SELECT legacy_fp_content_item_id::text FROM public.radar_content_occurrences WHERE id = $1 FOR UPDATE`,
    [occurrenceId],
  );
  let contentId = occurrence.rows[0]?.legacy_fp_content_item_id ?? null;
  if (!contentId && item.identity.legacySemanticKey) {
    const legacy = await client.query<{ id: string }>(
      `SELECT id::text FROM public.fp_content_items WHERE radar_semantic_key = $1 LIMIT 1`,
      [item.identity.legacySemanticKey],
    );
    contentId = legacy.rows[0]?.id ?? null;
  }

  const status = legacyLifecycleStatus(facts.sourceLifecycleStatus);
  const type = legacyContentType(item.classification.opportunityType);
  const cost = facts.priceState === "free"
    ? "Gratis"
    : facts.priceState === "paid" && facts.priceAmountMinor !== null && facts.priceCurrency
      ? new Intl.NumberFormat("es-ES", { style: "currency", currency: facts.priceCurrency }).format(facts.priceAmountMinor / 100)
      : null;
  const tags = [...new Set([
    ...item.classification.topics,
    ...item.classification.moduleCodes,
    ...item.classification.skills,
  ])];
  const values = [
    type,
    facts.title,
    facts.summaryShort ?? "",
    facts.provider ?? facts.organizer,
    facts.attendanceMode,
    facts.municipality ?? facts.venue,
    facts.province,
    facts.startsAt,
    facts.endsAt ?? facts.registrationDeadline,
    status,
    cost,
    facts.certification,
    item.source.canonicalUrl,
    tags,
    item.source.verifiedAt,
    String(new Date(item.source.publishedAt ?? item.source.verifiedAt).getUTCFullYear()),
    item.identity.legacySemanticKey ?? item.identity.occurrenceKey,
    item.identity.entityKey,
    item.identity.occurrenceKey,
  ];

  if (contentId) {
    await client.query(
      `UPDATE public.fp_content_items SET
         type = $1, title = $2, description = $3, entity = $4,
         delivery_mode = $5, location = $6, province = $7,
         start_date = $8::timestamptz::date, end_date = $9::timestamptz::date,
         status = $10, cost = $11, certification = $12, source_url = $13,
         tags = $14, suggested_action = NULL, last_reviewed_at = $15::timestamptz::date,
         notes = NULL, source_year = $16, radar_semantic_key = $17,
         radar_entity_key = $18, radar_occurrence_key = $19, updated_at = now()
       WHERE id = $20`,
      [...values, contentId],
    );
  } else {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO public.fp_content_items (
         id_slug, type, title, description, entity, delivery_mode, location, province,
         start_date, end_date, status, cost, certification, source_url, tags,
         suggested_action, last_reviewed_at, notes, source_year, radar_semantic_key,
         radar_entity_key, radar_occurrence_key
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz::date,
         $10::timestamptz::date, $11, $12, $13, $14, $15, NULL,
         $16::timestamptz::date, NULL, $17, $18, $19, $20
       ) RETURNING id::text`,
      [`radar-v4-${item.identity.occurrenceKey.slice(0, 32)}`, ...values],
    );
    contentId = inserted.rows[0]?.id ?? null;
    if (!contentId) throw new Error("Radar v4 catalogue projection did not return an id");
  }

  await client.query(
    `UPDATE public.radar_content_occurrences SET legacy_fp_content_item_id = $2 WHERE id = $1`,
    [occurrenceId, contentId],
  );
  const ranking = legacyRanking(item.publication.rankingPriority);
  for (const cycleCode of item.classification.targetCycleCodes) {
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
        ranking.priority,
        ranking.fitScore,
      ],
    );
  }
}

function projectionSkipReason(
  item: RadarV4DeliveryItem,
  decision: "accepted" | "rejected" | "quarantined",
  enabled: Set<"news" | "course" | "event" | "job">,
): string | null {
  if (decision !== "accepted") return decision === "quarantined" ? "unresolved_evidence_conflict" : "publication_not_accepted";
  if (!enabled.has(item.classification.destination)) return "feature_disabled";
  return null;
}

function legacyContentType(opportunityType: RadarV4DeliveryItem["classification"]["opportunityType"]) {
  if (opportunityType === "hackathon") return "hackathon";
  if (["challenge", "competition"].includes(opportunityType)) return "reto";
  if (["scholarship", "grant"].includes(opportunityType)) return "beca";
  if (opportunityType === "call") return "convocatoria_practicas";
  if (["course", "workshop", "webinar", "seminar", "masterclass"].includes(opportunityType)) {
    return "curso_complementario";
  }
  return "evento";
}

async function linkDeliveryRevision(client: PoolClient, deliveryId: string, revisionId: string) {
  await client.query(
    `INSERT INTO public.radar_delivery_revisions (delivery_id, revision_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [deliveryId, revisionId],
  );
}

async function recordProjectorEvent(
  client: PoolClient,
  deliveryId: string,
  revisionId: string,
  projector: "canonical" | "legacy_news" | "legacy_fp_catalogue" | "verified_job",
  status: "projected" | "skipped" | "conflict" | "failed",
  reasonCode: string | null,
) {
  await client.query(
    `INSERT INTO public.radar_projector_events (
       delivery_id, revision_id, projector, status, reason_code
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (delivery_id, revision_id, projector) DO UPDATE SET
       status = excluded.status, reason_code = excluded.reason_code, occurred_at = now()`,
    [deliveryId, revisionId, projector, status, reasonCode],
  );
}

function emptyFactValue(field: RadarV4FactField): unknown {
  return ARRAY_FACT_FIELDS.has(field) ? [] : null;
}

export class RadarV4RevisionConflictError extends Error {
  constructor() {
    super("Radar v4 revision identity conflicts with an existing immutable revision");
    this.name = "RadarV4RevisionConflictError";
  }
}

export class RadarV4IdentityConflictError extends Error {
  constructor() {
    super("Radar v4 identity alias conflicts with an existing canonical identity");
    this.name = "RadarV4IdentityConflictError";
  }
}
