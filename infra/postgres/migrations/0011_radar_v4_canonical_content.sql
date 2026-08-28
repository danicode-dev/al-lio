-- Radar v4 is additive: transport JSON is retained only on immutable revisions,
-- while current queryable facts live in typed PostgreSQL columns and relations.

alter table public.radar_deliveries drop constraint if exists radar_deliveries_schema_version_v3_check;
alter table public.radar_deliveries drop constraint if exists radar_deliveries_schema_version_v3_v4_check;
alter table public.radar_deliveries
  add constraint radar_deliveries_schema_version_v3_v4_check check (schema_version in (3, 4));

alter table public.radar_items drop constraint if exists radar_items_schema_version_v3_check;
alter table public.radar_items drop constraint if exists radar_items_schema_version_v3_v4_check;
alter table public.radar_items
  add constraint radar_items_schema_version_v3_v4_check check (schema_version in (3, 4));
alter table public.radar_items
  add column if not exists entity_key char(64),
  add column if not exists occurrence_key char(64);

alter table public.fp_content_items
  add column if not exists radar_entity_key char(64),
  add column if not exists radar_occurrence_key char(64);

create index if not exists radar_items_entity_key_idx on public.radar_items(entity_key);
create index if not exists radar_items_source_occurrence_idx on public.radar_items(source_id, occurrence_key);
create index if not exists fp_content_items_radar_entity_idx on public.fp_content_items(radar_entity_key);
create index if not exists fp_content_items_radar_occurrence_idx on public.fp_content_items(radar_occurrence_key);

