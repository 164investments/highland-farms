-- Highland Farms native booking schema (2026-08-27)
--
-- Replaces Acuity as the calendar of record. Wall-clock schedule times are
-- America/Los_Angeles strings ('HH:MM'); instants are timestamptz.
--
-- SECURITY: RLS on, no anon/authenticated grants, and every function revokes
-- PUBLIC explicitly (a new function is PUBLIC-executable by default and has no
-- RLS gate — the shop shipped that hole once; never again).

create table if not exists booking_schedules (
  id             bigserial primary key,
  product_slug   text not null,
  weekday        smallint not null check (weekday between 0 and 6), -- 0 = Sunday, Pacific
  start_times    text[] not null,          -- 'HH:MM' Pacific wall clock
  capacity       integer not null check (capacity > 0), -- units: parties (tour) / seats (spa)
  effective_from date not null default current_date,
  effective_to   date,
  created_at     timestamptz not null default now()
);

create table if not exists booking_schedule_exceptions (
  id           bigserial primary key,
  product_slug text not null,
  on_date      date not null,              -- Pacific date
  start_times  text[],                     -- null = CLOSED that day; else replaces the weekday rule
  capacity     integer,                    -- null = keep the rule's capacity
  note         text,
  created_at   timestamptz not null default now(),
  unique (product_slug, on_date)
);

