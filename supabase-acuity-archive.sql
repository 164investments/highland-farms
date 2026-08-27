-- Full Acuity archive table: every appointment (active + canceled), archived
-- before the native calendar cutover so nothing is lost when Acuity is
-- eventually decommissioned. Service-role only; no anon/authenticated access.
create table if not exists acuity_archive_appointments (
  id bigint primary key,
  datetime timestamptz,
  datetime_created timestamptz,
  appointment_type_id bigint,
  type text,
  calendar_id bigint,
  first_name text,
  last_name text,
  email text,
  phone text,
  amount_paid_cents int,
  price_cents int,
  canceled boolean,
  raw jsonb,
  archived_at timestamptz default now()
);

alter table acuity_archive_appointments enable row level security;
revoke all on acuity_archive_appointments from anon, authenticated;
