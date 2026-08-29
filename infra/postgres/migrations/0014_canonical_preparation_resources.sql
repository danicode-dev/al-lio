-- Canonical preparation-resource relationships for AL-LIO #202.
-- Existing learning resources and user progress are preserved in place. The
-- legacy video catalogue is classified as candidate_reverification; it is not
-- silently promoted into the student-facing preparation experience.

alter table public.fp_learning_resources
  alter column youtube_url drop not null,
  add column if not exists resource_type text not null default 'youtube_video',
  add column if not exists provider_resource_id text,
  add column if not exists canonical_url text,
  add column if not exists deep_link text,
  add column if not exists channel_id text,
  add column if not exists channel_name text,
  add column if not exists publication_state text not null default 'candidate_reverification',
  add column if not exists availability_state text not null default 'unknown',
  add column if not exists source_kind text not null default 'legacy_import',
  add column if not exists source_ref text,
  add column if not exists source_verified_at timestamptz,
  add column if not exists resource_revision integer not null default 1,
  add column if not exists radar_revision integer,
  add column if not exists supersedes_resource_id text references public.fp_learning_resources(id) on delete set null,
  add column if not exists provenance jsonb not null default '{}'::jsonb;

update public.fp_learning_resources
set deep_link = '/aprende/' || slug,
    source_ref = coalesce(source_ref, 'legacy:fp_learning_resources'),
    channel_name = coalesce(channel_name, provider)
