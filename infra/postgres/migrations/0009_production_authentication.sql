-- Production authentication (issue #132): email confirmation on
-- registration, password reset with real session revocation, and Google
-- sign-in as a first-class identity method distinct from Calendar consent.
--
-- Additive only.

-- email_confirmed_at gates login for password accounts created through
-- public registration (see src/lib/auth/register.ts). Existing rows are
-- backfilled to their created_at below so this migration never locks out
-- an account that already existed before registration required
-- confirmation - the confirmation requirement only applies going forward.
alter table public.users
  add column if not exists email_confirmed_at timestamptz;

update public.users
  set email_confirmed_at = created_at
  where email_confirmed_at is null;

-- security_stamp is embedded in the signed session cookie at login time and
-- re-checked against this column wherever a session is resolved with a
-- database round trip already in flight (getGlobalStore - see
-- src/lib/data.ts). Regenerating it (password reset, and available for any
-- future "sign out everywhere" action) invalidates every previously issued
-- session without needing server-side session storage. Middleware's fast
-- path (src/middleware.ts, Edge runtime, no database access) intentionally
-- keeps verifying only the cryptographic signature - revocation takes
-- effect on the next real page load, not at the edge.
alter table public.users
  add column if not exists security_stamp uuid not null default gen_random_uuid();

-- auth_tokens covers both email-confirmation and password-reset links with
-- one shared, single-use, short-lived, hash-stored, rate-limited discipline
-- (see src/lib/auth/tokens.ts). Only the hash is stored; the raw token
-- exists only in the emailed link and is never persisted or logged.
create table if not exists public.auth_tokens (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users(id) on delete cascade,
  purpose     text        not null check (purpose in ('email_confirm', 'password_reset')),
  token_hash  text        not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists auth_tokens_user_purpose_idx
  on public.auth_tokens(user_id, purpose);

create index if not exists auth_tokens_expires_at_idx
  on public.auth_tokens(expires_at);

-- external_identities links a verified Google identity to an AL-LÍO user,
-- independent of whether that user also has a password. One user can only
-- ever be claimed by one Google account per provider (unique constraint) -
-- linking logic (src/lib/auth/google-signin.ts) never overwrites an
-- existing link with a different Google identity.
create table if not exists public.external_identities (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.users(id) on delete cascade,
  provider          text        not null check (provider in ('google')),
  provider_user_id  text        not null,
  email             text        not null,
  created_at        timestamptz not null default now(),
  unique(provider, provider_user_id)
);

create index if not exists external_identities_user_idx
  on public.external_identities(user_id);

-- Replaces the previous in-process Map in src/lib/auth/login-rate-limit.ts.
-- A single Node process's in-memory map is fine until the process restarts
-- (silently resetting every limit) or this ever runs as more than one
-- instance - a shared table survives both. Rows are cheap and
-- self-describing (bucket_key is already a salted SHA-256 digest, never
-- raw email/IP); expired rows are opportunistically deleted by the
-- application, not by a separate cron job.
create table if not exists public.rate_limit_buckets (
  bucket_key  text        primary key,
  count       integer     not null default 1,
  reset_at    timestamptz not null
);

create index if not exists rate_limit_buckets_reset_at_idx
  on public.rate_limit_buckets(reset_at);
