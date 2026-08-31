import "server-only";
// Learning catalogue persistence is owned by the Learning feature.
import { query } from "@/lib/db/pool";
import type {
  DbFpContentItem,
  DbCanonicalOpportunityFacts,
  DbFpCycle,
  DbFpCycleSkill,
  DbFpLearningResource,
  DbFpSkill,
  DbFpUserCompetencyState,
  DbFpUserContentState,
  DbProfile,
  FpAcademicYear,
  FpCycleCode,
  FpCycleGroup,
  FpItemCompetencyRelation,
  FpLearningCompletionMethod,
  FpLearningResourceRole,
  FpLearningStatus,
} from "@/lib/db/types";

export type FpCatalogContentRow = DbFpContentItem & DbCanonicalOpportunityFacts & {
  cycle_code: FpCycleCode;
  cycle_group: FpCycleGroup;
  priority: "Alta" | "Media" | "Baja";
  fit_score: number;
  audience_year: FpAcademicYear | null;
  user_status: DbFpUserContentState["status"] | null;
  is_favorite: boolean;
  user_notes: string | null;
  user_completed_at: string | null;
};

export async function getFpContentItemBySlug(idSlug: string): Promise<DbFpContentItem | null> {
  const res = await query<DbFpContentItem>(
    `SELECT * FROM public.fp_content_items WHERE id_slug = $1 LIMIT 1`,
    [idSlug]
  );
  return res.rows[0] ?? null;
}

export async function getFpContentItemBySlugForCycle(
  idSlug: string,
  cycleCode: FpCycleCode,
): Promise<DbFpContentItem | null> {
  const res = await query<DbFpContentItem>(
    `SELECT item.*
     FROM public.fp_content_items item
     INNER JOIN public.fp_content_cycle_fit fit ON fit.content_item_id = item.id
     WHERE item.id_slug = $1 AND fit.cycle_code = $2
     LIMIT 1`,
    [idSlug, cycleCode],
  );
  return res.rows[0] ?? null;
}

export async function getActiveFpCycles(): Promise<DbFpCycle[]> {
  const res = await query<DbFpCycle>(
    `SELECT *
     FROM public.fp_cycles
     WHERE is_active = true
     ORDER BY sort_order ASC, code ASC`
  );
  return res.rows;
}

