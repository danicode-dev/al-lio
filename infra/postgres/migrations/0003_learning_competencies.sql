create table if not exists public.fp_learning_competencies (
  id            text primary key,
  cycle_code    text not null references public.fp_cycles(code),
  slug          text not null,
  title         text not null,
  description   text not null,
  requirement   text not null check (requirement in ('essential','recommended')),
  sort_order    integer not null check (sort_order > 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (cycle_code, slug)
);

create table if not exists public.fp_learning_resources (
  id               text primary key,
  slug             text not null unique,
  title            text not null,
  description      text not null,
  provider         text not null,
  language         text not null check (language = 'es'),
  level            text not null check (level in ('inicial','intermedio','avanzado')),
  youtube_url      text not null check (youtube_url ~ '^https://(www\.)?(youtube\.com/watch\?v=|youtu\.be/)'),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  review_status    text not null check (review_status = 'approved'),
  reviewed_at      date not null,
  reviewed_by      text not null check (char_length(btrim(reviewed_by)) > 0),
  review_reason    text not null check (char_length(btrim(review_reason)) > 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.fp_learning_competency_resources (
  competency_id text not null references public.fp_learning_competencies(id) on delete cascade,
  resource_id   text not null references public.fp_learning_resources(id) on delete cascade,
  sort_order    integer not null check (sort_order > 0),
  is_featured   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (competency_id, resource_id)
);

create table if not exists public.fp_user_learning_state (
  user_id               uuid not null references public.users(id) on delete cascade,
  resource_id           text not null references public.fp_learning_resources(id) on delete cascade,
  status                text not null default 'started' check (status in ('started','completed')),
  last_position_seconds integer not null default 0 check (last_position_seconds >= 0),
  duration_seconds      integer check (duration_seconds is null or duration_seconds > 0),
  started_at            timestamptz not null default now(),
  completed_at          timestamptz,
  updated_at            timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create table if not exists public.fp_learning_notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  resource_id       text not null references public.fp_learning_resources(id) on delete cascade,
  timestamp_seconds integer not null default 0 check (timestamp_seconds >= 0),
  body              text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists fp_learning_competencies_cycle_idx
  on public.fp_learning_competencies(cycle_code, is_active, sort_order);
create index if not exists fp_learning_competency_resources_resource_idx
  on public.fp_learning_competency_resources(resource_id, competency_id);
create index if not exists fp_user_learning_state_user_idx
  on public.fp_user_learning_state(user_id, status, updated_at desc);
create index if not exists fp_learning_notes_user_resource_idx
  on public.fp_learning_notes(user_id, resource_id, timestamp_seconds, created_at);

drop trigger if exists set_fp_learning_competencies_updated_at on public.fp_learning_competencies;
create trigger set_fp_learning_competencies_updated_at
  before update on public.fp_learning_competencies
  for each row execute function public.set_updated_at();

drop trigger if exists set_fp_learning_resources_updated_at on public.fp_learning_resources;
create trigger set_fp_learning_resources_updated_at
  before update on public.fp_learning_resources
  for each row execute function public.set_updated_at();

drop trigger if exists set_fp_learning_competency_resources_updated_at on public.fp_learning_competency_resources;
create trigger set_fp_learning_competency_resources_updated_at
  before update on public.fp_learning_competency_resources
  for each row execute function public.set_updated_at();

drop trigger if exists set_fp_user_learning_state_updated_at on public.fp_user_learning_state;
create trigger set_fp_user_learning_state_updated_at
  before update on public.fp_user_learning_state
  for each row execute function public.set_updated_at();

drop trigger if exists set_fp_learning_notes_updated_at on public.fp_learning_notes;
create trigger set_fp_learning_notes_updated_at
  before update on public.fp_learning_notes
  for each row execute function public.set_updated_at();
