-- ============================================================
-- Aidraft — Schema PostgreSQL propio (sin Supabase Auth)
-- ============================================================
-- Versión: Fase 1 de migración desde Supabase.
-- Diferencias respecto al schema de Supabase:
--   - Tabla `users` propia (reemplaza auth.users).
--   - FK user_id → public.users(id) en lugar de auth.users(id).
--   - Sin RLS. Acceso por usuario controlado en capa de aplicación
--     mediante WHERE user_id = $userId en cada query.
--   - Sin auth.uid(). La función seed_hackathons se convierte en script.
--   - Triggers updated_at: SQL estándar, sin cambios.
--   - Índices: idénticos al schema de Supabase.
-- ============================================================

create extension if not exists pgcrypto;

-- ── Función updated_at ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Tabla users ───────────────────────────────────────────────────────────────
-- Reemplaza auth.users de Supabase. Gestión de autenticación propia.
-- password_hash: resultado de bcryptjs.hash(password, 12).
create table if not exists public.users (
  id           uuid        primary key default gen_random_uuid(),
  email        text        not null unique,
  password_hash text,
  display_name text,
  role         text        not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Tabla profiles ───────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  full_name     text,
  display_name  text,
  target_role   text,
  main_location text,
  skills        text[],
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(user_id)
);

