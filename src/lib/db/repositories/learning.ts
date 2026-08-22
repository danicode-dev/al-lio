import "server-only";

import { query } from "@/lib/db/pool";
import type {
  DbFpLearningCompetency,
  DbFpLearningNote,
  DbFpLearningResource,
  DbFpUserLearningState,
  FpCycleCode,
  FpLearningStatus,
} from "@/lib/db/types";

export type LearningCompetencySummary = DbFpLearningCompetency & {
  resource_count: number;
  started_count: number;
  completed_count: number;
  next_resource_slug: string | null;
};

export type LearningResourceWithState = DbFpLearningResource & {
  status: FpLearningStatus | null;
  last_position_seconds: number;
  saved_duration_seconds: number | null;
  completed_at: string | null;
};

export type LearningCompetencyDetail = DbFpLearningCompetency & {
  resources: LearningResourceWithState[];
};

export type LearningResourceDetail = LearningResourceWithState & {
  competency_slug: string;
  competency_title: string;
  cycle_code: FpCycleCode;
};

export type LearningNotebookCourse = {
  resource_id: string;
  resource_slug: string;
  resource_title: string;
  provider: string;
  competency_title: string;
  last_position_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
};

export type LearningNotebookNote = DbFpLearningNote & {
  resource_slug: string;
  resource_title: string;
  provider: string;
  competency_title: string | null;
  is_available: boolean;
};

export type LearningNotebookSummary = {
  inProgress: LearningNotebookCourse[];
  recentNotes: LearningNotebookNote[];
};

export async function getLearningCompetenciesForCycle(userId: string, cycleCode: FpCycleCode): Promise<LearningCompetencySummary[]> {
  const result = await query<LearningCompetencySummary>(
    `SELECT competency.*,
       count(resource.id)::int as resource_count,
       count(state.resource_id) filter (where state.status = 'started')::int as started_count,
       count(state.resource_id) filter (where state.status = 'completed')::int as completed_count,
       (array_agg(resource.slug order by
          case when state.status = 'started' then 0 when state.status is null then 1 else 2 end,
          link.sort_order
        ) filter (where state.status is distinct from 'completed'))[1] as next_resource_slug
     FROM public.fp_learning_competencies competency
     JOIN public.fp_learning_competency_resources link ON link.competency_id=competency.id
     JOIN public.fp_learning_resources resource ON resource.id=link.resource_id AND resource.is_active=true
     LEFT JOIN public.fp_user_learning_state state ON state.resource_id=resource.id AND state.user_id=$1
     WHERE competency.cycle_code=$2 AND competency.is_active=true
     GROUP BY competency.id
     ORDER BY competency.sort_order`,
    [userId, cycleCode],
  );
  return result.rows;
}

export async function getLearningCompetencyForCycle(userId: string, cycleCode: FpCycleCode, slug: string): Promise<LearningCompetencyDetail | null> {
  const competencyResult = await query<DbFpLearningCompetency>(
    `SELECT * FROM public.fp_learning_competencies
     WHERE cycle_code=$1 AND slug=$2 AND is_active=true LIMIT 1`,
    [cycleCode, slug],
  );
  const competency = competencyResult.rows[0];
  if (!competency) return null;

  const resourcesResult = await query<LearningResourceWithState>(
    `SELECT resource.*, state.status,
       coalesce(state.last_position_seconds, 0)::int as last_position_seconds,
       state.duration_seconds as saved_duration_seconds,
       state.completed_at
     FROM public.fp_learning_competency_resources link
     JOIN public.fp_learning_resources resource ON resource.id=link.resource_id
     LEFT JOIN public.fp_user_learning_state state ON state.resource_id=resource.id AND state.user_id=$1
     WHERE link.competency_id=$2 AND resource.is_active=true AND resource.language='es'
     ORDER BY link.sort_order`,
    [userId, competency.id],
  );
  return { ...competency, resources: resourcesResult.rows };
}

export async function getLearningResourceForCycle(userId: string, cycleCode: FpCycleCode, slug: string): Promise<LearningResourceDetail | null> {
  const result = await query<LearningResourceDetail>(
    `SELECT resource.*, competency.slug as competency_slug, competency.title as competency_title,
       competency.cycle_code, state.status,
       coalesce(state.last_position_seconds, 0)::int as last_position_seconds,
       state.duration_seconds as saved_duration_seconds,
       state.completed_at
     FROM public.fp_learning_resources resource
     JOIN public.fp_learning_competency_resources link ON link.resource_id=resource.id
     JOIN public.fp_learning_competencies competency ON competency.id=link.competency_id
     LEFT JOIN public.fp_user_learning_state state ON state.resource_id=resource.id AND state.user_id=$1
     WHERE resource.slug=$2 AND competency.cycle_code=$3
       AND resource.is_active=true AND competency.is_active=true AND resource.language='es'
     ORDER BY competency.sort_order, link.sort_order
     LIMIT 1`,
    [userId, slug, cycleCode],
  );
  return result.rows[0] ?? null;
}

