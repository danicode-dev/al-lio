-- Heart-based Saved model for Eventos y retos (issue #131).
--
-- Additive only, and no backfill is needed: the existing bookmark toggle
-- was only ever wired to fp_content_items-sourced items (stored in
-- fp_user_content_state.is_favorite, issue #96/#118 territory) - that data
-- is untouched by this migration. User-owned hackathons never had a save
-- affordance in the UI before this issue, so there is no prior state to
-- lose or migrate for them either; is_favorite starts false for every
-- existing row, which is the correct "not saved yet" default.
--
-- tech_opportunities-sourced events deliberately do not get a favorites
-- table in this migration - that catalogue has zero rows in every
-- environment checked while building this, and issue #120 already flagged
-- the identical decision (favoriting tech_opportunities-sourced courses)
-- as low priority, pending explicit confirmation from the owner. Add a
-- tech_opportunity_favorites table (mirroring company_favorites) in a
-- follow-up migration if that source is ever repopulated and needs it.
alter table public.hackathons
  add column if not exists is_favorite boolean not null default false;

create index if not exists hackathons_user_favorite_idx
  on public.hackathons(user_id, is_favorite);
