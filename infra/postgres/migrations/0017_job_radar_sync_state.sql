-- Manual Job Radar synchronisation (POST /api/job-radar/sync) had only an
-- in-process cooldown. That does not survive a restart and does not hold across
-- instances, so an authenticated browser, script or double submission could
-- repeatedly trigger the expensive outbound scrape and database writes, and two
-- requests for the same user could race while updating the same dataset.
--
-- This durable per-user guard gives the route a Postgres-backed cooldown plus a
-- single-flight lock: `running_since` is set while a sync is in flight (cleared
-- on completion or failure, or ignored once older than the stale threshold so a
-- crashed run cannot wedge the user forever), and `last_attempt_at` records the
-- start of the most recent attempt so the cooldown survives a failed run.
--
-- Additive: one small table keyed by the user id, cascading with the user. No
-- change to Job Radar data, ranking or visible behaviour.

create table if not exists public.job_radar_sync_state (
  user_id uuid primary key references public.users(id) on delete cascade,
  running_since timestamptz,
  last_attempt_at timestamptz not null default now()
);
