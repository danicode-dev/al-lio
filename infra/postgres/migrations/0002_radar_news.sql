create table if not exists public.radar_deliveries (
  delivery_id    uuid primary key,
  schema_version integer not null check (schema_version = 2),
  payload_hash   char(64) not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  item_count     integer not null check (item_count between 1 and 100),
  received_at    timestamptz not null default now()
);

create table if not exists public.radar_items (
  id                    bigserial primary key,
  schema_version        integer not null check (schema_version = 2),
  source_id             text not null,
  source_name           text not null,
  external_id           text not null,
  canonical_url         text not null check (canonical_url ~ '^https://'),
  title                 text not null check (char_length(title) between 1 and 500),
  summary               text not null check (char_length(summary) <= 1000),
  published_at          timestamptz,
  fetched_at            timestamptz not null,
  expires_at            timestamptz,
  event_starts_at       timestamptz,
  event_ends_at         timestamptz,
  registration_url      text check (registration_url is null or registration_url ~ '^https://'),
  registration_deadline timestamptz,
  kind                  text not null check (kind in ('news','event','call','legal')),
  locality              text,
  province              text,
  target_cycle_codes    text[] not null,
  module_codes          text[] not null default '{}',
  topics                text[] not null default '{}',
  matched_rule_ids      text[] not null default '{}',
  matched_keywords      text[] not null default '{}',
  trust_tier            text not null check (trust_tier in ('official','institutional','first_party','sector','reference')),
  review_status         text not null check (review_status = 'approved'),
  reviewed_by           text,
  reviewed_at           timestamptz,
  review_reason         text,
  source_url            text not null check (source_url ~ '^https://'),
  content_hash          char(64) not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint radar_items_cycle_codes_valid check (
    cardinality(target_cycle_codes) > 0
    and target_cycle_codes <@ array['DAW','DAM','AF','TSAF','MP']::text[]
  ),
  constraint radar_items_review_audit_required check (
    reviewed_by is not null
    and reviewed_at is not null
    and review_reason is not null
    and char_length(btrim(reviewed_by)) > 0
    and char_length(btrim(review_reason)) > 0
  ),
  constraint radar_items_source_url_unique unique (source_id, canonical_url)
);

create table if not exists public.radar_delivery_items (
  delivery_id  uuid not null references public.radar_deliveries(delivery_id) on delete cascade,
  radar_item_id bigint not null references public.radar_items(id) on delete cascade,
  primary key (delivery_id, radar_item_id)
);

create table if not exists public.radar_item_user_states (
  user_id       uuid not null references public.users(id) on delete cascade,
  radar_item_id bigint not null references public.radar_items(id) on delete cascade,
  status        text not null check (status in ('read','saved')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, radar_item_id)
);

create index if not exists radar_items_cycles_idx on public.radar_items using gin (target_cycle_codes);
create index if not exists radar_items_topics_idx on public.radar_items using gin (topics);
create index if not exists radar_items_active_date_idx on public.radar_items (expires_at, published_at desc, fetched_at desc);
create index if not exists radar_items_source_idx on public.radar_items (source_id, published_at desc);
create index if not exists radar_item_user_states_user_idx on public.radar_item_user_states (user_id, status, updated_at desc);

drop trigger if exists set_radar_items_updated_at on public.radar_items;
create trigger set_radar_items_updated_at
  before update on public.radar_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_radar_item_user_states_updated_at on public.radar_item_user_states;
create trigger set_radar_item_user_states_updated_at
  before update on public.radar_item_user_states
  for each row execute function public.set_updated_at();