create table if not exists public.radar_content_entities (
  id               uuid primary key default gen_random_uuid(),
  entity_key       char(64) not null unique check (entity_key ~ '^[0-9a-f]{64}$'),
  destination      text not null check (destination in ('news','course','event','job')),
  opportunity_type text not null,
  title            text not null check (char_length(title) between 1 and 500),
  organizer        text,
  provider         text,
  first_seen_at    timestamptz not null,
  last_verified_at timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.radar_content_occurrences (
  id                       uuid primary key default gen_random_uuid(),
  entity_id                uuid not null references public.radar_content_entities(id) on delete restrict,
  source_id                text not null,
  source_name              text not null,
  external_id              text not null,
  occurrence_key           char(64) not null check (occurrence_key ~ '^[0-9a-f]{64}$'),
  legacy_semantic_key      char(64) check (legacy_semantic_key is null or legacy_semantic_key ~ '^[0-9a-f]{64}$'),
  canonical_url            text not null check (canonical_url ~ '^https://'),
  primary_evidence_url     text not null check (primary_evidence_url ~ '^https://'),
  supporting_evidence_urls text[] not null default '{}',
  trust_tier               text not null check (trust_tier in ('official','institutional','first_party','sector','reference')),
  source_published_at      timestamptz,
  source_updated_at        timestamptz,
  source_verified_at       timestamptz not null,
  current_revision         integer not null check (current_revision > 0),
  material_fingerprint     char(64) not null check (material_fingerprint ~ '^[0-9a-f]{64}$'),
  publication_decision     text not null check (publication_decision in ('accepted','rejected','quarantined')),
  source_lifecycle_status  text check (source_lifecycle_status in (
    'announced','registration_open','registration_closed','ongoing','completed',
    'cancelled','postponed','evergreen'
  )),
  ranking_priority         smallint not null check (ranking_priority between 0 and 100),
  title                    text not null check (char_length(title) between 1 and 500),
  summary_short            text,
  summary_expanded         text,
  key_facts                text[] not null default '{}',
  organizer                text,
  provider                 text,
  course_code              text,
  starts_at                timestamptz,
  ends_at                  timestamptz,
  registration_opens_at    timestamptz,
  registration_deadline    timestamptz,
  registration_url         text check (registration_url is null or registration_url ~ '^https://'),
  attendance_mode          text check (attendance_mode in ('online','in_person','hybrid')),
  country                  text,
  autonomous_community     text,
  province                 text,
  municipality             text,
  venue                    text,
  address                  text,
  duration_hours           numeric check (duration_hours is null or duration_hours > 0),
  course_difficulty        text,
  minimum_education        text,
  other_eligibility        text[] not null default '{}',
  credential_level         text,
  price_state              text check (price_state in ('free','paid')),
  price_amount_minor       integer check (price_amount_minor is null or price_amount_minor >= 0),
  price_currency           char(3),
  certification            text,
  prize                    text,
  requirements             text[] not null default '{}',
  audience                 text[] not null default '{}',
  about_summary            text,
  learning_outcomes        text[] not null default '{}',
  skills_tested            text[] not null default '{}',
  preparation_tips         text[] not null default '{}',
  why_relevant             text,
  legacy_radar_item_id     bigint unique references public.radar_items(id) on delete set null,
  legacy_fp_content_item_id uuid unique references public.fp_content_items(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (source_id, occurrence_key),
  constraint radar_content_occurrences_price_valid check (
    (price_state = 'paid' and price_amount_minor is not null and price_currency is not null)
    or (price_state is distinct from 'paid' and price_amount_minor is null and price_currency is null)
  )
);

create table if not exists public.radar_content_revisions (
  id                   uuid primary key default gen_random_uuid(),
  occurrence_id        uuid not null references public.radar_content_occurrences(id) on delete cascade,
  revision             integer not null check (revision > 0),
  material_fingerprint char(64) not null check (material_fingerprint ~ '^[0-9a-f]{64}$'),
  publication_decision text not null check (publication_decision in ('accepted','rejected','quarantined')),
  ranking_priority     smallint not null check (ranking_priority between 0 and 100),
  payload_snapshot     jsonb not null,
  received_at          timestamptz not null default now(),
  unique (occurrence_id, revision),
  unique (occurrence_id, material_fingerprint)
);

create table if not exists public.radar_content_current_facts (
  occurrence_id    uuid not null references public.radar_content_occurrences(id) on delete cascade,
  field_path       text not null check (field_path ~ '^facts\.[A-Za-z][A-Za-z0-9]*$'),
  value_json       jsonb not null,
  observation_state text not null check (observation_state in ('verified','verified_removed')),
  authority_rank   smallint not null check (authority_rank between 1 and 100),
  revision_id      uuid not null references public.radar_content_revisions(id) on delete restrict,
  verified_at      timestamptz not null,
  updated_at       timestamptz not null default now(),
  primary key (occurrence_id, field_path)
);

create table if not exists public.radar_content_field_evidence (
  id             bigserial primary key,
  revision_id    uuid not null references public.radar_content_revisions(id) on delete cascade,
  field_path     text not null check (field_path ~ '^facts\.[A-Za-z][A-Za-z0-9]*$'),
  origin         text not null check (origin in ('authoritative_source','source')),
  evidence_kind  text not null check (evidence_kind in ('official_document','source_feed','source_page','registration_page')),
  evidence_url   text not null check (evidence_url ~ '^https://'),
  observed_at    timestamptz not null,
  value_hash     char(64) not null check (value_hash ~ '^[0-9a-f]{64}$'),
  authority_rank smallint not null check (authority_rank between 1 and 100),
  unique (revision_id, field_path, evidence_url, value_hash)
);

create table if not exists public.radar_content_targets (
  revision_id uuid not null references public.radar_content_revisions(id) on delete cascade,
  target_type text not null check (target_type in ('cycle','module','topic','skill')),
  target_value text not null,
  primary key (revision_id, target_type, target_value)
);

create table if not exists public.radar_content_identity_aliases (
  id                    bigserial primary key,
  alias_kind            text not null check (alias_kind in ('entity','occurrence')),
  source_id             text,
  alias_key             char(64) not null check (alias_key ~ '^[0-9a-f]{64}$'),
  canonical_entity_id   uuid not null references public.radar_content_entities(id) on delete restrict,
  canonical_occurrence_id uuid references public.radar_content_occurrences(id) on delete restrict,
  reason                text not null,
  created_at            timestamptz not null default now(),
  constraint radar_content_alias_target_valid check (
    (alias_kind = 'entity' and source_id is null and canonical_occurrence_id is null)
    or (alias_kind = 'occurrence' and source_id is not null and canonical_occurrence_id is not null)
  )
);

create unique index if not exists radar_content_identity_alias_uidx
  on public.radar_content_identity_aliases(alias_kind, coalesce(source_id, ''), alias_key);

create table if not exists public.radar_delivery_revisions (
  delivery_id uuid not null references public.radar_deliveries(delivery_id) on delete cascade,
  revision_id uuid not null references public.radar_content_revisions(id) on delete restrict,
  primary key (delivery_id, revision_id)
);

create table if not exists public.radar_content_conflicts (
  id                      bigserial primary key,
  occurrence_id           uuid not null references public.radar_content_occurrences(id) on delete cascade,
  incoming_revision_id    uuid not null references public.radar_content_revisions(id) on delete cascade,
  field_path              text not null,
  current_authority_rank  smallint not null,
  incoming_authority_rank smallint not null,
  resolution              text not null check (resolution in ('kept_last_known_good','accepted_higher_authority')),
  created_at              timestamptz not null default now(),
  unique (incoming_revision_id, field_path)
);

create table if not exists public.radar_projector_events (
  id            bigserial primary key,
  delivery_id   uuid not null references public.radar_deliveries(delivery_id) on delete cascade,
  revision_id   uuid not null references public.radar_content_revisions(id) on delete cascade,
  projector     text not null check (projector in ('canonical','legacy_news','legacy_fp_catalogue')),
  status        text not null check (status in ('projected','skipped','conflict','failed')),
  reason_code   text,
  occurred_at   timestamptz not null default now(),
  unique (delivery_id, revision_id, projector)
);

create table if not exists public.radar_ingest_events (
  id             bigserial primary key,
  delivery_id    uuid not null,
  schema_version integer not null,
  outcome        text not null check (outcome in ('accepted','rejected','duplicate','conflict')),
  reason_code    text,
  payload_hash   char(64) not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  item_count     integer,
  occurred_at    timestamptz not null default now()
);

create index if not exists radar_content_occurrences_entity_idx on public.radar_content_occurrences(entity_id);
create index if not exists radar_content_occurrences_destination_lifecycle_idx
  on public.radar_content_occurrences(publication_decision, source_lifecycle_status, starts_at);
create index if not exists radar_content_revisions_occurrence_idx
  on public.radar_content_revisions(occurrence_id, revision desc);
create index if not exists radar_content_field_evidence_field_idx
  on public.radar_content_field_evidence(field_path, observed_at desc);
create index if not exists radar_content_targets_lookup_idx
  on public.radar_content_targets(target_type, target_value);
create index if not exists radar_projector_events_status_idx
  on public.radar_projector_events(status, occurred_at desc);
create index if not exists radar_ingest_events_delivery_idx
  on public.radar_ingest_events(delivery_id, occurred_at desc);

drop trigger if exists set_radar_content_entities_updated_at on public.radar_content_entities;
create trigger set_radar_content_entities_updated_at
  before update on public.radar_content_entities
  for each row execute function public.set_updated_at();

drop trigger if exists set_radar_content_occurrences_updated_at on public.radar_content_occurrences;
create trigger set_radar_content_occurrences_updated_at
  before update on public.radar_content_occurrences
  for each row execute function public.set_updated_at();