export async function getFpContentForProfile(
  userId: string,
  profile: Pick<DbProfile, "cycle_code" | "cycle_group" | "academic_year">,
  options: { includeVolatile?: boolean } = {}
): Promise<FpCatalogContentRow[]> {
  if (!profile.cycle_code || !profile.cycle_group) return [];

  const values: unknown[] = [userId, profile.cycle_group, profile.cycle_code];
  const filters = ["fit.cycle_group = $2", "fit.cycle_code = $3"];
  const verifiedOnly = process.env.AL_LIO_VERIFIED_OPPORTUNITIES_ONLY?.trim().toLowerCase() === "true";

  if (profile.academic_year) {
    values.push(profile.academic_year);
    filters.push(`(fit.audience_year is null or fit.audience_year = $${values.length})`);
  }

  if (!options.includeVolatile) {
    filters.push("item.type <> 'empleo_busqueda'");
  }

  if (verifiedOnly) {
    filters.push("canonical.id is not null");
    filters.push("canonical.publication_decision = 'accepted'");
    filters.push("entity.destination in ('course', 'event')");
    filters.push(`(
      state.status in ('saved', 'started', 'completed')
      or canonical.source_lifecycle_status in ('announced', 'registration_open', 'ongoing', 'evergreen', 'postponed')
      or (
        entity.destination = 'course'
        and canonical.source_lifecycle_status is null
        and coalesce(
          canonical.registration_deadline,
          canonical.ends_at,
          canonical.starts_at
        ) >= now()
      )
      or (
        entity.destination = 'event'
        and canonical.source_lifecycle_status is null
        and canonical.starts_at is not null
        and coalesce(canonical.ends_at, canonical.starts_at) >= now()
        and (
          canonical.registration_deadline is null
          or canonical.registration_deadline >= now()
        )
      )
    )`);
    filters.push(`(
      entity.destination <> 'event'
      or (
        canonical.starts_at is not null
        and coalesce(canonical.ends_at, canonical.starts_at) >= now()
      )
    )`);
  }

  const res = await query<FpCatalogContentRow>(
    `SELECT
       item.*,
       fit.cycle_code,
       fit.cycle_group,
       fit.priority,
       fit.fit_score,
       fit.audience_year,
       state.status as user_status,
       coalesce(state.is_favorite, false) as is_favorite,
       state.notes as user_notes,
       state.completed_at as user_completed_at,
       canonical.id::text as canonical_occurrence_id,
       entity.destination as canonical_destination,
       entity.opportunity_type as canonical_opportunity_type,
       canonical.title as canonical_title,
       canonical.summary_short as canonical_summary_short,
       canonical.summary_expanded as canonical_summary_expanded,
       canonical.about_summary as canonical_about_summary,
       canonical.organizer as canonical_organizer,
       canonical.provider as canonical_provider,
       canonical.canonical_url,
       canonical.registration_url as canonical_registration_url,
       canonical.starts_at as canonical_starts_at,
       canonical.ends_at as canonical_ends_at,
       canonical.registration_opens_at as canonical_registration_opens_at,
       canonical.registration_deadline as canonical_registration_deadline,
       canonical.attendance_mode as canonical_attendance_mode,
       canonical.country as canonical_country,
       canonical.autonomous_community as canonical_autonomous_community,
       canonical.province as canonical_province,
       canonical.municipality as canonical_municipality,
       canonical.venue as canonical_venue,
       canonical.address as canonical_address,
       canonical.duration_hours::float8 as canonical_duration_hours,
       canonical.course_difficulty as canonical_course_difficulty,
       canonical.minimum_education as canonical_minimum_education,
       canonical.other_eligibility as canonical_other_eligibility,
       canonical.credential_level as canonical_credential_level,
       canonical.price_state as canonical_price_state,
       canonical.price_amount_minor as canonical_price_amount_minor,
       canonical.price_currency as canonical_price_currency,
       canonical.certification as canonical_certification,
       canonical.prize as canonical_prize,
       canonical.requirements as canonical_requirements,
       canonical.audience as canonical_audience,
       canonical.learning_outcomes as canonical_learning_outcomes,
       canonical.skills_tested as canonical_skills_tested,
       canonical.preparation_tips as canonical_preparation_tips,
       canonical.source_lifecycle_status as canonical_source_lifecycle_status,
       canonical.source_verified_at as canonical_source_verified_at
     FROM public.fp_content_items item
     INNER JOIN public.fp_content_cycle_fit fit
       ON fit.content_item_id = item.id
    LEFT JOIN public.fp_user_content_state state
       ON state.content_item_id = item.id
      AND state.user_id = $1
    LEFT JOIN public.radar_content_occurrences canonical
      ON canonical.legacy_fp_content_item_id = item.id
    LEFT JOIN public.radar_content_entities entity
      ON entity.id = canonical.entity_id
     WHERE ${filters.join(" AND ")}
     ORDER BY
       case fit.priority when 'Alta' then 0 when 'Media' then 1 else 2 end,
       fit.fit_score DESC,
       item.start_date ASC NULLS LAST,
       item.title ASC`,
    values
  );

  return res.rows;
}

// All skills for a cycle ordered by their position in the complete learning
// path, not only those required by one hackathon. This powers the Roadmap and
// hackathon preparation paths.
export type CycleSkill = DbFpSkill & Omit<DbFpCycleSkill, "skill_id" | "created_at" | "updated_at">;

export async function getCycleSkills(cycleCode: FpCycleCode): Promise<CycleSkill[]> {
  const res = await query<CycleSkill>(
    `SELECT skill.*, cs.cycle_code, cs.orden_global, cs.etapa, cs.bloque, cs.modulo_codigo,
            cs.modulo_nombre, cs.nivel_objetivo, cs.obligatoria_roadmap_base,
            cs.basico_antes_de_empezar, cs.prerrequisito_texto
     FROM public.fp_cycle_skills cs
     INNER JOIN public.fp_skills skill ON skill.id = cs.skill_id
     WHERE cs.cycle_code = $1
     ORDER BY cs.orden_global ASC`,
    [cycleCode]
  );
  return res.rows;
}

