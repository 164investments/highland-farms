-- Highland Farms: durable hosted Stripe Checkout (manual capture).
-- Apply AFTER supabase-shop.sql, supabase-shop-sync.sql, supabase-booking.sql.
-- No existing Square RPC or Square identifier is repurposed by this migration.
-- Checkout authorizes; the server claims a durable lease BEFORE capture, then
-- finishes below only after Stripe confirms capture. Recovery repeats safely.
--
-- POS RACE BOUNDARY: inventory row locks serialize local reservation, the
-- latest received Square absolute count, and the pre-capture shortfall check.
-- They cannot lock the external Square register. A POS sale after that check,
-- or before its webhook arrives, can still consume a held unit. Processing
-- recovery retains the hold and finishes an already-captured payment rather
-- than cancelling it based on a later count. Operations must reconcile such a
-- physical shortfall; this migration does not claim cross-provider atomicity.
-- Shop effects freeze the first Square adjustment submission timestamp, not
-- the reservation timestamp, so a recount during hosted checkout cannot erase
-- the later sale. Recounts after that submission remain an external race.
-- An unresolved adjustment reaching Square's 24-hour timestamp limit retains
-- its reservation for explicit reconciliation; never silently re-date/release.
begin;

alter table shop_orders add column if not exists stripe_session_id text;
alter table shop_orders add column if not exists stripe_payment_intent_id text;
alter table bookings add column if not exists stripe_session_id text;
alter table bookings add column if not exists stripe_payment_intent_id text;
alter table gift_certificates add column if not exists stripe_session_id text;
alter table gift_certificates add column if not exists stripe_payment_intent_id text;
alter table bookings add column if not exists refunded_cents integer not null default 0;
alter table gift_certificates add column if not exists refunded_cents integer not null default 0;
-- A POS sale can consume held units. Remember the unavailable portion when
-- clamping displayed stock to zero so releasing a hold cannot invent stock.
alter table shop_inventory add column if not exists stripe_stock_shortfall integer not null default 0;
alter table shop_inventory add column if not exists square_count_calculated_at timestamptz;
alter table shop_inventory add column if not exists square_count_quantity integer;
create unique index if not exists shop_orders_stripe_pi_unique
  on shop_orders(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create unique index if not exists gift_certificates_stripe_pi_unique
  on gift_certificates(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index if not exists bookings_stripe_pi_idx
  on bookings(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

create table if not exists stripe_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  request_hash text not null,
  kind text not null check (kind in ('shop', 'booking', 'gift')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'expired', 'review')),
  reference text not null unique,
  amount_cents integer not null check (amount_cents >= 0),
  due_cents integer not null check (due_cents >= 0 and due_cents <= amount_cents),
  snapshot jsonb not null,
  stock_items jsonb not null default '[]',
  booking_ids uuid[] not null default '{}',
  gift_code text,
  gift_units integer not null default 0 check (gift_units >= 0),
  gift_applied_cents integer not null default 0 check (gift_applied_cents >= 0),
  session_id text unique,
  payment_intent_id text unique,
  expires_at timestamptz not null,
  processing_until timestamptz,
  result jsonb,
  notified_at timestamptz,
  square_synced_at timestamptz,
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_cents + gift_applied_cents = amount_cents)
);
alter table shop_orders add column if not exists stripe_attempt_id uuid references stripe_checkout_attempts(id);
alter table bookings add column if not exists stripe_attempt_id uuid references stripe_checkout_attempts(id);
alter table gift_certificates add column if not exists stripe_attempt_id uuid references stripe_checkout_attempts(id);
create unique index if not exists shop_orders_stripe_attempt_unique
  on shop_orders(stripe_attempt_id) where stripe_attempt_id is not null;
create index if not exists bookings_stripe_attempt_idx
  on bookings(stripe_attempt_id) where stripe_attempt_id is not null;
create unique index if not exists gift_certificates_stripe_attempt_unique
  on gift_certificates(stripe_attempt_id) where stripe_attempt_id is not null;
