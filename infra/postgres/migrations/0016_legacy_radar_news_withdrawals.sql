-- Legacy Radar deliveries predate canonical v4 publication decisions. Keep
-- those immutable rows and private user state, but allow an audited operator
-- withdrawal to remove unsafe content from every user-facing news query.

alter table public.radar_items
  add column if not exists withdrawn_at timestamptz,
  add column if not exists withdrawn_by text,
  add column if not exists withdrawal_reason text;

alter table public.radar_items
  add constraint radar_items_withdrawal_audit_required check (
    (
      withdrawn_at is null
      and withdrawn_by is null
      and withdrawal_reason is null
    )
    or (
      withdrawn_at is not null
      and nullif(btrim(withdrawn_by), '') is not null
      and nullif(btrim(withdrawal_reason), '') is not null
    )
  );