// A module is common when its code appears in two or more distinct cycle
// families, not merely two cycles. DAM and DAW share technical modules because
// both belong to DEV, so those modules remain cycle-specific. A transversal
// module spans distinct families such as DEV, AF, TSAF and MP.
export async function getSharedModuleCodes(): Promise<Set<string>> {
  const res = await query<{ modulo_codigo: string }>(
    `SELECT cs.modulo_codigo
     FROM public.fp_cycle_skills cs
     INNER JOIN public.fp_cycles cy ON cy.code = cs.cycle_code
     WHERE cs.modulo_codigo IS NOT NULL
     GROUP BY cs.modulo_codigo
     HAVING COUNT(DISTINCT cy.group_code) >= 2`
  );
  return new Set(res.rows.map((row) => row.modulo_codigo));
}

// content_item_id and relationship fields extend the canonical DbFpSkill. The
// RequiredCompetency client name remains for compatibility with existing UI
// contracts.
export type RequiredCompetency = DbFpSkill & {
  content_item_id: string;
  obligatoria_para_item: boolean;
  orden_preparacion: number | null;
};

export async function getRequiredCompetenciesForItems(contentItemIds: string[]): Promise<Map<string, RequiredCompetency[]>> {
  const map = new Map<string, RequiredCompetency[]>();
  if (contentItemIds.length === 0) return map;

  const res = await query<RequiredCompetency>(
    `SELECT link.content_item_id, skill.*, link.obligatoria_para_item, link.orden_preparacion
     FROM public.fp_item_competencies link
     INNER JOIN public.fp_skills skill ON skill.id = link.skill_id
     WHERE link.content_item_id = ANY($1) AND link.tipo_relacion = 'requiere'
     ORDER BY link.obligatoria_para_item DESC, link.orden_preparacion ASC NULLS LAST`,
    [contentItemIds]
  );

  for (const row of res.rows) {
    const list = map.get(row.content_item_id) ?? [];
    list.push(row);
    map.set(row.content_item_id, list);
  }

  return map;
}

export type CourseAptitude = DbFpSkill & {
  content_item_id: string;
  tipo_relacion: Extract<FpItemCompetencyRelation, "ensena" | "demuestra">;
};

// Course-like catalogue items already carry reviewed `ensena`/`demuestra`
// relationships in fp_item_competencies. Keep this separate from event
// requirements so a skill taught by a course is never presented as an entry
// requirement for that same course.
export async function getCourseAptitudesForItems(contentItemIds: string[]): Promise<Map<string, CourseAptitude[]>> {
  const map = new Map<string, CourseAptitude[]>();
  if (contentItemIds.length === 0) return map;

  const res = await query<CourseAptitude>(
    `SELECT link.content_item_id, skill.*, link.tipo_relacion
     FROM public.fp_item_competencies link
     INNER JOIN public.fp_skills skill ON skill.id = link.skill_id
     WHERE link.content_item_id = ANY($1)
       AND link.tipo_relacion IN ('ensena', 'demuestra')
     ORDER BY link.orden_preparacion ASC NULLS LAST, skill.titulo ASC`,
    [contentItemIds]
  );

  for (const row of res.rows) {
    const list = map.get(row.content_item_id) ?? [];
    list.push(row);
    map.set(row.content_item_id, list);
  }

  return map;
}

export type CompetencyLearningItem = {
  skill_id: string;
  id: string;
  id_slug: string;
  title: string;
  type: string;
  source_url: string;
  video_url: string | null;
  tipo_relacion: FpItemCompetencyRelation;
};

export type PreparationResource = DbFpLearningResource & {
  skill_id: string;
  role: FpLearningResourceRole;
  coverage_percent: number | null;
  mapping_rationale: string;
  mapping_verified_at: string;
  user_status: FpLearningStatus | null;
  completion_method: FpLearningCompletionMethod | null;
  last_position_seconds: number;
  saved_duration_seconds: number | null;
};

/**
 * Exact, approved preparation resources only. Legacy fp_content_items videos
 * and candidate mappings never enter this query. User progress is joined with
 * the authenticated user ID supplied by the server-side store loader.
 */
