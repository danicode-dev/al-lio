-- Explicit per-user competency completion, replacing the previous inference
-- from linked-resource completion (issue #96). A competency with no linked
-- learning resource can now be marked complete on its own; row existence is
-- the completion signal, matching how completion has always behaved in the
-- UI (a one-way "mark done", no richer status lifecycle needed here).
create table if not exists public.fp_user_competency_state (
  user_id      uuid not null references public.users(id) on delete cascade,
  skill_id     text not null references public.fp_skills(id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, skill_id)
);

-- No separate user_id index: the (user_id, skill_id) primary key's b-tree
-- already serves user_id-only lookups via the leftmost-prefix rule, and
-- every current query filters on skill_id too, so a redundant single-column
-- index would add write cost with no matching read pattern to justify it.

drop trigger if exists set_fp_user_competency_state_updated_at on public.fp_user_competency_state;
create trigger set_fp_user_competency_state_updated_at
  before update on public.fp_user_competency_state
  for each row execute function public.set_updated_at();
