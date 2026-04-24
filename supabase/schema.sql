create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  target_role text,
  main_location text,
  skills text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.profiles enable row level security;

create table if not exists public.sources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  source_type text not null check (source_type in ('api','rss','deeplink','manual')),
  status text not null default 'active' check (status in ('active','planned','disabled')),
  logo_url text,
  base_url text,
  last_checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sources enable row level security;

create table if not exists public.quick_searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  platform text not null,
  keyword text not null,
  location text,
  generated_url text not null,
  category text default 'work',
  is_favorite boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quick_searches enable row level security;

create table if not exists public.opportunities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  source_type text default 'manual',
  title text not null,
  company text,
  description text,
  location text,
  province text,
  remote boolean default false,
  url text not null,
  published_at timestamptz,
  detected_at timestamptz default now(),
  category text default 'job',
  tags text[],
  level text,
  salary_min numeric,
  salary_max numeric,
  status text not null default 'guardada' check (status in ('guardada','pendiente_revision','aplicada','entrevista','rechazada','descartada')),
  score int default 0,
  external_id text,
  unique_hash text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunities enable row level security;

create table if not exists public.hackathons (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  organizer text,
  logo_url text,
  province text not null,
  city text,
  type text not null default 'hackathon',
  status text not null default 'revisar_futura_edicion' check (status in ('inscripcion_abierta','pendiente','realizado','revisar_futura_edicion','descartado')),
  event_start_date date,
  event_end_date date,
  registration_deadline date,
  detected_at date,
  last_reviewed_at date,
  next_review_at date,
  url text,
  notes text,
  priority text default 'media' check (priority in ('alta','media','baja')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hackathons enable row level security;

create table if not exists public.courses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  platform text,
  url text,
  price numeric,
  category text,
  status text not null default 'pendiente' check (status in ('pendiente','empezado','terminado','pausado','descartado')),
  deadline date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text default 'personal',
  status text not null default 'pendiente' check (status in ('pendiente','en_progreso','completada','pospuesta','cancelada')),
  priority text default 'media' check (priority in ('alta','media','baja')),
  due_date date,
  reminder_at timestamptz,
  related_type text,
  related_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create table if not exists public.reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  related_type text,
  related_id uuid,
  sent boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

create table if not exists public.quick_links (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text not null,
  category text,
  icon text,
  description text,
  is_favorite boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quick_links enable row level security;

create index if not exists sources_user_id_idx on public.sources(user_id);
create index if not exists quick_searches_user_id_idx on public.quick_searches(user_id);
create index if not exists opportunities_user_status_idx on public.opportunities(user_id, status);
create index if not exists hackathons_user_filters_idx on public.hackathons(user_id, province, status);
create index if not exists courses_user_status_idx on public.courses(user_id, status);
create index if not exists tasks_user_due_idx on public.tasks(user_id, due_date, status);
create index if not exists reminders_user_remind_idx on public.reminders(user_id, remind_at);
create index if not exists quick_links_user_favorite_idx on public.quick_links(user_id, is_favorite);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles','sources','quick_searches','opportunities','hackathons','courses','tasks','reminders','quick_links']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles','sources','quick_searches','opportunities','hackathons','courses','tasks','reminders','quick_links']
  loop
    execute format('drop policy if exists %I on public.%I', 'Users can select own ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'Users can insert own ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'Users can update own ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'Users can delete own ' || table_name, table_name);
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', 'Users can select own ' || table_name, table_name);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', 'Users can insert own ' || table_name, table_name);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', 'Users can update own ' || table_name, table_name);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', 'Users can delete own ' || table_name, table_name);
  end loop;
end $$;
