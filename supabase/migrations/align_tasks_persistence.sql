-- Align remote tasks table with the app's persistent to-do fields.
-- Safe to run more than once.

alter table public.tasks
  add column if not exists description text,
  add column if not exists category text default 'personal',
  add column if not exists completed_at timestamptz,
  add column if not exists progress_notes jsonb default '[]'::jsonb,
  add column if not exists reminder_at timestamptz,
  add column if not exists related_type text,
  add column if not exists related_id uuid;

update public.tasks
set progress_notes = '[]'::jsonb
where progress_notes is null;

alter table public.tasks
  alter column progress_notes set default '[]'::jsonb,
  alter column progress_notes set not null;

create index if not exists tasks_user_due_idx
  on public.tasks(user_id, due_date, status);
