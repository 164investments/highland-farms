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

revoke all on function claim_shop_stock(jsonb) from anon, authenticated;

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

revoke all on function release_shop_stock(jsonb) from anon, authenticated;
