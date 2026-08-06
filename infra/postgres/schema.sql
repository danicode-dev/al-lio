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
  cycle_code    text check (cycle_code in ('DAW','DAM','AF','TSAF','MP')),
  cycle_group   text check (cycle_group in ('DEV','AF','TSAF','MP')),
  academic_year smallint check (academic_year in (1,2)),
  interests     text[] not null default '{}',
  onboarding_completed_at timestamptz,
  onboarding_version integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_cycle_group_consistency check (
    cycle_code is null
    or cycle_group is null
    or (cycle_code in ('DAW','DAM') and cycle_group = 'DEV')
    or cycle_code = cycle_group
  ),
  unique(user_id)
);

-- Existing databases created before FP personalization need these columns too.
alter table if exists public.profiles add column if not exists cycle_code text;
alter table if exists public.profiles add column if not exists cycle_group text;
alter table if exists public.profiles add column if not exists academic_year smallint;
alter table if exists public.profiles add column if not exists interests text[];
alter table if exists public.profiles add column if not exists onboarding_completed_at timestamptz;
alter table if exists public.profiles add column if not exists onboarding_version integer;

update public.profiles set interests = '{}' where interests is null;
update public.profiles set onboarding_version = 1 where onboarding_version is null;

alter table if exists public.profiles alter column interests set default '{}';
alter table if exists public.profiles alter column interests set not null;
alter table if exists public.profiles alter column onboarding_version set default 1;
alter table if exists public.profiles alter column onboarding_version set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_cycle_code_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_cycle_code_check
      check (cycle_code in ('DAW','DAM','AF','TSAF','MP'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_cycle_group_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_cycle_group_check
      check (cycle_group in ('DEV','AF','TSAF','MP'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_academic_year_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_academic_year_check
      check (academic_year in (1,2));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_cycle_group_consistency'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_cycle_group_consistency
      check (
        cycle_code is null
        or cycle_group is null
        or (cycle_code in ('DAW','DAM') and cycle_group = 'DEV')
        or cycle_code = cycle_group
      );
  end if;
end $$;

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

-- FP personalization catalog.
create table if not exists public.fp_cycles (
  code        text primary key check (code in ('DAW','DAM','AF','TSAF','MP')),
  group_code  text not null check (group_code in ('DEV','AF','TSAF','MP')),
  name        text not null,
  short_name  text not null,
  description text,
  sort_order  integer not null default 100,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint fp_cycles_group_consistency check (
    (code in ('DAW','DAM') and group_code = 'DEV')
    or code = group_code
  )
);

insert into public.fp_cycles (code, group_code, name, short_name, description, sort_order)
values
  ('DAW', 'DEV', 'Desarrollo de Aplicaciones Web', 'DAW', 'Perfil de desarrollo web dentro del grupo Desarrollo de Aplicaciones.', 10),
  ('DAM', 'DEV', 'Desarrollo de Aplicaciones Multiplataforma', 'DAM', 'Perfil de desarrollo multiplataforma dentro del grupo Desarrollo de Aplicaciones.', 20),
  ('AF', 'AF', 'Administracion y Finanzas', 'AF', 'Perfil de gestion administrativa, contabilidad, finanzas y procesos empresariales.', 30),
  ('TSAF', 'TSAF', 'Acondicionamiento Fisico', 'TSAF', 'Perfil de entrenamiento, actividad fisica, salud y gestion de servicios deportivos.', 40),
  ('MP', 'MP', 'Marketing y Publicidad', 'MP', 'Perfil de marketing, comunicacion, campanas, analitica y contenido digital.', 50)
on conflict (code) do update set
  group_code = excluded.group_code,
  name = excluded.name,
  short_name = excluded.short_name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

create table if not exists public.fp_content_items (
  id               uuid primary key default gen_random_uuid(),
  id_slug          text not null unique,
  type             text not null check (type in (
    'beca',
    'comunidad',
    'convocatoria_practicas',
    'curso_basico',
    'curso_complementario',
    'empleo_busqueda',
    'evento',
    'evidencia_recomendada',
    'fuente_noticias',
    'hackathon',
    'herramienta',
    'instituto',
    'recurso',
    'reto'
  )),
  title            text not null,
  description      text not null,
  entity           text,
  delivery_mode    text,
  location         text,
  province         text,
  start_date       date,
  end_date         date,
  status           text check (status in ('abierto','activo','historico_util','pendiente_convocatoria','revisar')),
  cost             text,
  certification    text,
  practices        text check (practices in ('no','posible','si','sí')),
  source_url       text not null,
  tags             text[] not null default '{}',
  suggested_action text,
  last_reviewed_at date,
  notes            text,
  source_year      text not null default '2026-2027',
  video_url        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table if exists public.fp_content_items add column if not exists video_url text;

create table if not exists public.fp_content_cycle_fit (
  content_item_id uuid not null references public.fp_content_items(id) on delete cascade,
  cycle_code      text not null references public.fp_cycles(code),
  cycle_group     text not null check (cycle_group in ('DEV','AF','TSAF','MP')),
  priority        text not null check (priority in ('Alta','Media','Baja')),
  fit_score       smallint not null check (fit_score between 1 and 5),
  audience_year   smallint check (audience_year in (1,2)),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (content_item_id, cycle_code),
  constraint fp_content_cycle_fit_group_consistency check (
    (cycle_code in ('DAW','DAM') and cycle_group = 'DEV')
    or cycle_code = cycle_group
  )
);

create table if not exists public.fp_user_content_state (
  user_id         uuid not null references public.users(id) on delete cascade,
  content_item_id uuid not null references public.fp_content_items(id) on delete cascade,
  status          text not null default 'saved' check (status in ('saved','started','completed','dismissed')),
  is_favorite     boolean not null default false,
  notes           text,
  reminder_at     timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, content_item_id)
);

-- Modelo de habilidades FP (reemplaza al antiguo fp_competencies, que
-- duplicaba cada competencia una vez por ciclo aunque fuera literalmente
-- la misma -- ej. "Git" existia como fila DAW-... y otra fila DAM-... sin
-- ninguna relacion entre ambas). Ahora la habilidad es unica y cycle_skills
-- es quien decide que ciclos la necesitan y donde encaja en su itinerario.
--
-- fp_competencies / fp_competency_relations quedan retirados: el grafo de
-- prerrequisitos nunca se llego a usar desde la app (solo vivia en el
-- esquema), asi que en vez de mantenerlo se sustituye por un texto simple
-- y legible (fp_cycle_skills.prerrequisito_texto) que el alumno puede leer
-- pero que no exige mantener relaciones.
drop table if exists public.fp_item_competencies cascade;
drop table if exists public.fp_competency_relations cascade;
drop table if exists public.fp_competencies cascade;

create table if not exists public.fp_skills (
  id                    text primary key,
  titulo                text not null,
  descripcion           text,
  horas_estimadas       integer,
  criterios_superacion  text,
  evidencia_minima      text,
  umbral_superacion     text,
  aplicable_a           text,
  fuente_titulo_url     text,
  fuente_curriculo_url  text,
  tipo_criterio         text,
  ultima_revision       date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Donde vive cada habilidad dentro del itinerario de un ciclo concreto.
-- Una habilidad compartida entre ciclos (ej. Git en DAW y DAM) tiene una
-- fila por cada ciclo que la necesita, todas apuntando al mismo skill_id.
create table if not exists public.fp_cycle_skills (
  cycle_code               text not null references public.fp_cycles(code),
  skill_id                 text not null references public.fp_skills(id) on delete cascade,
  orden_global             integer not null,
  etapa                    text not null check (etapa in (
    '0_antes_de_empezar','1_fundamentos','2_aplicacion','3_empleabilidad','4_proyecto'
  )),
  bloque                   text,
  modulo_codigo            text,
  modulo_nombre            text,
  nivel_objetivo           smallint,
  obligatoria_roadmap_base boolean not null default true,
  basico_antes_de_empezar  boolean not null default false,
  prerrequisito_texto      text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  primary key (cycle_code, skill_id)
);

create table if not exists public.fp_item_competencies (
  content_item_id          uuid not null references public.fp_content_items(id) on delete cascade,
  skill_id                 text not null references public.fp_skills(id) on delete cascade,
  tipo_relacion            text not null check (tipo_relacion in ('requiere','ensena','demuestra')),
  orden_preparacion        integer,
  nivel_minimo_recomendado smallint,
  obligatoria_para_item    boolean not null default false,
  motivo_relacion          text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  primary key (content_item_id, skill_id, tipo_relacion)
);

-- Timestamped notes a user takes while watching a resource's video inside
-- AL-LIO. Separate from the localStorage-only Bloc notepad.
create table if not exists public.fp_resource_notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  content_item_id   uuid not null references public.fp_content_items(id) on delete cascade,
  timestamp_seconds integer not null default 0 check (timestamp_seconds >= 0),
  body              text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Tasks.
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

-- Notas del Bloc. La copia local en localStorage se mantiene como cache/
-- respaldo instantaneo; esta tabla es la fuente de verdad para poder
-- recuperar las notas desde cualquier dispositivo. Borrado es blando
-- (deleted_at) para poder ofrecer una papelera con restaurar.
create table if not exists public.bloc_notes (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  title        text        not null default 'Documento sin titulo',
  content_html text        not null default '',
  content_text text        not null default '',
  is_favorite  boolean     not null default false,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
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
create index if not exists profiles_cycle_filter_idx        on public.profiles(cycle_group, cycle_code, academic_year);
create index if not exists fp_cycles_group_idx              on public.fp_cycles(group_code, is_active);
create index if not exists fp_content_items_type_idx        on public.fp_content_items(type);
create index if not exists fp_content_items_status_idx      on public.fp_content_items(status);
create index if not exists fp_content_items_source_year_idx on public.fp_content_items(source_year);
create index if not exists fp_content_cycle_fit_cycle_idx   on public.fp_content_cycle_fit(cycle_group, cycle_code, priority, fit_score);
create index if not exists fp_content_cycle_fit_year_idx    on public.fp_content_cycle_fit(audience_year);
create index if not exists fp_user_content_state_user_idx   on public.fp_user_content_state(user_id, status, is_favorite);
create index if not exists fp_cycle_skills_cycle_idx        on public.fp_cycle_skills(cycle_code, etapa, orden_global);
create index if not exists fp_item_competencies_skill_idx   on public.fp_item_competencies(skill_id, tipo_relacion);
create index if not exists fp_resource_notes_user_item_idx  on public.fp_resource_notes(user_id, content_item_id, timestamp_seconds);
create index if not exists tasks_user_due_idx               on public.tasks(user_id, due_date, status);
create index if not exists bloc_notes_user_idx              on public.bloc_notes(user_id, deleted_at, updated_at);
create index if not exists reminders_user_remind_idx        on public.reminders(user_id, remind_at);
create index if not exists quick_links_user_favorite_idx    on public.quick_links(user_id, is_favorite);

-- ── Triggers updated_at ──────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'users','profiles','sources','quick_searches','opportunities',
    'hackathons','courses','tasks','bloc_notes','reminders','quick_links',
    'fp_cycles','fp_content_items','fp_content_cycle_fit','fp_user_content_state',
    'fp_skills','fp_cycle_skills','fp_item_competencies','fp_resource_notes'
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

-- ── job_applications ──────────────────────────────────────────────────────────
create table if not exists public.job_applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete cascade not null,
  company_name text not null,
  company_url  text not null,
  job_title    text not null,
  job_url      text,
  source       text not null default 'radar',
  page_hash    text,
  status       text not null default 'nueva',
  detected_at  timestamptz not null default now(),
  applied_at   timestamptz,
  notes        jsonb not null default '[]',
  is_new       boolean not null default true,
  is_saved     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists job_applications_user_status
  on public.job_applications(user_id, status);

create index if not exists job_applications_user_new
  on public.job_applications(user_id, is_new)
  where is_new = true;

drop trigger if exists set_job_applications_updated_at on public.job_applications;
create trigger set_job_applications_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();
