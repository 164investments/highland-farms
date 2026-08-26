-- Back-in-stock waitlist (2026-08-26)
--
-- 7 of 28 products are sold out at any time and every one of them is currently
-- a dead end: the page says "more comes back as the farm restocks" and offers no
-- way to be told when. This is also the store's only email capture before
-- checkout, which is what makes an abandoned cart recoverable at all.

create table if not exists shop_waitlist (
  id          bigserial primary key,
  variant_id  text not null,
  email       text not null,
  created_at  timestamptz not null default now(),
  notified_at timestamptz,
  -- One signup per person per product. A second attempt is a no-op, not a
  -- duplicate email later.
  unique (variant_id, email)
);

create index if not exists shop_waitlist_pending_idx
  on shop_waitlist (variant_id) where notified_at is null;

alter table shop_waitlist enable row level security;
revoke all on shop_waitlist from public, anon, authenticated;
