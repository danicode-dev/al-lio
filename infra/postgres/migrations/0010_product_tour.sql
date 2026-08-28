-- Interactive product tour (issue #194): the guided first run that teaches
-- AL-LIO by driving the real interface, plus the origin marking every row it
-- creates carries so demo content can always be told apart from a student's
-- own work.
--
-- Additive only.

-- ── Tour state ───────────────────────────────────────────────────────────────
-- Deliberately NOT reusing profiles.onboarding_completed_at /
-- onboarding_version: those already belong to the profile-setup wizard at
-- /onboarding (cycle, year, interests) and gate the whole dashboard from
-- getGlobalStore. Overloading them would make "finished choosing my cycle"
-- and "watched the product tour" the same fact, and skipping the tour would
-- lock the student out of the app. These are a separate, independent axis.
alter table public.profiles
  add column if not exists product_tour_status text not null default 'not_started',
  add column if not exists product_tour_version integer not null default 0,
  add column if not exists product_tour_step text,
  add column if not exists product_tour_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_product_tour_status_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_product_tour_status_valid check (
        product_tour_status in ('not_started', 'in_progress', 'completed', 'skipped')
      );
  end if;
end
$$;

-- ── Demo-row origin ──────────────────────────────────────────────────────────
-- Two columns, identical on every table the tour (and later the Product Lab,
-- issue #195) can write to, so cleanup is always one exact predicate:
--   where user_id = <session user> and demo_source is not null
-- and never a heuristic over titles. demo_dataset_id groups the rows created
-- by a single run, so one dataset can be removed without touching another.
--
-- bloc_notes already carries source_type/source_id for learning resources
-- (migration 0004). Those stay untouched: they answer "which resource is this
-- note attached to", a different question with its own unique index, and
-- widening their CHECK would entangle two unrelated concerns.
alter table public.tasks
  add column if not exists demo_source text,
  add column if not exists demo_dataset_id uuid;

alter table public.bloc_notes
  add column if not exists demo_source text,
  add column if not exists demo_dataset_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_demo_source_valid' and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_demo_source_valid check (
        demo_source is null or demo_source in ('onboarding', 'internal_test')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bloc_notes_demo_source_valid' and conrelid = 'public.bloc_notes'::regclass
  ) then
    alter table public.bloc_notes
      add constraint bloc_notes_demo_source_valid check (
        demo_source is null or demo_source in ('onboarding', 'internal_test')
      );
  end if;
end
$$;

-- Partial: real rows are the overwhelming majority and never enter the index.
create index if not exists tasks_demo_source_idx
  on public.tasks(user_id, demo_dataset_id)
  where demo_source is not null;

create index if not exists bloc_notes_demo_source_idx
  on public.bloc_notes(user_id, demo_dataset_id)
  where demo_source is not null;