create table if not exists booking_blackouts (
  id            bigserial primary key,
  kind          text not null default 'closure'
                  check (kind in ('wedding', 'closure', 'private_event')),
  starts_on     date not null,
  ends_on       date not null,
  product_slugs text[] not null default '{farm-tour,nordic-spa}',
  note          text,
  created_at    timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  booking_number   text not null unique,
  product_slug     text not null,
  starts_at        timestamptz not null,
  duration_min     integer not null check (duration_min > 0),
  party_size       integer not null check (party_size > 0),
  -- units this booking consumes against slot capacity:
  -- a private tour takes the whole slot (1); a spa seat is per person (= party_size)
  units            integer not null check (units > 0),
  status           text not null default 'pending'
                     check (status in ('pending','confirmed','cancelled','completed','no_show')),
  hold_expires_at  timestamptz,
  combo_group      uuid,                   -- both legs of a Full Farm Day share this
  first_name       text not null,
  last_name        text not null,
  email            text not null,
  phone            text not null,
  amount_cents     integer not null default 0 check (amount_cents >= 0),
  square_payment_id text,
  gift_certificate_code text,
  gift_amount_cents integer not null default 0 check (gift_amount_cents >= 0),
  referral_source  text,
  policy_agreed_at timestamptz,
  location_choice  text check (location_choice in ('meet','in_person')), -- consults only
  google_event_id  text,
  meet_link        text,
  acuity_id        bigint unique,          -- set on Phase-3 imported rows
  source           text not null default 'native'
                     check (source in ('native','acuity_import','admin')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists bookings_slot_idx
  on bookings (product_slug, starts_at)
  where status in ('pending','confirmed');
create index if not exists bookings_email_idx on bookings (email);
create index if not exists bookings_starts_at_idx on bookings (starts_at);

create table if not exists booking_reminders (
  id         bigserial primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  kind       text not null check (kind in ('48h','morning_of')),
  sent_at    timestamptz not null default now(),
  unique (booking_id, kind)
);

create table if not exists gift_certificates (
  code              text primary key,
  kind              text not null check (kind in ('value','visits')),
  product_scope     text,                  -- null = any product
  initial_units     integer not null check (initial_units > 0),  -- cents (value) or visits
  remaining_units   integer not null check (remaining_units >= 0),
  purchaser_email   text,
  recipient_email   text,
  square_payment_id text,
  acuity_order_id   bigint,
  status            text not null default 'active'
                      check (status in ('active','depleted','void')),
  expires_at        timestamptz,
  created_at        timestamptz not null default now()
);

create table if not exists booking_audit (
  id         bigserial primary key,
  actor      text not null,               -- 'system' | 'admin' | admin identifier
  action     text not null,
  booking_id uuid,
  detail     jsonb,
  created_at timestamptz not null default now()
);

alter table booking_schedules            enable row level security;
alter table booking_schedule_exceptions  enable row level security;
alter table booking_blackouts            enable row level security;
alter table bookings                     enable row level security;
alter table booking_reminders            enable row level security;
alter table gift_certificates            enable row level security;
alter table booking_audit                enable row level security;

revoke all on booking_schedules, booking_schedule_exceptions, booking_blackouts,
  bookings, booking_reminders, gift_certificates, booking_audit
  from anon, authenticated;

-- Atomically hold capacity for one booking (1 leg) or a combo (2 legs).
--
-- legs: [{"product_slug","starts_at","duration_min","capacity","party_size",
--         "units","amount_cents"}, ...]  — capacity comes from the engine's
-- schedule lookup for that exact slot; the RPC enforces it under lock.
-- booking: shared customer fields.
-- Returns the created booking ids (status 'pending', 10-minute hold).
create or replace function claim_booking_slots(legs jsonb, booking jsonb)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  leg record;
  used integer;
  new_id uuid;
  ids uuid[] := '{}';
  grp uuid := null;
begin
  if jsonb_array_length(legs) > 1 then
    grp := gen_random_uuid();
  end if;

  for leg in
    select (e ->> 'product_slug')             as product_slug,
           (e ->> 'starts_at')::timestamptz   as starts_at,
           (e ->> 'duration_min')::integer    as duration_min,
           (e ->> 'capacity')::integer        as capacity,
           (e ->> 'party_size')::integer      as party_size,
           (e ->> 'units')::integer           as units,
           (e ->> 'amount_cents')::integer    as amount_cents
    from jsonb_array_elements(legs) as e
    order by 1, 2                             -- stable lock order across legs
  loop
    if leg.product_slug is null or leg.starts_at is null
       or leg.duration_min is null or leg.capacity is null
       or leg.party_size is null or leg.units is null
       or leg.amount_cents is null then
      raise exception 'malformed leg: %', to_jsonb(leg) using errcode = 'P0002';
    end if;

    perform pg_advisory_xact_lock(
      hashtext(leg.product_slug || '|' || leg.starts_at::text)
    );

    select coalesce(sum(units), 0) into used
    from bookings
    where product_slug = leg.product_slug
      and starts_at = leg.starts_at
      and (status = 'confirmed'
           or (status = 'pending' and hold_expires_at > now()));

    if used + leg.units > leg.capacity then
      raise exception 'slot full for % at % (used %, capacity %)',
        leg.product_slug, leg.starts_at, used, leg.capacity
        using errcode = 'P0001';
    end if;

    insert into bookings (
      booking_number, product_slug, starts_at, duration_min, party_size, units,
      status, hold_expires_at, combo_group,
      first_name, last_name, email, phone, amount_cents,
      referral_source, policy_agreed_at, location_choice, source
    ) values (
      -- single leg keeps the bare number; combo legs get -1 / -2 suffixes so
      -- the unique constraint holds while the customer sees one number
      (booking ->> 'booking_number')
        || case when grp is null then ''
           else '-' || (coalesce(array_length(ids, 1), 0) + 1)::text end,
      leg.product_slug, leg.starts_at, leg.duration_min, leg.party_size, leg.units,
      'pending', now() + interval '10 minutes', grp,
      booking ->> 'first_name', booking ->> 'last_name',
      booking ->> 'email', booking ->> 'phone',
      leg.amount_cents,
      booking ->> 'referral_source',
      nullif(booking ->> 'policy_agreed_at', '')::timestamptz,
      nullif(booking ->> 'location_choice', ''),
      coalesce(booking ->> 'source', 'native')
    )
    returning id into new_id;

    ids := ids || new_id;
  end loop;

  return ids;
end;
$$;

-- Flip pending holds to confirmed after the money is taken.
create or replace function confirm_bookings(
  p_ids uuid[], p_payment_id text, p_gift_code text, p_gift_cents integer
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  update bookings
  set status = 'confirmed',
      hold_expires_at = null,
      square_payment_id = p_payment_id,
      gift_certificate_code = case when id = p_ids[1] then p_gift_code else null end,
      gift_amount_cents = case when id = p_ids[1] then coalesce(p_gift_cents, 0) else 0 end,
      updated_at = now()
  where id = any(p_ids) and status = 'pending';
end;
$$;

-- Hand a hold back after a failed charge. Forgiving by design.
create or replace function release_bookings(p_ids uuid[])
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from bookings where id = any(p_ids) and status = 'pending';
end;
$$;

-- Cron sweep: a crash between claim and release must not leak a seat forever.
create or replace function sweep_expired_booking_holds()
returns integer
language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
  delete from bookings
  where status = 'pending' and hold_expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Atomically consume gift-certificate units. Returns the units actually
-- applied (min of requested and remaining). Raises P0001 on bad/expired code.
create or replace function redeem_gift_certificate(p_code text, p_requested integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  cert record;
  applied integer;
begin
  select * into cert from gift_certificates
  where code = p_code
  for update;

  if not found or cert.status <> 'active'
     or (cert.expires_at is not null and cert.expires_at < now()) then
    raise exception 'gift certificate not usable' using errcode = 'P0001';
  end if;

  applied := least(cert.remaining_units, p_requested);
  if applied <= 0 then
    raise exception 'gift certificate depleted' using errcode = 'P0001';
  end if;

  update gift_certificates
  set remaining_units = remaining_units - applied,
      status = case when remaining_units - applied = 0 then 'depleted' else 'active' end
  where code = p_code;

  return applied;
end;
$$;

-- Give units back when the charge after a redemption fails.
create or replace function restore_gift_certificate(p_code text, p_units integer)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update gift_certificates
  set remaining_units = remaining_units + p_units,
      status = 'active'
  where code = p_code
    and status <> 'void';
end;
$$;

revoke all on function claim_booking_slots(jsonb, jsonb)                 from public, anon, authenticated;
revoke all on function confirm_bookings(uuid[], text, text, integer)     from public, anon, authenticated;
revoke all on function release_bookings(uuid[])                          from public, anon, authenticated;
revoke all on function sweep_expired_booking_holds()                     from public, anon, authenticated;
revoke all on function redeem_gift_certificate(text, integer)            from public, anon, authenticated;
revoke all on function restore_gift_certificate(text, integer)           from public, anon, authenticated;

grant execute on function claim_booking_slots(jsonb, jsonb)              to service_role;
grant execute on function confirm_bookings(uuid[], text, text, integer)  to service_role;
grant execute on function release_bookings(uuid[])                       to service_role;
grant execute on function sweep_expired_booking_holds()                  to service_role;
grant execute on function redeem_gift_certificate(text, integer)         to service_role;
grant execute on function restore_gift_certificate(text, integer)        to service_role;
