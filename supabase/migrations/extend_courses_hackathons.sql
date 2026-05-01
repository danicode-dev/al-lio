-- Extend courses and hackathons with CSV import fields.
-- Import scripts upsert by (user_id, id_slug).

alter table public.courses
  add column if not exists id_slug text,
  add column if not exists entidad text,
  add column if not exists area text,
  add column if not exists modalidad text,
  add column if not exists localidad text,
  add column if not exists provincia text,
  add column if not exists formato text,
  add column if not exists certificacion_tipo text,
  add column if not exists certificacion_oficial boolean,
  add column if not exists practicas_empresa boolean,
  add column if not exists horas_totales integer,
  add column if not exists horas_practicas integer,
  add column if not exists fecha_inicio date,
  add column if not exists fecha_fin date,
  add column if not exists estado text,
  add column if not exists coste text,
  add column if not exists requisitos_resumen text,
  add column if not exists encaje_daw_1_5 integer check (encaje_daw_1_5 between 1 and 5),
  add column if not exists prioridad text default 'Media' check (prioridad in ('Alta','Media','Baja')),
  add column if not exists tags text,
  add column if not exists fuente_url text,
  add column if not exists ultima_revision date;

alter table public.hackathons
  add column if not exists id_slug text,
  add column if not exists categoria text,
  add column if not exists modalidad text,
  add column if not exists localidad text,
  add column if not exists inscripcion_hasta date,
  add column if not exists certificacion_o_premio text,
  add column if not exists practicas_empresa boolean,
  add column if not exists encaje_daw_1_5 integer check (encaje_daw_1_5 between 1 and 5),
  add column if not exists tags text,
  add column if not exists incluido_en_readme_original boolean,
  add column if not exists ultima_revision date;

create unique index if not exists courses_user_id_slug_key
  on public.courses (user_id, id_slug);

create unique index if not exists hackathons_user_id_slug_key
  on public.hackathons (user_id, id_slug);

create index if not exists courses_user_prioridad_idx
  on public.courses (user_id, prioridad);

create index if not exists hackathons_user_priority_idx
  on public.hackathons (user_id, priority);