export async function getLearningNotes(userId: string, resourceId: string): Promise<DbFpLearningNote[]> {
  const result = await query<DbFpLearningNote>(
    `SELECT * FROM public.fp_learning_notes
     WHERE user_id=$1 AND resource_id=$2
     ORDER BY timestamp_seconds, created_at`,
    [userId, resourceId],
  );
  return result.rows;
}

export async function getLearningNotebookSummary(
  userId: string,
  cycleCode: FpCycleCode,
): Promise<LearningNotebookSummary> {
  const [coursesResult, notesResult] = await Promise.all([
    query<LearningNotebookCourse>(
      `WITH current_courses AS (
         SELECT DISTINCT ON (state.resource_id)
           state.resource_id,
           resource.slug as resource_slug,
           resource.title as resource_title,
           resource.provider,
           competency.title as competency_title,
           state.last_position_seconds,
           state.duration_seconds,
           state.updated_at
         FROM public.fp_user_learning_state state
         JOIN public.fp_learning_resources resource
           ON resource.id=state.resource_id AND resource.is_active=true AND resource.language='es'
         JOIN public.fp_learning_competency_resources link ON link.resource_id=resource.id
         JOIN public.fp_learning_competencies competency
           ON competency.id=link.competency_id AND competency.is_active=true AND competency.cycle_code=$2
         WHERE state.user_id=$1 AND state.status='started'
         ORDER BY state.resource_id, competency.sort_order, link.sort_order
       )
       SELECT * FROM current_courses
       ORDER BY updated_at DESC
       LIMIT 4`,
      [userId, cycleCode],
    ),
    query<LearningNotebookNote>(
      `SELECT note.*,
         resource.slug as resource_slug,
         resource.title as resource_title,
         resource.provider,
         current_competency.competency_title,
         (resource.is_active AND current_competency.competency_title IS NOT NULL) as is_available
       FROM public.fp_learning_notes note
       JOIN public.fp_learning_resources resource ON resource.id=note.resource_id
       LEFT JOIN LATERAL (
         SELECT competency.title as competency_title
         FROM public.fp_learning_competency_resources link
         JOIN public.fp_learning_competencies competency ON competency.id=link.competency_id
         WHERE link.resource_id=resource.id
           AND competency.cycle_code=$2
           AND competency.is_active=true
         ORDER BY competency.sort_order, link.sort_order
         LIMIT 1
       ) current_competency ON true
       WHERE note.user_id=$1
       ORDER BY note.updated_at DESC
       LIMIT 6`,
      [userId, cycleCode],
    ),
  ]);

  return { inProgress: coursesResult.rows, recentNotes: notesResult.rows };
}

export async function addLearningNote(userId: string, resourceId: string, timestampSeconds: number, body: string): Promise<DbFpLearningNote> {
  const result = await query<DbFpLearningNote>(
    `INSERT INTO public.fp_learning_notes(user_id, resource_id, timestamp_seconds, body)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [userId, resourceId, timestampSeconds, body],
  );
  return result.rows[0];
}

export async function upsertLearningProgress(
  userId: string,
  resourceId: string,
  input: { status: FpLearningStatus; lastPositionSeconds: number; durationSeconds: number | null },
): Promise<DbFpUserLearningState> {
  const result = await query<DbFpUserLearningState>(
    `INSERT INTO public.fp_user_learning_state
       (user_id, resource_id, status, last_position_seconds, duration_seconds, completed_at)
     VALUES ($1,$2,$3,$4,$5,case when $3='completed' then now() else null end)
     ON CONFLICT (user_id, resource_id) DO UPDATE SET
       status=excluded.status,
       last_position_seconds=excluded.last_position_seconds,
       duration_seconds=coalesce(excluded.duration_seconds, fp_user_learning_state.duration_seconds),
       completed_at=case when excluded.status='completed' then coalesce(fp_user_learning_state.completed_at, now()) else null end
     RETURNING *`,
    [userId, resourceId, input.status, input.lastPositionSeconds, input.durationSeconds],
  );
  return result.rows[0];
}
