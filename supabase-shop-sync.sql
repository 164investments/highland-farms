-- Highland Farms — Square POS ↔ website link (2026-08-26)
--
-- Ties the website's inventory to the Square account the farm already rings
-- sales up on, so the same physical plush can't be sold in both places.
--
-- Direction of truth, once a variant is mapped and Square is tracking it:
--   Square is authoritative for the COUNT. The website's shop_inventory.stock
--   is a cache kept fresh by the inventory.count.updated webhook.
-- Until a variant is mapped, shop_inventory.stock stays authoritative on its
-- own, exactly as it is today. Mapping is therefore incremental and safe.

-- ── mapping + ops columns ────────────────────────────────────────────────────
alter table shop_inventory add column if not exists square_variation_id text;
alter table shop_inventory add column if not exists square_item_name    text;
alter table shop_inventory add column if not exists low_stock_threshold integer not null default 3;
alter table shop_inventory add column if not exists synced_from_square_at timestamptz;

-- One Square variation cannot back two website variants, or a single POS sale
-- would decrement two different things.
create unique index if not exists shop_inventory_square_variation_uniq
  on shop_inventory (square_variation_id)
  where square_variation_id is not null;

alter table shop_orders add column if not exists square_order_id text;
alter table shop_orders add column if not exists channel         text not null default 'online';
alter table shop_orders add column if not exists refunded_cents  integer not null default 0;

alter table shop_orders drop constraint if exists shop_orders_channel_check;
alter table shop_orders add constraint shop_orders_channel_check
  check (channel in ('online', 'pos'));

-- ── webhook idempotency ──────────────────────────────────────────────────────
-- Square retries a webhook until it gets a 2xx, so the same event id WILL
-- arrive more than once. Without this, a retried refund double-counts.
create table if not exists shop_webhook_events (
  event_id    text primary key,
  event_type  text not null,
  received_at timestamptz not null default now()
);

alter table shop_webhook_events enable row level security;
revoke all on shop_webhook_events from public, anon, authenticated;

-- ── record a POS/Square-side stock change ────────────────────────────────────
-- Called by the inventory.count.updated webhook. Writes the count Square
-- reports, which is the whole point: a sale rung up at the farm lands here and
-- the website stops offering the unit.
--
-- Deliberately an UPDATE, never an insert: a Square variation we don't have a
-- mapping for is not ours to track.
create or replace function sync_square_stock(p_variation_id text, p_quantity integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update shop_inventory
  set stock = greatest(p_quantity, 0),
      synced_from_square_at = now(),
      updated_at = now()
  where square_variation_id = p_variation_id;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function sync_square_stock(text, integer) from public, anon, authenticated;
grant execute on function sync_square_stock(text, integer) to service_role;

-- ── link a website variant to a Square variation ─────────────────────────────
create or replace function map_square_variant(
  p_variant_id text,
  p_square_variation_id text,
  p_square_item_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update shop_inventory
  set square_variation_id = nullif(p_square_variation_id, ''),
      square_item_name    = nullif(p_square_item_name, ''),
      updated_at          = now()
  where variant_id = p_variant_id;

  if not found then
    raise exception 'unknown variant %', p_variant_id using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function map_square_variant(text, text, text) from public, anon, authenticated;
grant execute on function map_square_variant(text, text, text) to service_role;
