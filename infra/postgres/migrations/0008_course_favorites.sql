-- Heart-based Saved model for Cursos (issue #120), mirroring the hackathon
-- favorites migration (0007) exactly.
--
-- Additive only. public.courses already has user_id (unlike companies), so
-- a plain boolean column is enough - no join table needed. Existing rows
-- default to false ("not saved yet"), which is correct: there was no save
-- affordance in the UI before this issue.
--
-- fp_content_items-sourced courses reuse the existing
-- fp_user_content_state.is_favorite mechanism (issue #96/#118 territory)
-- via toggleFpFavorite - untouched by this migration.
--
-- tech_opportunities-sourced courses deliberately do not get a favorites
-- table here either, for the identical reason already documented in
-- 0007_hackathon_favorites.sql for the sibling hackathon case: that
-- catalogue has zero rows in every environment checked, and issue #120
-- itself flags this as low priority pending explicit owner confirmation.
-- Add a tech_opportunity_favorites table (mirroring company_favorites) in a
-- follow-up migration if that source is ever repopulated and needs it.
alter table public.courses
  add column if not exists is_favorite boolean not null default false;

create index if not exists courses_user_favorite_idx
  on public.courses(user_id, is_favorite);