export async function getPreparationResourcesForCompetencies(
  userId: string,
  skillIds: string[],
  cycleCode: FpCycleCode,
  perSkillLimit = 3,
): Promise<Map<string, PreparationResource[]>> {
  const map = new Map<string, PreparationResource[]>();
  if (skillIds.length === 0) return map;

  const res = await query<PreparationResource>(
    `SELECT mapping.skill_id, resource.*, mapping.role, mapping.coverage_percent,
            mapping.mapping_rationale, mapping.verified_at as mapping_verified_at,
            state.status as user_status, state.completion_method,
            coalesce(state.last_position_seconds, 0)::int as last_position_seconds,
            state.duration_seconds as saved_duration_seconds
     FROM public.fp_skill_learning_resources mapping
     INNER JOIN public.fp_learning_resources resource ON resource.id = mapping.resource_id
     LEFT JOIN public.fp_user_learning_state state
       ON state.resource_id = resource.id AND state.user_id = $1
     WHERE mapping.skill_id = ANY($2)
       AND mapping.cycle_code = $3
       AND mapping.publication_state = 'approved'
       AND resource.publication_state = 'approved'
       AND resource.availability_state = 'available'
       AND resource.is_active = true
       AND resource.language = 'es'
       AND resource.deep_link IS NOT NULL
     ORDER BY mapping.skill_id,
       case mapping.role when 'primary' then 0 when 'alternative' then 1 else 2 end,
       mapping.sort_order, resource.title`,
    [userId, skillIds, cycleCode],
  );

  for (const row of res.rows) {
    const resources = map.get(row.skill_id) ?? [];
    if (resources.length < perSkillLimit) resources.push(row);
    map.set(row.skill_id, resources);
  }
  return map;
}

// Return only resources that teach the skill (tipo_relacion = 'ensena'). Items
// that require it ('requiere') or demonstrate it ('demuestra') do not belong in
// the student's "resources for learning this" list.
export async function getLearningItemsForCompetencies(
  skillIds: string[],
  cycleCode: FpCycleCode,
  perSkillLimit = 3
): Promise<Map<string, CompetencyLearningItem[]>> {
  const map = new Map<string, CompetencyLearningItem[]>();
  if (skillIds.length === 0) return map;

  const res = await query<CompetencyLearningItem>(
    `SELECT DISTINCT link.skill_id, item.id, item.id_slug, item.title, item.type, item.source_url, item.video_url, link.tipo_relacion
     FROM public.fp_item_competencies link
     INNER JOIN public.fp_content_items item ON item.id = link.content_item_id
     INNER JOIN public.fp_content_cycle_fit fit ON fit.content_item_id = item.id
     WHERE link.skill_id = ANY($1)
       AND link.tipo_relacion = 'ensena'
       AND fit.cycle_code = $2
     ORDER BY link.skill_id`,
    [skillIds, cycleCode]
  );

  for (const row of res.rows) {
    const list = map.get(row.skill_id) ?? [];
    if (list.length < perSkillLimit) list.push(row);
    map.set(row.skill_id, list);
  }

  return map;
}

export type ActiveCompetencyVideoCandidate = {
  id: string;
  id_slug: string;
  title: string;
  video_url: string;
};

// Dedicated, stricter query for the legacy /ruta/[slug] redirect resolver
// (issue #112). Deliberately separate from getLearningItemsForCompetencies
// above (shared with the Roadmap/aptitude-modal data path) rather than
// adding a status filter there - a redirect must never target an inactive
// resource, but the modal's own display rules are out of scope for this
// change and must not shift as a side effect.
export async function getActiveVideoResourcesForCompetency(
  competencyId: string,
  cycleCode: FpCycleCode
): Promise<ActiveCompetencyVideoCandidate[]> {
  const res = await query<ActiveCompetencyVideoCandidate>(
    `SELECT DISTINCT item.id, item.id_slug, item.title, item.video_url
     FROM public.fp_item_competencies link
     INNER JOIN public.fp_content_items item ON item.id = link.content_item_id
     INNER JOIN public.fp_content_cycle_fit fit ON fit.content_item_id = item.id
     WHERE link.skill_id = $1
       AND link.tipo_relacion = 'ensena'
       AND fit.cycle_code = $2
       AND item.status = 'activo'
       AND item.video_url IS NOT NULL
     ORDER BY item.id_slug`,
    [competencyId, cycleCode]
  );
  return res.rows;
}

export async function getUserContentState(
  userId: string,
  contentItemId: string
): Promise<DbFpUserContentState | null> {
  const res = await query<DbFpUserContentState>(
    `SELECT * FROM public.fp_user_content_state WHERE user_id = $1 AND content_item_id = $2 LIMIT 1`,
    [userId, contentItemId]
  );
  return res.rows[0] ?? null;
}

