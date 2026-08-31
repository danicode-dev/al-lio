import "server-only";
// Learning progress and resource queries are feature-owned.

import { query, withTransaction } from "@/lib/db/pool";
import type {
  DbFpLearningCompetency,
  DbFpLearningNote,
  DbFpLearningResource,
  DbFpUserLearningState,
  FpCycleCode,
  FpLearningCompletionMethod,
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
  completion_method: FpLearningCompletionMethod | null;
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
  back_href: string;
};

type InternalLearningTargetRow = {
  youtube_url: string;
  slug: string;
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
    `SELECT candidate.* FROM (
       SELECT resource.*, competency.slug as competency_slug, competency.title as competency_title,
         competency.cycle_code, state.status, state.completion_method,
         coalesce(state.last_position_seconds, 0)::int as last_position_seconds,
         state.duration_seconds as saved_duration_seconds, state.completed_at,
         '/roadmap/' || competency.slug as back_href, 0 as access_priority,
         competency.sort_order, link.sort_order as resource_sort_order
       FROM public.fp_learning_resources resource
       JOIN public.fp_learning_competency_resources link ON link.resource_id=resource.id
       JOIN public.fp_learning_competencies competency ON competency.id=link.competency_id
       LEFT JOIN public.fp_user_learning_state state ON state.resource_id=resource.id AND state.user_id=$1
       WHERE resource.slug=$2 AND competency.cycle_code=$3
         AND resource.is_active=true AND competency.is_active=true AND resource.language='es'
       UNION ALL
       SELECT resource.*, skill.id as competency_slug, skill.titulo as competency_title,
         mapping.cycle_code, state.status, state.completion_method,
         coalesce(state.last_position_seconds, 0)::int as last_position_seconds,
         state.duration_seconds as saved_duration_seconds, state.completed_at,
         '/roadmap' as back_href, 1 as access_priority,
         mapping.sort_order, mapping.sort_order as resource_sort_order
       FROM public.fp_learning_resources resource
       JOIN public.fp_skill_learning_resources mapping ON mapping.resource_id=resource.id
       JOIN public.fp_skills skill ON skill.id=mapping.skill_id
       LEFT JOIN public.fp_user_learning_state state ON state.resource_id=resource.id AND state.user_id=$1
       WHERE resource.slug=$2 AND mapping.cycle_code=$3
         AND mapping.publication_state='approved'
         AND resource.publication_state='approved'
         AND resource.availability_state='available'
         AND resource.is_active=true AND resource.language='es'
     ) candidate
     ORDER BY candidate.access_priority, candidate.sort_order, candidate.resource_sort_order
     LIMIT 1`,
    [userId, slug, cycleCode],
  );
  return result.rows[0] ?? null;
}

