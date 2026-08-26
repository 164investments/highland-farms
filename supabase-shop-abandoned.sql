-- Abandoned cart recovery (2026-08-26)
--
-- The store had no way to reach someone who left mid-checkout: email was only
-- collected on the final submit, so an abandoned cart was anonymous and gone.
-- This captures the address as soon as it's typed and keeps a snapshot of the
-- cart alongside it.
--
-- ⛔ ITEMS ARE STORED AS VARIANT IDS AND QUANTITIES, NEVER PRICES. The same rule
-- the checkout follows: prices are re-derived from the catalog when the cart is
-- restored. A snapshot that remembered prices would let a two-day-old email
-- check out at a price we no longer charge — and Square is the price source now,
-- so those move without us.
--
-- subtotal_cents IS stored, but only so the reminder email and any reporting can
-- show what the cart was worth at the time. It is never used to charge.

create table if not exists shop_abandoned_carts (
  id              uuid primary key default gen_random_uuid(),
  -- Unguessable; it is the credential in the recovery link.
  recovery_token  text not null unique,
  email           text not null,
  name            text,
  phone           text,
  fulfillment     text,
  items           jsonb not null,
  subtotal_cents  integer not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Lifecycle. Each is set once and gates the next send.
  reminder_1_at   timestamptz,
  reminder_2_at   timestamptz,
  recovered_at    timestamptz,      -- they came back and ordered
  clicked_at      timestamptz,      -- opened the recovery link
  unsubscribed_at timestamptz,

  -- One open cart per person. A shopper editing their cart updates this row
  -- rather than queuing a second reminder for the same abandonment.
  unique (email)
);

create index if not exists shop_abandoned_due_idx
  on shop_abandoned_carts (updated_at)
  where recovered_at is null and unsubscribed_at is null;

alter table shop_abandoned_carts enable row level security;
revoke all on shop_abandoned_carts from public, anon, authenticated;

-- Upsert the shopper's in-progress cart.
--
-- Re-typing an email or adding an item refreshes updated_at, which restarts the
-- "how long have they been gone" clock. That is deliberate: someone actively
-- editing their cart has not abandoned it, and mailing them mid-shop is the
-- fastest way to look broken.
create or replace function save_abandoned_cart(
  p_token       text,
  p_email       text,
  p_name        text,
  p_phone       text,
  p_fulfillment text,
  p_items       jsonb,
  p_subtotal    integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_token text;
begin
  insert into shop_abandoned_carts
    (recovery_token, email, name, phone, fulfillment, items, subtotal_cents)
  values
    (p_token, lower(trim(p_email)), nullif(trim(p_name), ''), nullif(trim(p_phone), ''),
     p_fulfillment, p_items, greatest(p_subtotal, 0))
  on conflict (email) do update
    set name        = coalesce(nullif(trim(p_name), ''),  shop_abandoned_carts.name),
        phone       = coalesce(nullif(trim(p_phone), ''), shop_abandoned_carts.phone),
        fulfillment = p_fulfillment,
        items       = p_items,
        subtotal_cents = greatest(p_subtotal, 0),
        updated_at  = now(),
        -- A NEW cart after a completed order is a fresh chance, so clear the
        -- previous lifecycle. Unsubscribes are NEVER cleared.
        reminder_1_at = case when shop_abandoned_carts.recovered_at is not null
                             then null else shop_abandoned_carts.reminder_1_at end,
        reminder_2_at = case when shop_abandoned_carts.recovered_at is not null
                             then null else shop_abandoned_carts.reminder_2_at end,
        clicked_at    = case when shop_abandoned_carts.recovered_at is not null
                             then null else shop_abandoned_carts.clicked_at end,
        recovered_at  = null
  returning recovery_token into existing_token;

  return existing_token;
end;
$$;

revoke all on function save_abandoned_cart(text,text,text,text,text,jsonb,integer)
  from public, anon, authenticated;
grant execute on function save_abandoned_cart(text,text,text,text,text,jsonb,integer)
  to service_role;

-- Mark every open cart for this email as recovered. Called after a paid order so
-- a reminder can never chase someone who already bought.
create or replace function mark_cart_recovered(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update shop_abandoned_carts
  set recovered_at = now(), updated_at = now()
  where email = lower(trim(p_email)) and recovered_at is null;
end;
$$;

revoke all on function mark_cart_recovered(text) from public, anon, authenticated;
grant execute on function mark_cart_recovered(text) to service_role;
