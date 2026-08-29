-- Auditable bridge from legacy catalogue rows to evidence-backed Radar v4
-- occurrences. The bridge is intentionally additive: existing favourites,
-- tasks and completion state remain attached to fp_content_items while a
-- verified occurrence is linked through legacy_fp_content_item_id.

create table if not exists public.legacy_opportunity_migration_audit (
  id                      uuid primary key default gen_random_uuid(),
  source_kind             text not null check (source_kind in (
    'tech_opportunities','fp_content_items','source_file'
  )),
  source_file             text,
  source_row_number       integer check (source_row_number is null or source_row_number > 1),
  legacy_key              text not null check (char_length(legacy_key) between 1 and 500),
  legacy_content_item_id  uuid references public.fp_content_items(id) on delete set null,
  canonical_occurrence_id uuid references public.radar_content_occurrences(id) on delete restrict,
  classification          text not null check (classification in (
    'verified_migratable','candidate_reverification','source_only',
    'expired_historical','rejected_unverifiable'
  )),
  reason_codes            text[] not null check (cardinality(reason_codes) > 0),
  snapshot_fingerprint    char(64) not null check (snapshot_fingerprint ~ '^[0-9a-f]{64}$'),
  audited_at              timestamptz not null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint legacy_opportunity_source_location_check check (
    (source_kind = 'source_file' and source_file is not null)
    or source_kind <> 'source_file'
  ),
  constraint legacy_opportunity_verified_target_check check (
    classification <> 'verified_migratable' or canonical_occurrence_id is not null
  )
);

create unique index if not exists legacy_opportunity_audit_source_key_uidx
  on public.legacy_opportunity_migration_audit(source_kind, coalesce(source_file, ''), legacy_key);

create index if not exists legacy_opportunity_audit_classification_idx
  on public.legacy_opportunity_migration_audit(classification, audited_at desc);
create index if not exists legacy_opportunity_audit_canonical_idx
  on public.legacy_opportunity_migration_audit(canonical_occurrence_id)
  where canonical_occurrence_id is not null;

drop trigger if exists set_legacy_opportunity_migration_audit_updated_at
  on public.legacy_opportunity_migration_audit;
create trigger set_legacy_opportunity_migration_audit_updated_at
  before update on public.legacy_opportunity_migration_audit
  for each row execute function public.set_updated_at();
