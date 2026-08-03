# Supabase Schema

## Principios

- Todas las tablas usan UUID.
- Todas las tablas tienen `user_id`.
- Todas las tablas tienen `created_at` y `updated_at`.
- Activar Row Level Security.
- Cada usuario solo puede ver y modificar sus propios datos.

## SQL base

```sql
create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  target_role text,
  main_location text,
  skills text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

create table if not exists sources (
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists quick_searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  platform text not null,
  keyword text not null,
  location text,
  generated_url text not null,
  category text default 'work',
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists opportunities (
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
  status text not null default 'guardada',
  score int default 0,
  external_id text,
  unique_hash text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists hackathons (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  organizer text,
  logo_url text,
  province text not null,
  city text,
  type text not null default 'hackathon',
  status text not null default 'revisar_futura_edicion',
  event_start_date date,
  event_end_date date,
  registration_deadline date,
  detected_at date,
  last_reviewed_at date,
  next_review_at date,
  url text,
  notes text,
  priority text default 'media',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists courses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  platform text,
  url text,
  price numeric,
  category text,
  status text not null default 'pendiente',
  deadline date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text default 'personal',
  status text not null default 'pendiente',
  priority text default 'media',
  due_date date,
  reminder_at timestamptz,
  related_type text,
  related_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  related_type text,
  related_id uuid,
  sent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists quick_links (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text not null,
  category text,
  icon text,
  description text,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## RLS

Activar RLS en todas las tablas y crear policies de usuario propietario.

Patrón:

```sql
alter table tasks enable row level security;

create policy "Users can select own tasks"
on tasks for select
using (auth.uid() = user_id);

create policy "Users can insert own tasks"
on tasks for insert
with check (auth.uid() = user_id);

create policy "Users can update own tasks"
on tasks for update
using (auth.uid() = user_id);

create policy "Users can delete own tasks"
on tasks for delete
using (auth.uid() = user_id);
```

Repetir para todas las tablas.
