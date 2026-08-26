-- Cart-reminder A/B test (2026-08-26)
--
-- ⛔ TWO INDEPENDENT RANDOMISATIONS, NOT A SIX-CELL GRID.
--
-- Testing 3 variants × 2 senders as one 6-cell experiment would need roughly six
-- times the traffic to say anything, and this store will not produce that. So
-- variant and sender are assigned independently and read as two separate
-- questions: "which argument works" across ~1/3 each, and "who should sign it"
-- across ~1/2 each. Same traffic, two answerable questions instead of one
-- unanswerable one. (If a variant×sender interaction ever looks real, that needs
-- its own dedicated test.)
--
-- Assignment happens ONCE, when the cart is first saved, and is stable for the
-- whole sequence. A shopper who gets Connor at 1h must not get Jalene at 24h.

alter table shop_abandoned_carts
  add column if not exists variant text,
  add column if not exists sender  text;

alter table shop_abandoned_carts drop constraint if exists shop_abandoned_variant_check;
alter table shop_abandoned_carts add constraint shop_abandoned_variant_check
  check (variant is null or variant in ('A', 'B', 'C'));

alter table shop_abandoned_carts drop constraint if exists shop_abandoned_sender_check;
alter table shop_abandoned_carts add constraint shop_abandoned_sender_check
  check (sender is null or sender in ('jalene', 'connor'));

-- Assign on first save only. `coalesce` keeps an existing assignment, so a
-- shopper editing their cart never switches arm mid-sequence.
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
  pick_variant   text := (array['A','B','C'])[floor(random()*3)::int + 1];
  pick_sender    text := (array['jalene','connor'])[floor(random()*2)::int + 1];
begin
  insert into shop_abandoned_carts
    (recovery_token, email, name, phone, fulfillment, items, subtotal_cents, variant, sender)
  values
    (p_token, lower(trim(p_email)), nullif(trim(p_name), ''), nullif(trim(p_phone), ''),
     p_fulfillment, p_items, greatest(p_subtotal, 0), pick_variant, pick_sender)
  on conflict (email) do update
    set name        = coalesce(nullif(trim(p_name), ''),  shop_abandoned_carts.name),
        phone       = coalesce(nullif(trim(p_phone), ''), shop_abandoned_carts.phone),
        fulfillment = p_fulfillment,
        items       = p_items,
        subtotal_cents = greatest(p_subtotal, 0),
        updated_at  = now(),
        -- Keep the arm this shopper is already in.
        variant     = coalesce(shop_abandoned_carts.variant, pick_variant),
        sender      = coalesce(shop_abandoned_carts.sender,  pick_sender),
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

-- Third reminder, per Klaviyo / Omnisend / Barilliance all recommending three.
alter table shop_abandoned_carts add column if not exists reminder_3_at timestamptz;

-- Readout. Deliberately reports the two questions separately, and counts only
-- carts that were actually MAILED — a cart that never hit the 1h threshold is
-- not a participant and would dilute every rate if included.
create or replace view shop_cart_test_results as
with mailed as (
  select *, (recovered_at is not null) as converted, (clicked_at is not null) as clicked
  from shop_abandoned_carts
  where reminder_1_at is not null
)
select 'variant' as dimension, variant as arm,
       count(*)::int                                   as mailed,
       count(*) filter (where clicked)::int            as clicked,
       count(*) filter (where converted)::int          as recovered,
       round(100.0 * count(*) filter (where converted) / nullif(count(*),0), 1) as recovery_pct,
       round(sum(subtotal_cents) filter (where converted) / 100.0, 2)           as recovered_value,
       round(sum(subtotal_cents) filter (where converted) / nullif(count(*),0) / 100.0, 2)
                                                                               as revenue_per_recipient
from mailed group by variant
union all
select 'sender', sender,
       count(*)::int,
       count(*) filter (where clicked)::int,
       count(*) filter (where converted)::int,
       round(100.0 * count(*) filter (where converted) / nullif(count(*),0), 1),
       round(sum(subtotal_cents) filter (where converted) / 100.0, 2),
       round(sum(subtotal_cents) filter (where converted) / nullif(count(*),0) / 100.0, 2)
from mailed group by sender;

revoke all on shop_cart_test_results from public, anon, authenticated;