create index if not exists stripe_attempts_recovery_idx
  on stripe_checkout_attempts(updated_at, id)
  where status in ('pending', 'processing', 'review') or (status = 'paid' and notified_at is null);
create index if not exists stripe_attempts_booking_ids_idx
  on stripe_checkout_attempts using gin(booking_ids);
create unique index if not exists stripe_attempts_gift_code_unique
  on stripe_checkout_attempts((snapshot ->> 'code')) where kind = 'gift';
alter table stripe_checkout_attempts enable row level security;
revoke all on stripe_checkout_attempts from public, anon, authenticated;
grant select, insert, update on stripe_checkout_attempts to service_role;

-- Square still owns linked absolute counts. Read reservations only after taking
-- the same inventory-row lock as claim_shop_stock: a concurrent reservation
-- inserts its attempt before committing/releasing that lock.
create or replace function sync_square_stock_snapshot(p_variation_id text, p_quantity integer, p_calculated_at timestamptz)
returns integer language plpgsql security definer set search_path = public
as $$
declare
  variant text;
  reserved integer;
  known_at timestamptz;
  known_quantity integer;
begin
  if p_quantity is null or p_quantity < 0 then
    raise exception 'invalid Square inventory quantity' using errcode = '22023';
  end if;
  select variant_id, square_count_calculated_at, square_count_quantity into variant, known_at, known_quantity from shop_inventory
    where square_variation_id = p_variation_id for update;
  if not found then return 0; end if;
  -- Unknown legacy snapshots cannot replace known chronological truth. A
  -- binary rollback must keep the timestamp-aware webhook/inventory adapter.
  if known_at is not null and (p_calculated_at is null or p_calculated_at < known_at) then return -1; end if;
  if known_at = p_calculated_at and known_quantity is distinct from p_quantity then
    raise exception 'conflicting Square count at same calculated_at' using errcode = '22023';
  end if;
  select coalesce(sum((line ->> 'quantity')::integer), 0) into reserved
    from stripe_checkout_attempts a, jsonb_array_elements(a.stock_items) line
    where a.kind = 'shop' and line ->> 'variant_id' = variant
      and (a.status in ('pending', 'processing', 'review')
        or (a.status = 'paid' and a.square_synced_at is null));
  update shop_inventory set stock = greatest(p_quantity - reserved, 0),
    stripe_stock_shortfall = greatest(reserved - p_quantity, 0),
    square_count_calculated_at = p_calculated_at, square_count_quantity = p_quantity,
    synced_from_square_at = now(), updated_at = now() where variant_id = variant;
  return 1;
end;
$$;

-- Preserve the legacy two-argument signature without PostgREST overloads.
-- Unstamped updates work until the first authoritative timestamped count.
create or replace function sync_square_stock(p_variation_id text, p_quantity integer)
returns integer language sql security definer set search_path = public
as $$ select greatest(sync_square_stock_snapshot(p_variation_id, p_quantity, null), 0); $$;

