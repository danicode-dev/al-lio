-- Add typed v4 news classification metadata used by the authorised list/detail contract.
alter table public.radar_content_occurrences
  add column if not exists language text,
  add column if not exists match_reasons text[] not null default '{}';

alter table public.radar_content_occurrences
  drop constraint if exists radar_content_occurrences_language_check;
alter table public.radar_content_occurrences
  add constraint radar_content_occurrences_language_check
  check (language is null or language = 'es');

create index if not exists radar_content_occurrences_news_order_idx
  on public.radar_content_occurrences(publication_decision, ranking_priority desc, source_published_at desc)
  where publication_decision = 'accepted';
