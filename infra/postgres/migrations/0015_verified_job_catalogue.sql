-- Canonical Radar vacancies remain global content. Student-owned application
-- state stays in job_applications and links to a vacancy only after an
-- explicit authenticated action.

create table if not exists public.radar_verified_jobs (
  occurrence_id           uuid primary key references public.radar_content_occurrences(id) on delete cascade,
  current_revision_id     uuid not null references public.radar_content_revisions(id) on delete restrict,
  employer                text not null check (char_length(employer) between 1 and 300),
  source_vacancy_id       text not null check (char_length(source_vacancy_id) between 1 and 500),
  application_url         text not null check (application_url ~ '^https://'),
  lifecycle               text not null check (lifecycle in ('open','closed','expired','unknown')),
  application_deadline    timestamptz,
  country                 text,
  autonomous_community    text,
  province                text,
  municipality            text,
  workplace_mode          text check (workplace_mode is null or workplace_mode in ('remote','hybrid','on_site')),
  contract_type           text,
  working_time            text,
  schedule                text,
  salary_min_minor        integer check (salary_min_minor is null or salary_min_minor >= 0),
  salary_max_minor        integer check (salary_max_minor is null or salary_max_minor >= 0),
  salary_currency         char(3),
  salary_period           text check (salary_period is null or salary_period in ('hour','month','year')),
  minimum_education       text,
  experience_requirements text,
  languages               text[] not null default '{}',
  other_eligibility       text[] not null default '{}',
  source_published_at     timestamptz,
  source_updated_at       timestamptz,
  first_seen_at           timestamptz not null,
  last_seen_at            timestamptz not null,
  verified_at             timestamptz not null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint radar_verified_jobs_salary_valid check (
    (
      (salary_min_minor is not null or salary_max_minor is not null)
      and salary_currency is not null
      and salary_period is not null
      and (salary_min_minor is null or salary_max_minor is null or salary_min_minor <= salary_max_minor)
    )
    or (
      salary_min_minor is null
      and salary_max_minor is null
      and salary_currency is null
      and salary_period is null
    )
  )
);

create index if not exists radar_verified_jobs_active_idx
  on public.radar_verified_jobs(lifecycle, application_deadline, verified_at desc);

create table if not exists public.radar_job_field_evidence (
  id             bigserial primary key,
  revision_id    uuid not null references public.radar_content_revisions(id) on delete cascade,
  field_path     text not null check (field_path ~ '^job\.[A-Za-z][A-Za-z0-9]*$'),
  origin         text not null check (origin in ('authoritative_source','source')),
  evidence_kind  text not null check (evidence_kind in ('official_document','source_feed','source_page','registration_page')),
  evidence_url   text not null check (evidence_url ~ '^https://'),
  observed_at    timestamptz not null,
  value_hash     char(64) not null check (value_hash ~ '^[0-9a-f]{64}$'),
  authority_rank smallint not null check (authority_rank between 1 and 100),
  unique (revision_id, field_path, evidence_url, value_hash)
);

create index if not exists radar_job_field_evidence_revision_idx
  on public.radar_job_field_evidence(revision_id, field_path);

alter table public.job_applications
  add column if not exists canonical_occurrence_id uuid references public.radar_content_occurrences(id) on delete set null,
  add column if not exists canonical_entity_id uuid references public.radar_content_entities(id) on delete set null,
  add column if not exists is_dismissed boolean not null default false;

create unique index if not exists job_applications_user_occurrence_uidx
  on public.job_applications(user_id, canonical_occurrence_id)
  where canonical_occurrence_id is not null;

create index if not exists job_applications_canonical_occurrence_idx
  on public.job_applications(canonical_occurrence_id)
  where canonical_occurrence_id is not null;

create unique index if not exists job_applications_user_entity_uidx
  on public.job_applications(user_id, canonical_entity_id)
  where canonical_entity_id is not null;

create index if not exists job_applications_canonical_entity_idx
  on public.job_applications(canonical_entity_id)
  where canonical_entity_id is not null;

alter table public.radar_projector_events
  drop constraint if exists radar_projector_events_projector_check;
alter table public.radar_projector_events
  add constraint radar_projector_events_projector_check
  check (projector in ('canonical','legacy_news','legacy_fp_catalogue','verified_job'));

drop trigger if exists set_radar_verified_jobs_updated_at on public.radar_verified_jobs;
create trigger set_radar_verified_jobs_updated_at
  before update on public.radar_verified_jobs
  for each row execute function public.set_updated_at();
