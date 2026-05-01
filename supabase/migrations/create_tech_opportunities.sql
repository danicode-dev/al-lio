-- tech_opportunities: shared reference table (no user_id, no RLS per user)
-- Import via scripts/import-tech-opportunities.mjs using SUPABASE_SERVICE_ROLE_KEY

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.tech_opportunities (
  id                   uuid        primary key default gen_random_uuid(),
  id_slug              text        unique not null,
  categoria            text,
  nombre               text        not null,
  entidad              text,
  area_o_tipo          text,
  modalidad            text,
  localidad            text,
  provincia            text,
  fecha_inicio         date,
  fecha_fin            date,
  estado               text,
  certificacion_o_premio text,
  practicas_empresa    text,
  horas_totales        integer,
  horas_practicas      integer,
  coste                text,
  requisitos_resumen   text,
  encaje_daw_1_5       integer,
  prioridad            text,
  tags                 text,
  fuente_url           text,
  ultima_revision      date,
  notas                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_tech_opp_id_slug       on public.tech_opportunities (id_slug);
create index if not exists idx_tech_opp_categoria     on public.tech_opportunities (categoria);
create index if not exists idx_tech_opp_prioridad     on public.tech_opportunities (prioridad);
create index if not exists idx_tech_opp_provincia     on public.tech_opportunities (provincia);
create index if not exists idx_tech_opp_fecha_inicio  on public.tech_opportunities (fecha_inicio);
create index if not exists idx_tech_opp_encaje_daw    on public.tech_opportunities (encaje_daw_1_5);

alter table public.tech_opportunities enable row level security;

-- Authenticated users can read all opportunities (shared public data)
drop policy if exists "tech_opportunities_select" on public.tech_opportunities;
create policy "tech_opportunities_select"
  on public.tech_opportunities for select
  to authenticated
  using (true);

-- Service role (import script) can do everything; no explicit policy needed
-- because service_role bypasses RLS by default in Supabase.

drop trigger if exists tech_opportunities_updated_at on public.tech_opportunities;
create trigger tech_opportunities_updated_at
  before update on public.tech_opportunities
  for each row execute function public.set_updated_at();
