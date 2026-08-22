import "server-only";
import { query } from "@/lib/db/pool";
import type {
  DbFpContentItem,
  DbFpCycle,
  DbFpCycleSkill,
  DbFpSkill,
  DbFpUserContentState,
  DbProfile,
  FpAcademicYear,
  FpCycleCode,
  FpCycleGroup,
  FpItemCompetencyRelation,
} from "@/lib/db/types";

export type FpCatalogContentRow = DbFpContentItem & {
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
  profile: Pick<DbProfile, "cycle_code" | "cycle_group" | "academic_year" | "interests">,
  options: { includeVolatile?: boolean } = {}
): Promise<FpCatalogContentRow[]> {
  if (!profile.cycle_code || !profile.cycle_group) return [];

  const values: unknown[] = [userId, profile.cycle_group, profile.cycle_code];
  const filters = ["fit.cycle_group = $2", "fit.cycle_code = $3"];

  if (profile.academic_year) {
    values.push(profile.academic_year);
    filters.push(`(fit.audience_year is null or fit.audience_year = $${values.length})`);
  }

  if (!options.includeVolatile) {
    filters.push("item.type <> 'empleo_busqueda'");
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
       state.completed_at as user_completed_at
     FROM public.fp_content_items item
     INNER JOIN public.fp_content_cycle_fit fit
       ON fit.content_item_id = item.id
     LEFT JOIN public.fp_user_content_state state
       ON state.content_item_id = item.id
      AND state.user_id = $1
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
