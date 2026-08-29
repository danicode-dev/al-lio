import "server-only";
import { query } from "@/lib/db/pool";
import { radarV4ProjectionDestinations } from "@/lib/radar/v4-projection";
import type {
  VerifiedJob,
  VerifiedJobEvidence,
  VerifiedJobPrivateAction,
  VerifiedJobLifecycle,
  VerifiedJobWorkplaceMode,
} from "./types";

type VerifiedJobRow = {
  id: string;
  entity_id: string;
  current_revision_id: string;
  revision: number;
  title: string;
  summary: string | null;
  employer: string;
  source_vacancy_id: string;
  application_url: string;
  lifecycle: VerifiedJobLifecycle;
  application_deadline: string | null;
  country: string | null;
  autonomous_community: string | null;
  province: string | null;
  municipality: string | null;
  workplace_mode: VerifiedJobWorkplaceMode | null;
  contract_type: string | null;
  working_time: string | null;
  schedule: string | null;
  salary_min_minor: number | null;
  salary_max_minor: number | null;
  salary_currency: string | null;
  salary_period: "hour" | "month" | "year" | null;
  minimum_education: string | null;
  experience_requirements: string | null;
  languages: string[];
  other_eligibility: string[];
  source_name: string;
  source_url: string;
  source_published_at: string | null;
  source_updated_at: string | null;
  verified_at: string;
  cycle_codes: string[];
  module_codes: string[];
  topics: string[];
  skills: string[];
  match_reasons: string[];
  private_application_id: string | null;
  private_application_status: string | null;
  is_saved: boolean | null;
};

type EvidenceRow = {
  field_path: string;
  origin: VerifiedJobEvidence["origin"];
  evidence_kind: VerifiedJobEvidence["kind"];
  evidence_url: string;
  observed_at: string;
  authority_rank: number;
};

const SELECT_VERIFIED_JOB = `
  SELECT DISTINCT ON (occurrence.entity_id)
         job.occurrence_id::text AS id, occurrence.entity_id::text,
         job.current_revision_id::text, occurrence.current_revision AS revision,
         occurrence.title, occurrence.summary_short AS summary,
         job.employer, job.source_vacancy_id, job.application_url,
         job.lifecycle, job.application_deadline, job.country,
         job.autonomous_community, job.province, job.municipality,
         job.workplace_mode, job.contract_type, job.working_time, job.schedule,
         job.salary_min_minor, job.salary_max_minor, job.salary_currency,
         job.salary_period, job.minimum_education, job.experience_requirements,
         job.languages, job.other_eligibility, occurrence.source_name,
         occurrence.canonical_url AS source_url, job.source_published_at,
         job.source_updated_at, job.verified_at, occurrence.match_reasons,
         ARRAY(SELECT target_value FROM public.radar_content_targets
               WHERE revision_id = job.current_revision_id AND target_type = 'cycle'
               ORDER BY target_value) AS cycle_codes,
         ARRAY(SELECT target_value FROM public.radar_content_targets
               WHERE revision_id = job.current_revision_id AND target_type = 'module'
               ORDER BY target_value) AS module_codes,
         ARRAY(SELECT target_value FROM public.radar_content_targets
               WHERE revision_id = job.current_revision_id AND target_type = 'topic'
               ORDER BY target_value) AS topics,
         ARRAY(SELECT target_value FROM public.radar_content_targets
               WHERE revision_id = job.current_revision_id AND target_type = 'skill'
               ORDER BY target_value) AS skills,
         application.id::text AS private_application_id,
         application.status AS private_application_status,
         application.is_saved
  FROM public.radar_verified_jobs job
  INNER JOIN public.radar_content_occurrences occurrence ON occurrence.id = job.occurrence_id
  LEFT JOIN public.job_applications application
    ON application.canonical_entity_id = occurrence.entity_id AND application.user_id = $1
`;

export function verifiedJobsEnabled(): boolean {
  return radarV4ProjectionDestinations().has("job");
}

export async function listVerifiedJobsForUser(
  userId: string,
  cycleCode: string,
  limit = 100,
): Promise<VerifiedJob[]> {
  const result = await query<VerifiedJobRow>(
    `SELECT * FROM (
       ${SELECT_VERIFIED_JOB}
       WHERE occurrence.destination = 'job'
         AND occurrence.publication_decision = 'accepted'
         AND job.lifecycle = 'open'
         AND (job.application_deadline IS NULL OR job.application_deadline > now())
         AND COALESCE(application.is_dismissed, false) = false
         AND EXISTS (
           SELECT 1 FROM public.radar_content_targets target
           WHERE target.revision_id = job.current_revision_id
             AND target.target_type = 'cycle' AND target.target_value = $2
         )
       ORDER BY occurrence.entity_id,
         CASE occurrence.trust_tier
           WHEN 'official' THEN 5 WHEN 'institutional' THEN 4
           WHEN 'first_party' THEN 3 WHEN 'sector' THEN 2 ELSE 1
         END DESC,
         job.verified_at DESC
     ) candidates
     ORDER BY application_deadline ASC NULLS LAST, verified_at DESC
     LIMIT $3`,
    [userId, cycleCode, Math.min(Math.max(limit, 1), 200)],
  );
  return result.rows.map(toVerifiedJob);
}