-- ── Tabla sources ────────────────────────────────────────────────────────────
create table if not exists public.sources (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users(id) on delete cascade,
  name           text        not null,
  slug           text        not null,
  source_type    text        not null check (source_type in ('api','rss','deeplink','manual')),
  status         text        not null default 'active' check (status in ('active','planned','disabled')),
  logo_url       text,
  base_url       text,
  last_checked_at timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Tabla quick_searches ─────────────────────────────────────────────────────
create table if not exists public.quick_searches (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  title         text        not null,
  platform      text        not null,
  keyword       text        not null,
  location      text,
  generated_url text        not null,
  category      text        default 'work',
  is_favorite   boolean     default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Tabla opportunities ──────────────────────────────────────────────────────
create table if not exists public.opportunities (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  source       text        not null,
  source_type  text        default 'manual',
  title        text        not null,
  company      text,
  description  text,
  location     text,
  province     text,
  remote       boolean     default false,
  url          text        not null,
  published_at timestamptz,
  detected_at  timestamptz default now(),
  category     text        default 'job',
  tags         text[],
  level        text,
  salary_min   numeric,
  salary_max   numeric,
  status       text        not null default 'guardada' check (status in ('guardada','pendiente_revision','aplicada','entrevista','rechazada','descartada')),
  score        int         default 0,
  external_id  text,
  unique_hash  text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Tabla hackathons ─────────────────────────────────────────────────────────
create table if not exists public.hackathons (
  id                        uuid  primary key default gen_random_uuid(),
  user_id                   uuid  not null references public.users(id) on delete cascade,
  id_slug                   text,
  categoria                 text,
  name                      text  not null,
  organizer                 text,
  logo_url                  text,
  province                  text  not null,
  city                      text,
  type                      text  not null default 'hackathon',
  modalidad                 text,
  localidad                 text,
  status                    text  not null default 'revisar_futura_edicion' check (status in ('inscripcion_abierta','pendiente','realizado','revisar_futura_edicion','descartado')),
  event_start_date          date,
  event_end_date            date,
  registration_deadline     date,
  inscripcion_hasta         date,
  certificacion_o_premio    text,
  practicas_empresa         boolean,
  encaje_daw_1_5            integer check (encaje_daw_1_5 between 1 and 5),
  tags                      text,
  incluido_en_readme_original boolean,
  ultima_revision           date,
  detected_at               date,
  last_reviewed_at          date,
  next_review_at            date,
  url                       text,
  notes                     text,
  priority                  text  default 'media' check (priority in ('alta','media','baja')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ── Tabla courses ────────────────────────────────────────────────────────────
create table if not exists public.courses (
  id                    uuid  primary key default gen_random_uuid(),
  user_id               uuid  not null references public.users(id) on delete cascade,
  id_slug               text,
  title                 text  not null,
  platform              text,
  url                   text,
  price                 numeric,
  category              text,
  status                text  not null default 'pendiente' check (status in ('pendiente','empezado','terminado','pausado','descartado')),
  start_date            date,
  deadline              date,
  entidad               text,
  area                  text,
  modalidad             text,
  localidad             text,
  provincia             text,
  formato               text,
  certificacion_tipo    text,
  certificacion_oficial boolean,
  practicas_empresa     boolean,
  horas_totales         integer,
  horas_practicas       integer,
  fecha_inicio          date,
  fecha_fin             date,
  estado                text,
  coste                 text,
  requisitos_resumen    text,
  encaje_daw_1_5        integer check (encaje_daw_1_5 between 1 and 5),
  prioridad             text  default 'Media' check (prioridad in ('Alta','Media','Baja')),
  tags                  text,
  fuente_url            text,
  ultima_revision       date,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── Tabla tech_opportunities ─────────────────────────────────────────────────
-- Tabla de referencia compartida (sin user_id). Datos importados por scripts.
create table if not exists public.tech_opportunities (
  id                    uuid  primary key default gen_random_uuid(),
  id_slug               text  unique not null,
  categoria             text,
  nombre                text  not null,
  entidad               text,
  area_o_tipo           text,
  modalidad             text,
  localidad             text,
  provincia             text,
  fecha_inicio          date,
  fecha_fin             date,
  estado                text,
  certificacion_o_premio text,
  practicas_empresa     text,
  horas_totales         integer,
  horas_practicas       integer,
  coste                 text,
  requisitos_resumen    text,
  encaje_daw_1_5        integer,
  prioridad             text,
  tags                  text,
  fuente_url            text,
  ultima_revision       date,
  notas                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── Tabla tasks ──────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users(id) on delete cascade,
  title          text        not null,
  description    text,
  category       text        default 'personal',
  status         text        not null default 'pendiente' check (status in ('pendiente','en_progreso','completada','pospuesta','cancelada')),
  priority       text        default 'media' check (priority in ('alta','media','baja')),
  due_date       date,
  completed_at   timestamptz,
  progress_notes jsonb       not null default '[]',
  reminder_at    timestamptz,
  related_type   text,
  related_id     uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Tabla reminders ──────────────────────────────────────────────────────────
create table if not exists public.reminders (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  title        text        not null,
  remind_at    timestamptz not null,
  related_type text,
  related_id   uuid,
  sent         boolean     default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Tabla quick_links ────────────────────────────────────────────────────────
create table if not exists public.quick_links (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users(id) on delete cascade,
  name        text        not null,
  url         text        not null,
  category    text,
  icon        text,
  description text,
  is_favorite boolean     default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Índices ──────────────────────────────────────────────────────────────────
create index if not exists sources_user_id_idx              on public.sources(user_id);
create index if not exists quick_searches_user_id_idx       on public.quick_searches(user_id);
create index if not exists opportunities_user_status_idx    on public.opportunities(user_id, status);
create index if not exists hackathons_user_filters_idx      on public.hackathons(user_id, province, status);
create unique index if not exists hackathons_user_id_slug_key on public.hackathons(user_id, id_slug);
create index if not exists hackathons_user_priority_idx     on public.hackathons(user_id, priority);
create index if not exists courses_user_status_idx          on public.courses(user_id, status);
create unique index if not exists courses_user_id_slug_key  on public.courses(user_id, id_slug);
create index if not exists courses_user_prioridad_idx       on public.courses(user_id, prioridad);
create index if not exists idx_tech_opp_id_slug             on public.tech_opportunities(id_slug);
create index if not exists idx_tech_opp_categoria           on public.tech_opportunities(categoria);
create index if not exists idx_tech_opp_prioridad           on public.tech_opportunities(prioridad);
create index if not exists idx_tech_opp_provincia           on public.tech_opportunities(provincia);
create index if not exists idx_tech_opp_fecha_inicio        on public.tech_opportunities(fecha_inicio);
create index if not exists idx_tech_opp_encaje_daw          on public.tech_opportunities(encaje_daw_1_5);
create index if not exists tasks_user_due_idx               on public.tasks(user_id, due_date, status);
create index if not exists reminders_user_remind_idx        on public.reminders(user_id, remind_at);
create index if not exists quick_links_user_favorite_idx    on public.quick_links(user_id, is_favorite);

-- ── Triggers updated_at ──────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'users','profiles','sources','quick_searches','opportunities',
    'hackathons','courses','tasks','reminders','quick_links'
  ]
  loop
    execute format(
      'drop trigger if exists set_%I_updated_at on public.%I',
      t, t
    );
    execute format(
      'create trigger set_%I_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

drop trigger if exists tech_opportunities_updated_at on public.tech_opportunities;
create trigger tech_opportunities_updated_at
  before update on public.tech_opportunities
  for each row execute function public.set_updated_at();