create or replace function reserve_stripe_checkout(p_attempt jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  a stripe_checkout_attempts%rowtype;
  snap jsonb := p_attempt -> 'snapshot';
  items jsonb;
  cert gift_certificates%rowtype;
  ids uuid[] := '{}';
  gift_code text := nullif(upper(coalesce(p_attempt ->> 'gift_code', snap ->> 'giftCode')), '');
  gift_units integer := 0;
  gift_cents integer := 0;
  amount integer := (p_attempt ->> 'amount_cents')::integer;
  requested integer;
  per_seat integer;
  exp timestamptz := coalesce((p_attempt ->> 'expires_at')::timestamptz, now() + interval '45 minutes');
begin
  if nullif(p_attempt ->> 'idempotency_key', '') is null
    or nullif(p_attempt ->> 'request_hash', '') is null
    or nullif(p_attempt ->> 'reference', '') is null
    or jsonb_typeof(snap) is distinct from 'object' or amount is null or amount < 0 then
    raise exception 'malformed checkout attempt' using errcode = '22023';
  end if;
  -- Serialize absent rows as well as existing ones. A retry never claims twice.
  perform pg_advisory_xact_lock(hashtextextended('stripe:' || (p_attempt ->> 'idempotency_key'), 0));
  select * into a from stripe_checkout_attempts
    where idempotency_key = p_attempt ->> 'idempotency_key' for update;
  if found then
    if a.request_hash <> p_attempt ->> 'request_hash' or a.kind <> p_attempt ->> 'kind' then
      raise exception 'idempotency key reused with a different request' using errcode = '22023';
    end if;
    return to_jsonb(a);
  end if;
  if exp <= now() or exp > now() + interval '24 hours' then
    raise exception 'invalid checkout expiry' using errcode = '22023';
  end if;

  if p_attempt ->> 'kind' = 'shop' then
    if jsonb_typeof(snap -> 'items') is distinct from 'array'
      or jsonb_array_length(snap -> 'items') = 0
      or (snap #>> '{order,total_cents}')::integer is distinct from amount
      or snap #>> '{order,order_number}' is distinct from p_attempt ->> 'reference'
      or snap #>> '{order,fulfillment}' not in ('pickup', 'delivery')
      or nullif(snap #>> '{order,fulfillment}', '') is null
      or nullif(snap #>> '{order,customer_name}', '') is null
      or nullif(snap #>> '{order,customer_email}', '') is null
      or nullif(snap #>> '{order,customer_phone}', '') is null
      or (snap #>> '{order,fulfillment}' = 'delivery' and (
        nullif(snap #>> '{order,delivery_address}', '') is null
        or nullif(snap #>> '{order,delivery_zip}', '') is null))
      or coalesce((snap #>> '{order,subtotal_cents}')::integer, -1) < 0
      or coalesce((snap #>> '{order,delivery_fee_cents}')::integer, 0) < 0
      or exists (select 1 from jsonb_array_elements(snap -> 'items') e
        where nullif(e ->> 'variant_id', '') is null
          or nullif(e ->> 'product_slug', '') is null
          or nullif(e ->> 'product_name', '') is null
          or coalesce((e ->> 'quantity')::integer, 0) <= 0
          or coalesce((e ->> 'unit_price_cents')::integer, -1) < 0) then
      raise exception 'malformed shop snapshot' using errcode = '22023';
    end if;
    if exists (select 1 from shop_orders where order_number = p_attempt ->> 'reference') then
      raise exception 'order number already exists' using errcode = '23505';
    end if;
    if (select sum((e ->> 'quantity')::bigint * (e ->> 'unit_price_cents')::bigint)
      from jsonb_array_elements(snap -> 'items') e)
      is distinct from (snap #>> '{order,subtotal_cents}')::bigint
      or (snap #>> '{order,subtotal_cents}')::bigint
        + coalesce((snap #>> '{order,delivery_fee_cents}')::bigint, 0) <> amount then
      raise exception 'shop amount does not match snapshot' using errcode = '22023';
    end if;
    -- Derive/aggregate stock from the durable priced lines, avoiding duplicate
    -- variants that the legacy release RPC cannot safely aggregate itself.
    select jsonb_agg(jsonb_build_object('variant_id', variant_id, 'quantity', quantity) order by variant_id)
      into items from (
        select e ->> 'variant_id' variant_id, sum((e ->> 'quantity')::integer) quantity
        from jsonb_array_elements(snap -> 'items') e group by 1
      ) s;
    perform claim_shop_stock(items);
    gift_code := null;
  elsif p_attempt ->> 'kind' = 'booking' then
    if jsonb_typeof(snap -> 'legs') is distinct from 'array'
      or jsonb_array_length(snap -> 'legs') = 0
      or snap #>> '{customer,booking_number}' is distinct from p_attempt ->> 'reference'
      or (select sum((e ->> 'amount_cents')::bigint) from jsonb_array_elements(snap -> 'legs') e)
        is distinct from amount::bigint then
      raise exception 'malformed booking snapshot' using errcode = '22023';
    end if;
    ids := claim_booking_slots(snap -> 'legs', snap -> 'customer');
    update bookings set hold_expires_at = exp where id = any(ids);
    if gift_code is not null and amount > 0 then
      select * into cert from gift_certificates where code = gift_code for update;
      if not found or cert.status <> 'active'
        or (cert.expires_at is not null and cert.expires_at <= now())
        or (cert.kind = 'visits' and cert.product_scope is null)
        or (cert.product_scope is not null and exists (
          select 1 from jsonb_array_elements(snap -> 'legs') e
          where not (e ->> 'product_slug' = cert.product_scope
            or (cert.kind = 'value' and cert.product_scope = 'combo'
              and e ->> 'product_slug' in ('farm-tour', 'nordic-spa'))))) then
        raise exception 'gift certificate not usable for this experience' using errcode = 'P0001';
      end if;
      if cert.kind = 'visits' then
        -- Visits are seats, never cents. Scope rules reject mixed-product combos.
        if jsonb_array_length(snap -> 'legs') <> 1 then
          raise exception 'visit certificates require one booking leg' using errcode = '22023';
        end if;
        requested := (snap #>> '{legs,0,party_size}')::integer;
        if requested <= 0 or amount % requested <> 0 then
          raise exception 'invalid visit pricing' using errcode = '22023';
        end if;
        per_seat := amount / requested;
      else
        requested := amount;
      end if;
      gift_units := redeem_gift_certificate(gift_code, requested);
      gift_cents := case when cert.kind = 'visits' then least(amount, gift_units * per_seat) else gift_units end;
    else
      gift_code := null;
    end if;
  elsif p_attempt ->> 'kind' = 'gift' then
    if (snap #>> '{product,amountCents}')::integer is distinct from amount
      or coalesce((snap #>> '{product,units}')::integer, 0) <= 0
      or snap #>> '{product,kind}' not in ('value', 'visits')
      or nullif(snap #>> '{product,kind}', '') is null
      or nullif(snap ->> 'code', '') is null then
      raise exception 'malformed gift snapshot' using errcode = '22023';
    end if;
    if exists (select 1 from gift_certificates where code = snap ->> 'code') then
      raise exception 'gift code already exists' using errcode = '23505';
    end if;
    gift_code := null;
  else
    raise exception 'unknown checkout kind' using errcode = '22023';
  end if;

  insert into stripe_checkout_attempts (
    id, idempotency_key, request_hash, kind, reference, amount_cents,
    due_cents, snapshot, stock_items, booking_ids, gift_code, gift_units,
    gift_applied_cents, expires_at
  ) values (
    coalesce((p_attempt ->> 'id')::uuid, gen_random_uuid()), p_attempt ->> 'idempotency_key',
    p_attempt ->> 'request_hash', p_attempt ->> 'kind', p_attempt ->> 'reference', amount,
    amount - gift_cents, snap, coalesce(items, '[]'::jsonb), ids,
    gift_code, gift_units, gift_cents, exp
  ) returning * into a;
  return to_jsonb(a);
end;
$$;

create or replace function attach_stripe_session(p_id uuid, p_session_id text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  a stripe_checkout_attempts%rowtype;
begin
  select * into strict a from stripe_checkout_attempts where id = p_id for update;
  if nullif(p_session_id, '') is null or (a.session_id is not null and a.session_id <> p_session_id) then
    raise exception 'checkout session binding mismatch' using errcode = '22023';
  end if;
  if a.session_id is null then
    if a.status <> 'pending' then
      raise exception 'cannot attach session to closed attempt' using errcode = '22023';
    end if;
    update stripe_checkout_attempts set session_id = p_session_id, updated_at = now()
      where id = p_id returning * into a;
  end if;
  return to_jsonb(a);
end;
$$;

create or replace function claim_stripe_attempt(p_id uuid, p_payment_intent_id text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare a stripe_checkout_attempts%rowtype;
begin
  select * into strict a from stripe_checkout_attempts where id = p_id for update;
  if (a.payment_intent_id is not null and a.payment_intent_id is distinct from p_payment_intent_id)
    or (a.due_cents > 0 and nullif(p_payment_intent_id, '') is null)
    or (a.due_cents = 0 and p_payment_intent_id is not null) then
    raise exception 'checkout payment binding mismatch' using errcode = '22023';
  end if;
  if a.status in ('paid', 'expired', 'review')
    or (a.status = 'pending' and a.expires_at <= now())
    or (a.status = 'processing' and a.processing_until > now()) then
    return jsonb_build_object('acquired', false, 'attempt', to_jsonb(a));
  end if;
  if a.kind = 'shop' and a.status = 'pending' then
    -- Recheck POS consumption immediately before capture, using the same row
    -- locks as absolute-count sync. Recovery of a processing attempt must
    -- bypass this check: its payment could already have been captured.
    perform 1 from shop_inventory i
      join jsonb_array_elements(a.stock_items) e on i.variant_id = e ->> 'variant_id'
      order by i.variant_id for update of i;
    if exists (select 1 from shop_inventory i
      join jsonb_array_elements(a.stock_items) e on i.variant_id = e ->> 'variant_id'
      where i.square_variation_id is not null and i.stripe_stock_shortfall > 0) then
      return jsonb_build_object('acquired', false, 'attempt', to_jsonb(a));
    end if;
  end if;
  -- Never let the generic 10-minute hold sweep delete a charged booking after
  -- an application crash. Only explicit safe expiry below releases these rows.
  update bookings set hold_expires_at = 'infinity'::timestamptz, updated_at = now()
    where id = any(a.booking_ids) and status = 'pending';
  if (select count(*) from bookings where id = any(a.booking_ids) and status = 'pending')
    <> cardinality(a.booking_ids) then
    raise exception 'booking hold missing before capture' using errcode = 'P0001';
  end if;
  update stripe_checkout_attempts
    set status = 'processing', processing_until = now() + interval '2 minutes',
        payment_intent_id = p_payment_intent_id, updated_at = now()
    where id = p_id returning * into a;
  return jsonb_build_object('acquired', true, 'attempt', to_jsonb(a));
end;
$$;

create or replace function finish_stripe_checkout(p_id uuid, p_payment_intent_id text, p_paid_cents integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  a stripe_checkout_attempts%rowtype;
  new_id uuid;
  row_data jsonb;
  outcome jsonb;
  affected integer;
  cert_expires_at timestamptz;
begin
  select * into strict a from stripe_checkout_attempts where id = p_id for update;
  if a.payment_intent_id is distinct from p_payment_intent_id
    or p_paid_cents is distinct from a.due_cents
    or (a.due_cents > 0 and nullif(p_payment_intent_id, '') is null) then
    raise exception 'checkout paid amount or payment binding mismatch' using errcode = '22023';
  end if;
  if a.status = 'paid' then return to_jsonb(a); end if;
  if a.status <> 'processing' then
    raise exception 'checkout must be claimed before finalization' using errcode = '22023';
  end if;
  if a.kind = 'shop' then
    row_data := a.snapshot -> 'order';
    -- Explicit columns prevent a Stripe ID ever reaching a Square ID column.
    insert into shop_orders (
      order_number, status, fulfillment, customer_name, customer_email,
      customer_phone, delivery_address, delivery_city, delivery_zip, notes,
      subtotal_cents, delivery_fee_cents, total_cents, channel,
      stripe_session_id, stripe_payment_intent_id, refunded_cents, stripe_attempt_id
    ) values (
      a.reference, case when a.refunded_cents >= a.due_cents and a.due_cents > 0 then 'refunded'
        when a.refunded_cents > 0 then 'partially_refunded' else 'paid' end,
      row_data ->> 'fulfillment', row_data ->> 'customer_name',
      row_data ->> 'customer_email', row_data ->> 'customer_phone',
      row_data ->> 'delivery_address', row_data ->> 'delivery_city',
      row_data ->> 'delivery_zip', row_data ->> 'notes',
      (row_data ->> 'subtotal_cents')::integer,
      coalesce((row_data ->> 'delivery_fee_cents')::integer, 0), a.amount_cents,
      'online', a.session_id, p_payment_intent_id, a.refunded_cents, a.id
    ) returning id into new_id;
    insert into shop_order_items (
      order_id, variant_id, product_slug, product_name, variant_label, unit_price_cents, quantity
    ) select new_id, e ->> 'variant_id', e ->> 'product_slug', e ->> 'product_name',
      e ->> 'variant_label', (e ->> 'unit_price_cents')::integer, (e ->> 'quantity')::integer
      from jsonb_array_elements(a.snapshot -> 'items') e;
    outcome := jsonb_build_object('orderId', new_id, 'orderNumber', a.reference);
  elsif a.kind = 'booking' then
    update bookings set status = 'confirmed', hold_expires_at = null,
      stripe_session_id = a.session_id, stripe_payment_intent_id = p_payment_intent_id, stripe_attempt_id = a.id,
      gift_certificate_code = case when id = a.booking_ids[1] then a.gift_code else null end,
      gift_amount_cents = case when id = a.booking_ids[1] then a.gift_applied_cents else 0 end,
      updated_at = now()
      where id = any(a.booking_ids) and status = 'pending';
    get diagnostics affected = row_count;
    if affected <> cardinality(a.booking_ids) then
      raise exception 'booking hold missing during finalization' using errcode = 'P0001';
    end if;
    outcome := jsonb_build_object('bookingIds', a.booking_ids, 'bookingNumber', a.reference);
  else
    cert_expires_at := case when coalesce((a.snapshot #>> '{product,expiryDays}')::integer, 0) > 0
      then a.created_at + make_interval(days => (a.snapshot #>> '{product,expiryDays}')::integer) else null end;
    insert into gift_certificates (
      code, kind, product_scope, initial_units, remaining_units,
      purchaser_email, recipient_email, stripe_session_id, stripe_payment_intent_id, status, refunded_cents, stripe_attempt_id, expires_at
    ) values (
      a.snapshot ->> 'code', a.snapshot #>> '{product,kind}',
      a.snapshot #>> '{product,productScope}', (a.snapshot #>> '{product,units}')::integer,
      (a.snapshot #>> '{product,units}')::integer, a.snapshot ->> 'purchaserEmail',
      nullif(a.snapshot ->> 'recipientEmail', ''), a.session_id, p_payment_intent_id, 'active', a.refunded_cents, a.id, cert_expires_at
    );
    outcome := jsonb_build_object('code', a.snapshot ->> 'code', 'reference', a.reference, 'expiresAt', cert_expires_at);
  end if;
  update stripe_checkout_attempts set status = 'paid', result = outcome,
    processing_until = null, updated_at = now() where id = p_id returning * into a;
  return to_jsonb(a);
end;
$$;

-- TRUST BOUNDARY: service-role callers MUST prove the Checkout session expired
-- AND any PaymentIntent canceled (or no PI exists) before invoking this RPC.
-- A local timeout, declined authorization, or network error is NOT that proof.
-- This explicit gateway precondition allows recovery of processing attempts
-- without ever returning capacity while an ambiguous payment could capture.
create or replace function expire_stripe_checkout(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  a stripe_checkout_attempts%rowtype;
  line record;
begin
  select * into strict a from stripe_checkout_attempts where id = p_id for update;
  if a.status in ('paid', 'expired') then return to_jsonb(a); end if;
  if a.status not in ('pending', 'processing', 'review') then
    raise exception 'checkout cannot be expired' using errcode = '22023';
  end if;
  if a.kind = 'shop' then
    for line in select e ->> 'variant_id' variant_id, (e ->> 'quantity')::integer quantity
      from jsonb_array_elements(a.stock_items) e order by 1
    loop
      update shop_inventory set
        stock = stock + greatest(line.quantity - stripe_stock_shortfall, 0),
        stripe_stock_shortfall = greatest(stripe_stock_shortfall - line.quantity, 0),
        updated_at = now()
        where variant_id = line.variant_id and stock is not null;
    end loop;
  end if;
  if a.gift_code is not null and a.gift_units > 0 then
    perform restore_gift_certificate(a.gift_code, a.gift_units);
  end if;
  perform release_bookings(a.booking_ids);
  update stripe_checkout_attempts set status = 'expired', processing_until = null,
    updated_at = now() where id = p_id returning * into a;
  return to_jsonb(a);
end;
$$;

-- Freeze downstream payload once (including a resolved Meet link) so partial
-- email retries keep the exact same body and provider idempotency key.
create or replace function set_stripe_effects_data(p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare a stripe_checkout_attempts%rowtype;
begin
  select * into strict a from stripe_checkout_attempts where id = p_id for update;
  if a.status <> 'paid' or jsonb_typeof(p_data) is distinct from 'object' then
    raise exception 'effects data requires a paid checkout and object payload' using errcode = '22023';
  end if;
  if not (a.snapshot ? 'effectsData') then
    update stripe_checkout_attempts
      set snapshot = jsonb_set(snapshot, '{effectsData}', p_data), updated_at = now()
      where id = p_id returning * into a;
  end if;
  return a.snapshot -> 'effectsData';
end;
$$;

-- Stripe events can repeat or arrive out of order. Persist the canonical
-- cumulative refunded amount monotonically; never add webhook refund deltas.
-- This records money only: cancellation and gift reinstatement/voiding require
-- their own explicit domain action. Unknown Stripe payments are a no-op.
create or replace function record_stripe_refund(p_payment_intent_id text, p_refunded_cents integer)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  a stripe_checkout_attempts%rowtype;
  refunded integer;
  gift_left integer;
  refund_left integer;
  gift_on_leg integer;
  cash_on_leg integer;
  leg record;
begin
  select * into a from stripe_checkout_attempts where payment_intent_id = p_payment_intent_id for update;
  if not found then return false; end if;
  if p_refunded_cents is null or p_refunded_cents < 0 or p_refunded_cents > a.due_cents then
    raise exception 'refund amount outside captured checkout amount' using errcode = '22023';
  end if;
  refunded := greatest(a.refunded_cents, p_refunded_cents);
  update stripe_checkout_attempts set refunded_cents = refunded, updated_at = now() where id = a.id;
  update shop_orders set refunded_cents = greatest(refunded_cents, refunded),
    status = case when refunded >= a.due_cents then 'refunded'
      when refunded > 0 then 'partially_refunded' else status end
    where stripe_payment_intent_id = p_payment_intent_id;
  update gift_certificates set refunded_cents = greatest(refunded_cents, refunded)
    where stripe_payment_intent_id = p_payment_intent_id;
  -- Allocate gift credit and cumulative cash refund in the durable booking
  -- leg order. This keeps sum(refunded_cents) equal to cash refunded for a
  -- combo, even when a universal gift covered more than the first leg.
  gift_left := a.gift_applied_cents;
  refund_left := refunded;
  for leg in select b.id, b.amount_cents from unnest(a.booking_ids) with ordinality ids(id, position)
    join bookings b on b.id = ids.id order by ids.position
  loop
    gift_on_leg := least(gift_left, leg.amount_cents);
    cash_on_leg := leg.amount_cents - gift_on_leg;
    update bookings set refunded_cents = greatest(refunded_cents, least(refund_left, cash_on_leg)),
      updated_at = now() where id = leg.id;
    refund_left := greatest(refund_left - cash_on_leg, 0);
    gift_left := gift_left - gift_on_leg;
  end loop;
  return true;
end;
$$;

-- Refunds (when requested) must succeed at Stripe BEFORE this domain action.
-- The attempt lock serializes cancellation retries and gift restoration for
-- the whole combo. Zero-charge bookings are identified by attempt ID too.
create or replace function cancel_stripe_booking(p_attempt_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  a stripe_checkout_attempts%rowtype;
  customer bookings%rowtype;
  ids uuid[] := '{}';
  legs jsonb;
  gift_restored boolean := false;
begin
  select * into strict a from stripe_checkout_attempts where id = p_attempt_id for update;
  if a.kind <> 'booking' or a.status <> 'paid' then
    raise exception 'only finalized booking attempts can be cancelled' using errcode = '22023';
  end if;
  perform 1 from bookings where id = any(a.booking_ids) order by id for update;
  if cardinality(a.booking_ids) = 0
    or (select count(*) from bookings where id = any(a.booking_ids)) <> cardinality(a.booking_ids)
    or exists (select 1 from bookings where id = any(a.booking_ids)
      and (stripe_attempt_id is distinct from a.id or status not in ('confirmed', 'cancelled'))) then
    raise exception 'booking group is missing, consumed, or belongs to another checkout' using errcode = '22023';
  end if;
  select * into customer from bookings where id = any(a.booking_ids) order by booking_number limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('productSlug', product_slug, 'startsAt', starts_at)
    order by booking_number), '[]'::jsonb) into legs from bookings where id = any(a.booking_ids);
  if exists (select 1 from bookings where id = any(a.booking_ids) and status = 'confirmed') then
    if a.gift_units > 0 and a.gift_code is not null and exists (
      select 1 from bookings where id = any(a.booking_ids) and status = 'confirmed'
        and gift_certificate_code = a.gift_code and gift_amount_cents > 0
    ) then
      perform 1 from gift_certificates where code = a.gift_code and status <> 'void' for update;
      if found then
        perform restore_gift_certificate(a.gift_code, a.gift_units);
        gift_restored := true;
      end if;
    end if;
    with cancelled as (
      update bookings set status = 'cancelled', updated_at = now()
        where id = any(a.booking_ids) and status = 'confirmed' returning id
    ) select coalesce(array_agg(id order by id), '{}'::uuid[]) into ids from cancelled;
    insert into booking_audit(actor, action, booking_id, detail)
      select 'admin', 'stripe_booking_cancelled', id,
        jsonb_build_object('attemptId', a.id, 'reason', p_reason, 'giftRestored', gift_restored)
        from unnest(ids) id;
  end if;
  return jsonb_build_object('cancelledIds', ids, 'bookingNumber', a.reference,
    'customerName', coalesce(customer.first_name || ' ' || customer.last_name, ''),
    'customerEmail', customer.email, 'legs', legs, 'giftRestored', gift_restored);
end;
$$;

-- Keep legacy Square/admin behavior, but Stripe holds are released exclusively
-- by verified gateway reconciliation, never by a blind local-time sweep.
create or replace function sweep_expired_booking_holds()
returns integer language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
  delete from bookings b where b.status = 'pending' and b.hold_expires_at < now()
    and not exists (select 1 from stripe_checkout_attempts a
      where a.booking_ids @> array[b.id] and a.status in ('pending', 'processing', 'review', 'paid'));
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function reserve_stripe_checkout(jsonb) from public, anon, authenticated;
revoke all on function attach_stripe_session(uuid, text) from public, anon, authenticated;
revoke all on function claim_stripe_attempt(uuid, text) from public, anon, authenticated;
revoke all on function finish_stripe_checkout(uuid, text, integer) from public, anon, authenticated;
revoke all on function expire_stripe_checkout(uuid) from public, anon, authenticated;
revoke all on function sweep_expired_booking_holds() from public, anon, authenticated;
revoke all on function sync_square_stock(text, integer) from public, anon, authenticated;
revoke all on function sync_square_stock_snapshot(text, integer, timestamptz) from public, anon, authenticated;
revoke all on function set_stripe_effects_data(uuid, jsonb) from public, anon, authenticated;
revoke all on function record_stripe_refund(text, integer) from public, anon, authenticated;
revoke all on function cancel_stripe_booking(uuid, text) from public, anon, authenticated;
grant execute on function reserve_stripe_checkout(jsonb) to service_role;
grant execute on function attach_stripe_session(uuid, text) to service_role;
grant execute on function claim_stripe_attempt(uuid, text) to service_role;
grant execute on function finish_stripe_checkout(uuid, text, integer) to service_role;
grant execute on function expire_stripe_checkout(uuid) to service_role;
grant execute on function sweep_expired_booking_holds() to service_role;
grant execute on function sync_square_stock(text, integer) to service_role;
grant execute on function sync_square_stock_snapshot(text, integer, timestamptz) to service_role;
grant execute on function set_stripe_effects_data(uuid, jsonb) to service_role;
grant execute on function record_stripe_refund(text, integer) to service_role;
grant execute on function cancel_stripe_booking(uuid, text) to service_role;

commit;
