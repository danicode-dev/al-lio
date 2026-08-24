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

create index if not exists fp_user_competency_state_user_id_idx on public.fp_user_competency_state(user_id);