export async function getInternalLearningTargetsForVideoUrls(
  videoUrls: string[],
  cycleCode: FpCycleCode,
): Promise<Map<string, string>> {
  const targets = new Map<string, string>();
  const uniqueUrls = [...new Set(videoUrls.filter(Boolean))];
  if (uniqueUrls.length === 0) return targets;

  const result = await query<InternalLearningTargetRow>(
    `SELECT DISTINCT ON (resource.youtube_url) resource.youtube_url, resource.slug
     FROM public.fp_learning_resources resource
     JOIN public.fp_learning_competency_resources link ON link.resource_id=resource.id
     JOIN public.fp_learning_competencies competency ON competency.id=link.competency_id
     WHERE competency.cycle_code=$1
       AND competency.is_active=true
       AND resource.is_active=true
       AND resource.language='es'
       AND resource.youtube_url=ANY($2)
     ORDER BY resource.youtube_url, competency.sort_order, link.sort_order, resource.slug`,
    [cycleCode, uniqueUrls],
  );

  for (const row of result.rows) targets.set(row.youtube_url, row.slug);
  return targets;
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

export async function addLearningNoteToBloc(
  userId: string,
  resource: LearningResourceDetail,
  timestampSeconds: number,
  body: string,
): Promise<DbFpLearningNote> {
  const timestamp = formatLearningTimestamp(timestampSeconds);
  const resourceHref = `/aprende/${encodeURIComponent(resource.slug)}?at=${timestampSeconds}`;
  const safeTitle = escapeHtml(resource.title);
  const safeProvider = escapeHtml(resource.provider);
  const safeBody = escapeHtml(body).replace(/\r?\n/g, "<br>");
  const entryHtml = `<hr><p><strong>${timestamp}</strong> · <a href="${resourceHref}">Ir al momento</a></p><p>${safeBody}</p>`;
  const entryText = `[${timestamp}] ${body}`;
  const initialHtml = `<p><strong>Vídeo:</strong> ${safeTitle}</p><p><strong>Canal:</strong> ${safeProvider}</p>${entryHtml}`;
  const initialText = `Vídeo: ${resource.title}\nCanal: ${resource.provider}\n\n${entryText}`;

  return withTransaction(async (client) => {
    const noteResult = await client.query<DbFpLearningNote>(
      `INSERT INTO public.fp_learning_notes(user_id, resource_id, timestamp_seconds, body)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [userId, resource.id, timestampSeconds, body],
    );

    await client.query(
      `INSERT INTO public.fp_user_learning_state
         (user_id, resource_id, status, last_position_seconds, duration_seconds,
          completed_at, completion_method, last_observed_at)
       VALUES ($1,$2,$3,$4,$5,case when $3='completed' then now() else null end,
          case when $3='completed' then $6 else null end,
          case when $4 > 0 then now() else null end)
       ON CONFLICT (user_id, resource_id) DO UPDATE SET
         status=excluded.status,
         last_position_seconds=excluded.last_position_seconds,
         duration_seconds=coalesce(excluded.duration_seconds, fp_user_learning_state.duration_seconds),
         completed_at=case when excluded.status='completed' then coalesce(fp_user_learning_state.completed_at, now()) else null end,
         completion_method=case when excluded.status='completed' then coalesce(fp_user_learning_state.completion_method, excluded.completion_method) else fp_user_learning_state.completion_method end,
         last_observed_at=case when excluded.last_position_seconds > 0 then now() else fp_user_learning_state.last_observed_at end,
         progress_revision=fp_user_learning_state.progress_revision + 1`,
      [
        userId,
        resource.id,
        resource.status === "completed" ? "completed" : "started",
        timestampSeconds,
        resource.saved_duration_seconds,
        resource.completion_method,
      ],
    );

    await client.query(
      `INSERT INTO public.bloc_notes
         (user_id, title, content_html, content_text, source_type, source_id)
       VALUES ($1,$2,$3,$4,'learning_resource',$5)
       ON CONFLICT (user_id, source_type, source_id)
         WHERE source_type is not null and source_id is not null
       DO UPDATE SET
         title=excluded.title,
         content_html=bloc_notes.content_html || $6,
         content_text=bloc_notes.content_text || E'\\n\\n' || $7,
         deleted_at=null`,
      [userId, resource.title, initialHtml, initialText, resource.id, entryHtml, entryText],
    );

    return noteResult.rows[0];
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatLearningTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export async function upsertLearningProgress(
  userId: string,
  resourceId: string,
  input: {
    status: FpLearningStatus;
    lastPositionSeconds: number;
    durationSeconds: number | null;
    completionMethod: Exclude<FpLearningCompletionMethod, "legacy_unspecified"> | null;
  },
): Promise<DbFpUserLearningState> {
  const result = await query<DbFpUserLearningState>(
    `INSERT INTO public.fp_user_learning_state
       (user_id, resource_id, status, last_position_seconds, duration_seconds,
        completed_at, completion_method, last_observed_at)
     VALUES ($1,$2,$3,$4,$5,case when $3='completed' then now() else null end,
        case when $3='completed' then $6 else null end,
        case when $4 > 0 then now() else null end)
     ON CONFLICT (user_id, resource_id) DO UPDATE SET
       status=excluded.status,
       last_position_seconds=excluded.last_position_seconds,
       duration_seconds=coalesce(excluded.duration_seconds, fp_user_learning_state.duration_seconds),
       completed_at=case when excluded.status='completed' then coalesce(fp_user_learning_state.completed_at, now()) else null end,
       completion_method=case when excluded.status='completed' then excluded.completion_method else fp_user_learning_state.completion_method end,
       last_observed_at=case when excluded.last_position_seconds > 0 then now() else fp_user_learning_state.last_observed_at end,
       progress_revision=fp_user_learning_state.progress_revision + 1
     RETURNING *`,
    [userId, resourceId, input.status, input.lastPositionSeconds, input.durationSeconds, input.completionMethod],
  );
  return result.rows[0];
}
