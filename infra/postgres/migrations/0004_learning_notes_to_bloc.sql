alter table public.bloc_notes
  add column if not exists source_type text,
  add column if not exists source_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bloc_notes_source_pair_valid'
      and conrelid = 'public.bloc_notes'::regclass
  ) then
    alter table public.bloc_notes
      add constraint bloc_notes_source_pair_valid check (
        (source_type is null and source_id is null)
        or (source_type = 'learning_resource' and char_length(btrim(source_id)) > 0)
      );
  end if;
end
$$;

create unique index if not exists bloc_notes_user_source_unique_idx
  on public.bloc_notes(user_id, source_type, source_id)
  where source_type is not null and source_id is not null;

with learning_note_groups as (
  select
    note.user_id,
    resource.id as resource_id,
    resource.title,
    resource.provider,
    resource.slug,
    resource.is_active,
    min(note.created_at) as created_at,
    max(note.updated_at) as updated_at,
    string_agg(
      '<hr><p><strong>'
        || case
          when note.timestamp_seconds >= 3600 then
            (note.timestamp_seconds / 3600)::text || ':'
            || lpad(((note.timestamp_seconds % 3600) / 60)::text, 2, '0') || ':'
            || lpad((note.timestamp_seconds % 60)::text, 2, '0')
          else
            (note.timestamp_seconds / 60)::text || ':'
            || lpad((note.timestamp_seconds % 60)::text, 2, '0')
        end
        || '</strong>'
        || case when resource.is_active then
          ' · <a href="/aprende/' || resource.slug || '?at=' || note.timestamp_seconds::text || '">Ir al momento</a>'
        else ' · Recurso archivado' end
        || '</p><p>'
        || replace(replace(replace(replace(replace(replace(note.body,
          '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;'), chr(10), '<br>')
        || '</p>',
      '' order by note.timestamp_seconds, note.created_at
    ) as note_html,
    string_agg(
      '['
        || case
          when note.timestamp_seconds >= 3600 then
            (note.timestamp_seconds / 3600)::text || ':'
            || lpad(((note.timestamp_seconds % 3600) / 60)::text, 2, '0') || ':'
            || lpad((note.timestamp_seconds % 60)::text, 2, '0')
          else
            (note.timestamp_seconds / 60)::text || ':'
            || lpad((note.timestamp_seconds % 60)::text, 2, '0')
        end
        || '] ' || note.body,
      E'\n\n' order by note.timestamp_seconds, note.created_at
    ) as note_text
  from public.fp_learning_notes note
  join public.fp_learning_resources resource on resource.id = note.resource_id
  group by note.user_id, resource.id, resource.title, resource.provider, resource.slug, resource.is_active
)
insert into public.bloc_notes (
  user_id,
  title,
  content_html,
  content_text,
  source_type,
  source_id,
  created_at,
  updated_at
)
select
  user_id,
  title,
  '<p><strong>Vídeo:</strong> '
    || replace(replace(replace(replace(replace(title, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;')
    || '</p><p><strong>Canal:</strong> '
    || replace(replace(replace(replace(replace(provider, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;')
    || '</p>' || note_html,
  'Vídeo: ' || title || E'\nCanal: ' || provider || E'\n\n' || note_text,
  'learning_resource',
  resource_id,
  created_at,
  updated_at
from learning_note_groups
on conflict (user_id, source_type, source_id)
  where source_type is not null and source_id is not null
do nothing;