export async function getVerifiedJobForUser(
  userId: string,
  cycleCode: string,
  occurrenceId: string,
): Promise<VerifiedJob | null> {
  const result = await query<VerifiedJobRow>(
    `${SELECT_VERIFIED_JOB}
     WHERE job.occurrence_id = $2::uuid
       AND occurrence.destination = 'job'
       AND occurrence.publication_decision = 'accepted'
       AND (
         EXISTS (
           SELECT 1 FROM public.radar_content_targets target
           WHERE target.revision_id = job.current_revision_id
             AND target.target_type = 'cycle' AND target.target_value = $3
         )
         OR application.id IS NOT NULL
       )
     LIMIT 1`,
    [userId, occurrenceId, cycleCode],
  );
  const row = result.rows[0];
  if (!row) return null;
  const evidenceResult = await query<EvidenceRow>(
    `SELECT field_path, origin, evidence_kind, evidence_url, observed_at, authority_rank
     FROM public.radar_job_field_evidence
     WHERE revision_id = $1
     ORDER BY field_path, authority_rank DESC`,
    [row.current_revision_id],
  );
  return {
    ...toVerifiedJob(row),
    evidence: evidenceResult.rows.map((entry) => ({
      fieldPath: entry.field_path,
      origin: entry.origin,
      kind: entry.evidence_kind,
      url: entry.evidence_url,
      observedAt: entry.observed_at,
      authorityRank: entry.authority_rank,
    })),
  };
}

export async function applyVerifiedJobPrivateAction(input: {
  userId: string;
  cycleCode: string;
  occurrenceId: string;
  action: VerifiedJobPrivateAction;
}): Promise<{ id: string; status: string; isSaved: boolean; isDismissed: boolean } | null> {
  const applied = input.action === "applied";
  const saved = input.action === "save" || applied;
  const unsaved = input.action === "unsave";
  const dismissed = input.action === "dismiss";
  const result = await query<{ id: string; status: string; is_saved: boolean; is_dismissed: boolean }>(
    `INSERT INTO public.job_applications (
       user_id, canonical_entity_id, canonical_occurrence_id, company_name, company_url,
       job_title, job_url, source, status, detected_at, applied_at,
       is_new, is_saved, is_dismissed
     )
     SELECT $1, occurrence.entity_id, job.occurrence_id, job.employer, occurrence.canonical_url,
            occurrence.title, job.application_url, 'verified_radar',
            CASE WHEN $4::boolean THEN 'aplicada' ELSE 'nueva' END,
            now(), CASE WHEN $4::boolean THEN now() ELSE NULL END,
            false, $5, $6
     FROM public.radar_verified_jobs job
     INNER JOIN public.radar_content_occurrences occurrence ON occurrence.id = job.occurrence_id
     WHERE job.occurrence_id = $2::uuid
       AND occurrence.destination = 'job'
       AND occurrence.publication_decision = 'accepted'
       AND job.lifecycle = 'open'
       AND (job.application_deadline IS NULL OR job.application_deadline > now())
       AND EXISTS (
         SELECT 1 FROM public.radar_content_targets target
         WHERE target.revision_id = job.current_revision_id
           AND target.target_type = 'cycle' AND target.target_value = $3
       )
     ON CONFLICT (user_id, canonical_entity_id) WHERE canonical_entity_id IS NOT NULL
     DO UPDATE SET
       canonical_occurrence_id = excluded.canonical_occurrence_id,
       is_saved = CASE WHEN $6 OR $7 THEN false ELSE public.job_applications.is_saved OR $5 END,
       is_dismissed = $6,
       status = CASE WHEN $4 THEN 'aplicada' ELSE public.job_applications.status END,
       applied_at = CASE WHEN $4 THEN COALESCE(public.job_applications.applied_at, now()) ELSE public.job_applications.applied_at END,
       updated_at = now()
     RETURNING id::text, status, is_saved, is_dismissed`,
    [input.userId, input.occurrenceId, input.cycleCode, applied, saved, dismissed, unsaved],
  );
  const row = result.rows[0];
  return row ? { id: row.id, status: row.status, isSaved: row.is_saved, isDismissed: row.is_dismissed } : null;
}

function toVerifiedJob(row: VerifiedJobRow): VerifiedJob {
  return {
    id: row.id,
    revision: row.revision,
    title: row.title,
    summary: row.summary,
    employer: row.employer,
    sourceVacancyId: row.source_vacancy_id,
    applicationUrl: row.application_url,
    lifecycle: row.lifecycle,
    applicationDeadline: row.application_deadline,
    country: row.country,
    autonomousCommunity: row.autonomous_community,
    province: row.province,
    municipality: row.municipality,
    workplaceMode: row.workplace_mode,
    contractType: row.contract_type,
    workingTime: row.working_time,
    schedule: row.schedule,
    salaryMinMinor: row.salary_min_minor,
    salaryMaxMinor: row.salary_max_minor,
    salaryCurrency: row.salary_currency,
    salaryPeriod: row.salary_period,
    minimumEducation: row.minimum_education,
    experienceRequirements: row.experience_requirements,
    languages: row.languages,
    otherEligibility: row.other_eligibility,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourcePublishedAt: row.source_published_at,
    sourceUpdatedAt: row.source_updated_at,
    verifiedAt: row.verified_at,
    cycleCodes: row.cycle_codes,
    moduleCodes: row.module_codes,
    topics: row.topics,
    skills: row.skills,
    matchReasons: row.match_reasons,
    privateApplicationId: row.private_application_id,
    privateApplicationStatus: row.private_application_status,
    isSaved: Boolean(row.is_saved),
  };
}
