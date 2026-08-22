alter table public.radar_items
  add column if not exists destination text not null default 'news',
  add column if not exists semantic_key char(64);

update public.radar_items
set destination = case
  when (title || ' ' || summary || ' ' || array_to_string(topics, ' ')) !~*
    '\m(grado superior|ciclo formativo|matr[ií]cula|admisi[oó]n|escolarizaci[oó]n|oferta educativa)\M'
    and (title || ' ' || summary || ' ' || array_to_string(topics, ' ')) ~*
    '\m(cursos?|taller(es)?|formaci[oó]n|certificaci[oó]n(es)?|certificados?|webinar(es|s)?|seminarios?|masterclass)\M'
    then 'course'
  when title ~*
    '\m(hackathons?|retos?|challenges?|concursos?|competici[oó]n(es)?|jornadas?|congresos?|ferias?|encuentros?|eventos?)\M'
    then 'event'
  when kind in ('event', 'call') then 'event'
  else 'news'
end;

update public.radar_items
set semantic_key = encode(digest(
  destination || '|' || lower(regexp_replace(title, '[^[:alnum:]]+', ' ', 'g')) || '|' ||
  coalesce(event_starts_at::date::text, published_at::date::text, '') || '|' ||
  lower(coalesce(locality, province, '')),
  'sha256'
), 'hex')
where semantic_key is null;

alter table public.radar_items alter column semantic_key set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'radar_items_destination_valid'
      and conrelid = 'public.radar_items'::regclass
  ) then
    alter table public.radar_items
      add constraint radar_items_destination_valid
      check (destination in ('news', 'course', 'event'));
  end if;
end;
$$;

alter table public.radar_deliveries drop constraint if exists radar_deliveries_schema_version_check;
alter table public.radar_deliveries drop constraint if exists radar_deliveries_schema_version_v3_check;
update public.radar_deliveries set schema_version = 3 where schema_version = 2;
alter table public.radar_deliveries
  add constraint radar_deliveries_schema_version_v3_check check (schema_version = 3);

alter table public.radar_items drop constraint if exists radar_items_schema_version_check;
alter table public.radar_items drop constraint if exists radar_items_schema_version_v3_check;
update public.radar_items set schema_version = 3 where schema_version = 2;
alter table public.radar_items
  add constraint radar_items_schema_version_v3_check check (schema_version = 3);

create index if not exists radar_items_destination_semantic_idx
  on public.radar_items(destination, semantic_key);

alter table public.fp_content_items add column if not exists radar_semantic_key char(64);
create unique index if not exists fp_content_items_radar_semantic_key_uidx
  on public.fp_content_items(radar_semantic_key)
  where radar_semantic_key is not null;

insert into public.fp_content_items (
  id_slug, type, title, description, entity, location, province, start_date, end_date,
  status, source_url, tags, suggested_action, last_reviewed_at, notes, source_year,
  radar_semantic_key
)
select
  'radar-' || item.destination || '-' || left(item.semantic_key, 32),
  case
    when item.destination = 'course' then 'curso_complementario'
    when item.title ~* '\mhackathons?\M' then 'hackathon'
    when item.title ~* '\m(retos?|challenges?|concursos?|competici[oó]n(es)?)\M' then 'reto'
    else 'evento'
  end,
  item.title,
  item.summary,
  item.source_name,
  item.locality,
  item.province,
  item.event_starts_at::date,
  coalesce(item.event_ends_at, item.registration_deadline)::date,
  case
    when item.destination = 'course' then 'activo'
    when coalesce(item.registration_deadline, item.event_starts_at, item.event_ends_at) >= now() then 'abierto'
    else 'revisar'
  end,
  item.canonical_url,
  array(select distinct tag from unnest(item.topics || item.module_codes) as tags(tag) where btrim(tag) <> ''),
  case when item.destination = 'course' then 'Revisar la formación y guardar si encaja con tu objetivo.'
       else 'Revisar requisitos y fechas antes de participar.' end,
  item.reviewed_at::date,
  'Fuente validada por Radar. ' || item.review_reason,
  extract(year from coalesce(item.published_at, item.fetched_at))::integer::text,
  item.semantic_key
from (
  select distinct on (semantic_key) *
  from public.radar_items
  where destination in ('course', 'event')
  order by semantic_key, fetched_at desc
) item
on conflict (radar_semantic_key) where radar_semantic_key is not null do update set
  type = excluded.type,
  title = excluded.title,
  description = excluded.description,
  entity = excluded.entity,
  location = excluded.location,
  province = excluded.province,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  status = excluded.status,
  source_url = excluded.source_url,
  tags = excluded.tags,
  suggested_action = excluded.suggested_action,
  last_reviewed_at = excluded.last_reviewed_at,
  notes = excluded.notes,
  source_year = excluded.source_year,
  updated_at = now();

with radar_cycle_targets as (
  select
    content.id as content_item_id,
    cycle_code,
    bool_or(item.trust_tier in ('official', 'first_party')) as high_trust
  from public.radar_items item
  inner join public.fp_content_items content on content.radar_semantic_key = item.semantic_key
  cross join lateral unnest(item.target_cycle_codes) as cycles(cycle_code)
  where item.destination in ('course', 'event')
  group by content.id, cycle_code
)
insert into public.fp_content_cycle_fit (
  content_item_id, cycle_code, cycle_group, priority, fit_score, audience_year
)
select
  content_item_id,
  cycle_code,
  case when cycle_code in ('DAW', 'DAM') then 'DEV' else cycle_code end,
  case when high_trust then 'Alta' else 'Media' end,
  case when high_trust then 5 else 4 end,
  null
from radar_cycle_targets
on conflict (content_item_id, cycle_code) do update set
  cycle_group = excluded.cycle_group,
  priority = excluded.priority,
  fit_score = excluded.fit_score,
  updated_at = now();
