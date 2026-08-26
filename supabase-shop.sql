-- Highland Farms farm-store commerce schema (2026-08-26)
--
-- Replaces the cancelled Squarespace store. Three tables:
--   shop_inventory   — live stock per variant, so selling out needs no deploy
--   shop_orders      — one row per paid order
--   shop_order_items — the lines of that order, priced at time of sale
--
-- SECURITY: RLS on, NO anon/authenticated grants. Every read and write goes
-- through the server with the service-role key. This follows the 2026-08-05
-- remediation, where ten sc_* tables shipped with RLS off and full anon CRUD.

create table if not exists shop_inventory (
  variant_id  text primary key,
  stock       integer,                    -- null = unlimited / made to order
  updated_at  timestamptz not null default now()
);

create table if not exists shop_orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique,
  status              text not null default 'paid',
  fulfillment         text not null check (fulfillment in ('pickup', 'delivery')),
  customer_name       text not null,
  customer_email      text not null,
  customer_phone      text not null,
  delivery_address    text,
  delivery_city       text,
  delivery_zip        text,
  notes               text,
  subtotal_cents      integer not null check (subtotal_cents >= 0),
  delivery_fee_cents  integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents         integer not null check (total_cents >= 0),
  square_payment_id   text,
  created_at          timestamptz not null default now(),
  -- A delivery order without an address is unfulfillable; refuse it at the DB.
  constraint delivery_needs_address check (
    fulfillment <> 'delivery'
    or (delivery_address is not null and delivery_zip is not null)
  )
);

create table if not exists shop_order_items (
  id                bigserial primary key,
  order_id          uuid not null references shop_orders(id) on delete cascade,
  variant_id        text not null,
  product_slug      text not null,
  product_name      text not null,
  variant_label     text,
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  quantity          integer not null check (quantity > 0)
);

create index if not exists shop_order_items_order_id_idx on shop_order_items (order_id);
create index if not exists shop_orders_created_at_idx on shop_orders (created_at desc);

alter table shop_inventory   enable row level security;
alter table shop_orders      enable row level security;
alter table shop_order_items enable row level security;

revoke all on shop_inventory   from anon, authenticated;
revoke all on shop_orders      from anon, authenticated;
revoke all on shop_order_items from anon, authenticated;

-- Atomically reserve stock for a whole cart.
--
-- Takes [{"variant_id": "...", "quantity": n}, ...]. Decrements every tracked
-- line in ONE statement-level transaction and raises if any line is short, so
-- two shoppers racing for the last plush cannot both succeed. Rows with a NULL
-- stock are unlimited and pass through untouched.
--
-- Called BEFORE the card is charged, so a customer is never charged for a cut
-- that just sold out. A declined card hands the units back via
-- release_shop_stock().
create or replace function claim_shop_stock(items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  line record;
  remaining integer;
begin
  for line in
    select (e ->> 'variant_id') as variant_id,
           (e ->> 'quantity')::integer as quantity
    from jsonb_array_elements(items) as e
    order by 1                       -- stable lock order: avoids deadlocks
  loop
    select stock into remaining
    from shop_inventory
    where variant_id = line.variant_id
    for update;

    if not found then
      raise exception 'unknown variant %', line.variant_id
        using errcode = 'P0002';
    end if;

    if remaining is null then
      continue;                      -- unlimited
    end if;

    if remaining < line.quantity then
      raise exception 'insufficient stock for % (have %, need %)',
        line.variant_id, remaining, line.quantity
        using errcode = 'P0001';
    end if;

    update shop_inventory
    set stock = stock - line.quantity,
        updated_at = now()
    where variant_id = line.variant_id;
  end loop;
end;
$$;

-- ⛔ REVOKE FROM **PUBLIC**, not just anon/authenticated.
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and grants are
-- additive: revoking from `anon` does NOT remove the PUBLIC grant that `anon`
-- inherits. Unlike the tables (RLS-on with zero policies = deny-all), a function
-- has no RLS gate — EXECUTE is the only gate. Getting this wrong left both stock
-- RPCs callable by anyone holding the public anon key, which is public by design.
revoke all on function claim_shop_stock(jsonb) from public, anon, authenticated;
grant execute on function claim_shop_stock(jsonb) to service_role;

-- Give stock back when a charge fails after we reserved it.
--
-- The checkout reserves stock BEFORE charging the card, so a declined card
-- must put the units back. Releasing is deliberately forgiving: it never
-- raises, because a failed release must not turn a clean "card declined"
-- into a 500 for the customer. Unlimited rows stay untouched.
create or replace function release_shop_stock(items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update shop_inventory i
  set stock = i.stock + c.quantity,
      updated_at = now()
  from (
    select (e ->> 'variant_id') as variant_id,
           (e ->> 'quantity')::integer as quantity
    from jsonb_array_elements(items) as e
  ) c
  where i.variant_id = c.variant_id
    and i.stock is not null;
end;
$$;

revoke all on function release_shop_stock(jsonb) from public, anon, authenticated;
grant execute on function release_shop_stock(jsonb) to service_role;

-- Record a paid order and its lines in ONE transaction.
--
-- Two separate inserts could leave an order row with no line items — an order
-- the farm can see but cannot pick. A plpgsql function runs in a single
-- transaction, so either both land or neither does.
create or replace function record_shop_order(order_row jsonb, order_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into shop_orders (
    order_number, status, fulfillment, customer_name, customer_email,
    customer_phone, delivery_address, delivery_city, delivery_zip, notes,
    subtotal_cents, delivery_fee_cents, total_cents, square_payment_id
  )
  values (
    order_row ->> 'order_number',
    coalesce(order_row ->> 'status', 'paid'),
    order_row ->> 'fulfillment',
    order_row ->> 'customer_name',
    order_row ->> 'customer_email',
    order_row ->> 'customer_phone',
    order_row ->> 'delivery_address',
    order_row ->> 'delivery_city',
    order_row ->> 'delivery_zip',
    order_row ->> 'notes',
    (order_row ->> 'subtotal_cents')::integer,
    (order_row ->> 'delivery_fee_cents')::integer,
    (order_row ->> 'total_cents')::integer,
    order_row ->> 'square_payment_id'
  )
  returning id into new_id;

  insert into shop_order_items (
    order_id, variant_id, product_slug, product_name,
    variant_label, unit_price_cents, quantity
  )
  select
    new_id,
    e ->> 'variant_id',
    e ->> 'product_slug',
    e ->> 'product_name',
    e ->> 'variant_label',
    (e ->> 'unit_price_cents')::integer,
    (e ->> 'quantity')::integer
  from jsonb_array_elements(order_items) as e;

  return new_id;
end;
$$;

revoke all on function record_shop_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function record_shop_order(jsonb, jsonb) to service_role;