where source_kind = 'legacy_import';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fp_learning_resources_type_check') then
    alter table public.fp_learning_resources add constraint fp_learning_resources_type_check
      check (resource_type in ('youtube_video','youtube_playlist','internal_course','internal_lesson'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fp_learning_resources_publication_state_check') then
    alter table public.fp_learning_resources add constraint fp_learning_resources_publication_state_check
      check (publication_state in ('candidate_reverification','approved','rejected','retired'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fp_learning_resources_availability_state_check') then
    alter table public.fp_learning_resources add constraint fp_learning_resources_availability_state_check
      check (availability_state in ('unknown','available','unavailable','restricted'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fp_learning_resources_source_kind_check') then
    alter table public.fp_learning_resources add constraint fp_learning_resources_source_kind_check
      check (source_kind in ('radar','manual_review','legacy_import','internal_catalogue'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fp_learning_resources_revision_check') then
    alter table public.fp_learning_resources add constraint fp_learning_resources_revision_check
      check (resource_revision > 0 and (radar_revision is null or radar_revision > 0));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fp_learning_resources_exact_identity_check') then
    alter table public.fp_learning_resources add constraint fp_learning_resources_exact_identity_check check (
      publication_state <> 'approved'
      or (
        provider_resource_id is not null
        and source_verified_at is not null
        and availability_state = 'available'
        and char_length(btrim(deep_link)) > 0
        and (
          (resource_type in ('youtube_video','youtube_playlist')
            and canonical_url ~ '^https://' and deep_link like '/aprende/%')
          or (resource_type in ('internal_course','internal_lesson') and deep_link like '/%')
        )
      )
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fp_learning_resources_youtube_id_check') then
    alter table public.fp_learning_resources add constraint fp_learning_resources_youtube_id_check check (
      resource_type <> 'youtube_video'
      or publication_state <> 'approved'
      or (
        provider_resource_id ~ '^[A-Za-z0-9_-]{11}$'
        and canonical_url = 'https://www.youtube.com/watch?v=' || provider_resource_id
      )
    );
  end if;
end
$$;

create unique index if not exists fp_learning_resources_provider_identity_uidx
  on public.fp_learning_resources(resource_type, provider_resource_id)
  where provider_resource_id is not null;
create index if not exists fp_learning_resources_publication_idx
  on public.fp_learning_resources(publication_state, availability_state, source_verified_at desc);

create table if not exists public.fp_learning_resource_revisions (
  resource_id        text not null references public.fp_learning_resources(id) on delete restrict,
  revision           integer not null check (revision > 0),
  snapshot           jsonb not null,
  source_verified_at timestamptz,
  created_at         timestamptz not null default now(),
  primary key (resource_id, revision)
);

insert into public.fp_learning_resource_revisions (
  resource_id, revision, snapshot, source_verified_at
)
select resource.id,
       resource.resource_revision,
       jsonb_build_object(
         'classification', resource.publication_state,
         'legacyYoutubeUrl', resource.youtube_url,
         'providerResourceId', resource.provider_resource_id,
         'title', resource.title,
         'provider', resource.provider
       ),
       resource.source_verified_at
from public.fp_learning_resources resource
on conflict (resource_id, revision) do nothing;

create table if not exists public.fp_skill_learning_resources (
  cycle_code       text not null,
  skill_id         text not null,
  resource_id      text not null references public.fp_learning_resources(id) on delete restrict,
  role             text not null check (role in ('primary','alternative','extension')),
  coverage_percent smallint check (coverage_percent is null or coverage_percent between 1 and 100),
  mapping_rationale text not null,
  publication_state text not null default 'candidate_reverification'
    check (publication_state in ('candidate_reverification','approved','rejected','retired')),
  source_kind      text not null check (source_kind in ('radar','manual_review','legacy_import','internal_catalogue')),
  source_ref       text,
  verified_at      timestamptz,
  sort_order       integer not null default 1 check (sort_order > 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (cycle_code, skill_id, resource_id),
  foreign key (cycle_code, skill_id)
    references public.fp_cycle_skills(cycle_code, skill_id) on delete cascade,
  constraint fp_skill_learning_resources_approved_check check (
    publication_state <> 'approved'
    or (verified_at is not null and char_length(btrim(mapping_rationale)) >= 12)
  )
);

create unique index if not exists fp_skill_learning_resources_primary_uidx
  on public.fp_skill_learning_resources(cycle_code, skill_id)
  where role = 'primary' and publication_state = 'approved';
create index if not exists fp_skill_learning_resources_resource_idx
  on public.fp_skill_learning_resources(resource_id, publication_state);

create table if not exists public.fp_learning_coverage_gaps (
  cycle_code  text not null,
  skill_id    text not null,
  reason      text not null check (reason in (
    'missing','weak_fallback','obsolete','unavailable','quality_below_threshold'
  )),
  status      text not null check (status in ('open','searching','covered')),
  priority    smallint not null check (priority between 0 and 100),
  source_ref  text,
  requested_at timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (cycle_code, skill_id),
  foreign key (cycle_code, skill_id)
    references public.fp_cycle_skills(cycle_code, skill_id) on delete cascade
);

create table if not exists public.radar_learning_deliveries (
  delivery_id uuid primary key,
  payload_hash char(64) not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  item_count integer not null check (item_count between 1 and 100),
  received_at timestamptz not null default now()
);

alter table public.fp_user_learning_state
  add column if not exists completion_method text,
  add column if not exists last_observed_at timestamptz,
  add column if not exists progress_revision integer not null default 1;

update public.fp_user_learning_state
set completion_method = 'legacy_unspecified'
where status = 'completed' and completion_method is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fp_user_learning_state_completion_method_check') then
    alter table public.fp_user_learning_state add constraint fp_user_learning_state_completion_method_check
      check (completion_method is null or completion_method in ('observed','self_declared','legacy_unspecified'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fp_user_learning_state_completion_evidence_check') then
    alter table public.fp_user_learning_state add constraint fp_user_learning_state_completion_evidence_check
      check (status <> 'completed' or completion_method is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fp_user_learning_state_progress_revision_check') then
    alter table public.fp_user_learning_state add constraint fp_user_learning_state_progress_revision_check
      check (progress_revision > 0);
  end if;
end
$$;

alter table public.fp_user_competency_state
  add column if not exists completion_method text,
  add column if not exists evidence_resource_id text references public.fp_learning_resources(id) on delete set null;

update public.fp_user_competency_state
set completion_method = 'legacy_unspecified'
where completion_method is null;

alter table public.fp_user_competency_state
  alter column completion_method set default 'self_declared',
  alter column completion_method set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fp_user_competency_state_completion_method_check') then
    alter table public.fp_user_competency_state add constraint fp_user_competency_state_completion_method_check
      check (completion_method in ('self_declared','resource_observed','legacy_unspecified'));
  end if;
end
$$;

drop trigger if exists set_fp_skill_learning_resources_updated_at on public.fp_skill_learning_resources;
create trigger set_fp_skill_learning_resources_updated_at
  before update on public.fp_skill_learning_resources
  for each row execute function public.set_updated_at();

drop trigger if exists set_fp_learning_coverage_gaps_updated_at on public.fp_learning_coverage_gaps;
create trigger set_fp_learning_coverage_gaps_updated_at
  before update on public.fp_learning_coverage_gaps
  for each row execute function public.set_updated_at();