export async function getUserContentStatesForItems(
  userId: string,
  contentItemIds: string[]
): Promise<Map<string, DbFpUserContentState["status"]>> {
  const map = new Map<string, DbFpUserContentState["status"]>();
  if (contentItemIds.length === 0) return map;

  const res = await query<Pick<DbFpUserContentState, "content_item_id" | "status">>(
    `SELECT content_item_id, status FROM public.fp_user_content_state WHERE user_id = $1 AND content_item_id = ANY($2)`,
    [userId, contentItemIds]
  );

  for (const row of res.rows) {
    map.set(row.content_item_id, row.status);
  }

  return map;
}

export async function getFpUserContentStateCounts(userId: string): Promise<Record<string, number>> {
  const res = await query<{ status: DbFpUserContentState["status"]; count: string }>(
    `SELECT status, count(*) as count
     FROM public.fp_user_content_state
     WHERE user_id = $1
     GROUP BY status`,
    [userId]
  );
  return Object.fromEntries(res.rows.map((row) => [row.status, Number(row.count)]));
}

export async function upsertFpUserContentState(
  userId: string,
  contentItemId: string,
  data: Partial<Pick<DbFpUserContentState, "status" | "is_favorite" | "notes" | "reminder_at" | "completed_at">>
): Promise<DbFpUserContentState> {
  const shouldUpdate = (key: keyof typeof data) => Object.prototype.hasOwnProperty.call(data, key);
  const updateSets = [
    shouldUpdate("status") ? "status = excluded.status" : null,
    shouldUpdate("is_favorite") ? "is_favorite = excluded.is_favorite" : null,
    shouldUpdate("notes") ? "notes = excluded.notes" : null,
    shouldUpdate("reminder_at") ? "reminder_at = excluded.reminder_at" : null,
    shouldUpdate("completed_at") ? "completed_at = excluded.completed_at" : null,
    "updated_at = now()",
  ].filter(Boolean);

  const res = await query<DbFpUserContentState>(
    `INSERT INTO public.fp_user_content_state
       (user_id, content_item_id, status, is_favorite, notes, reminder_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, content_item_id) DO UPDATE SET
       ${updateSets.join(", ")}
     RETURNING *`,
    [
      userId,
      contentItemId,
      data.status ?? "saved",
      data.is_favorite ?? false,
      data.notes ?? null,
      data.reminder_at ?? null,
      data.completed_at ?? null,
    ]
  );
  return res.rows[0];
}

// Single-row lookup for authorizing a skill against the caller's cycle,
// mirroring getFpContentItemBySlugForCycle's shape rather than fetching the
// full cycle skill list and filtering in JS.
export async function getCycleSkillById(cycleCode: FpCycleCode, skillId: string): Promise<DbFpSkill | null> {
  const res = await query<DbFpSkill>(
    `SELECT skill.* FROM public.fp_cycle_skills cs
     INNER JOIN public.fp_skills skill ON skill.id = cs.skill_id
     WHERE cs.cycle_code = $1 AND cs.skill_id = $2
     LIMIT 1`,
    [cycleCode, skillId]
  );
  return res.rows[0] ?? null;
}

export async function getUserCompetencyStatesForSkills(
  userId: string,
  skillIds: string[],
): Promise<Map<string, DbFpUserCompetencyState>> {
  if (skillIds.length === 0) return new Map();

  const res = await query<DbFpUserCompetencyState>(
    `SELECT * FROM public.fp_user_competency_state WHERE user_id = $1 AND skill_id = ANY($2)`,
    [userId, skillIds]
  );
  return new Map(res.rows.map((row) => [row.skill_id, row]));
}

export async function markUserCompetencyCompleted(userId: string, skillId: string): Promise<DbFpUserCompetencyState> {
  const res = await query<DbFpUserCompetencyState>(
    `INSERT INTO public.fp_user_competency_state (user_id, skill_id, completion_method, evidence_resource_id)
     VALUES ($1, $2, 'self_declared', null)
     ON CONFLICT (user_id, skill_id) DO UPDATE SET
       completed_at = now(), completion_method = 'self_declared',
       evidence_resource_id = null, updated_at = now()
     RETURNING *`,
    [userId, skillId]
  );
  return res.rows[0];
}
