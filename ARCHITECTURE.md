# Architecture — highlandfarmsoregon.com

Where code goes and why. Update this file in the **same PR** as any structural
change. Companion docs: `CLAUDE.md` (how we work here), `README.md` (how to run).

## What this app is

One Next.js App Router site serving three businesses that share a farm:

1. **The venue** — weddings, celebrations, farm stays. Lead-generation: forms in,
   CRM out. No money changes hands on the site.
2. **The experiences** — farm tours and the Nordic spa. Booked through **Acuity**,
   which owns the calendar, capacity and confirmation emails.
3. **The farm store** — physical goods, paid for on this site through **Square**.

These have genuinely different shapes. Don't unify them: a lead is a fire-and-forget
fan-out, a booking is someone else's system, and an order moves money and must be
transactional.

## Directory map

```
src/
  app/                     routes (App Router)
    shop/                  the farm store — see "Commerce" below
    api/                   route handlers; one directory per integration
  components/
    layout/                shell: Header, Footer, GTM, popups, StructuredData
    ui/                    primitives: Container, Button, SectionHeading, FadeIn
    forms/                 lead capture
    shared/                cross-page blocks (reviews, email capture)
    shop/                  commerce-only UI that lives outside /app/shop
  lib/
    shop/                  ALL farm-store domain logic (see below)
    <integration>.ts       one file per external system: acuity, hubspot,
                           bookediq, meta, ga4, supabase, resend, turnstile
    daily-report.ts        pure daily-report calculations + escaped email template
    html.ts                shared HTML escaping for all email renderers
  data/                    static page content (properties, tours, spa, portfolio)
docs/                      plans, recovered data, ads runbooks
scripts/                   one-off + scheduled ops scripts
supabase-*.sql             schema, applied by hand (no migration runner here)
```

### Where does X go?

| Adding… | Put it in |
|---|---|
| A marketing page | `src/app/<route>/page.tsx`, content in `src/data/` if it's a list |
| A new external system | `src/lib/<system>.ts` + a route under `src/app/api/<system>/` |
| Farm-store business logic | `src/lib/shop/` — never inline in a component |
| A shared visual primitive | `src/components/ui/` |
| A DB table | append to a `supabase-*.sql` file, then **apply it before deploying** |
| A one-off or cron script | `scripts/` |

## Commerce (the farm store)

Added Aug 2026 after the Squarespace store was cancelled and went dark. The old
`/shop` was a catalog that linked out; it is now a real store.

```
src/app/shop/
  data.ts              THE CATALOG — products, variants, prices. Static.
  checkout/ExpressPay.tsx  Apple Pay + Google Pay (same source_id, no server change)
  page.tsx             collection page (ISR, revalidate 60)
  ShopBody.tsx         collection UI (client)
  [slug]/              product detail + AddToCart
  cart/                cart page
  checkout/            checkout form + Square card fields
  thank-you/           post-purchase confirmation
  order/               fallback "call us to order" page
src/lib/shop/
  data flows from      catalog (static)  +  inventory (Supabase)
  inventory.ts         live stock reads (service-role)
  cart.tsx             client cart: external store + Context
  money.ts             integer cents; the only place dollars↔cents converts
  fulfillment.ts       pickup vs local delivery, ZIP allowlist, fees
  square.ts            payment rail (REST, no SDK)
  orders.ts            order writes + atomic stock claim/release
  order-email.ts       customer receipt + farm pick list
src/app/api/shop/checkout/route.ts   the one transactional endpoint
src/app/api/shop/cart/save|recover/   abandoned-cart capture + restore
src/app/api/cron/abandoned-carts/     hourly reminder job
src/lib/shop/abandoned-cart-email.ts  the reminder template
src/app/api/square/webhook/route.ts  Square -> website (POS sales, refunds, orphan payments)
src/app/api/shop/admin/inventory/    admin writes
src/app/shop/admin/                  stock, count, orders, Square matching
  CountSheet.tsx                     shelf count -> DB, with an audit trail
  MatchPicker.tsx                    human-confirmed Square linking
src/lib/shop/admin-auth.ts           shared-token gate (+ admin-cookie.ts for the client)
```

### The rules that keep this honest

1. **The catalog is static; availability is not.** Names and prices live in
   `data.ts` (in git, reviewable). Stock lives in `shop_inventory` so the farm can
   sell out without a deploy. Never put stock counts in `data.ts` — the values
   there are a one-time seed only.

2. **The server is the price authority.** The browser sends variant ids and
   quantities, never prices. `/api/shop/checkout` re-derives every line from
   `data.ts`. A cart that remembered prices would let a stale tab check out at last
   month's number.

3. **Money is integer cents everywhere but the display edge.** Convert once via
   `money.ts`. Never do float arithmetic on a total.

4. **Reserve stock before charging, release on decline.** `claim_shop_stock` runs
   first and is atomic with a stable lock order; a declined card calls
   `release_shop_stock`. A customer must never be charged for a cut that just sold
   out. Everything after a successful charge (order insert, emails) is best-effort
   and must never surface as a failed purchase.

5. **Fulfillment is pickup or local delivery. The farm does not ship.** The rule
   lives once in `fulfillment.ts` and is enforced on both the form and the server,
   so the two can't drift. If this ever changes, audit the marketing copy too —
   the announcement bar, the `/shop` hero and the trust strip all advertised
   "insulated shipping" and had to be corrected when the Squarespace store died.

6. **⛔ SQUARE IS THE PRICE SOURCE OF TRUTH** (Hayden, 2026-08-26). For any
   variant linked to a Square variation, Square's price wins and `data.ts` holds
   a copy. Re-sync with `node scripts/sync-square-prices.mjs --apply`, which only
   touches linked variants. Unlinked products (all apparel, both plush, the
   bouquets) keep their own price because Square has no opinion on them.

   This inverted an earlier rule that said the opposite. The reason the earlier
   rule existed still holds in one specific place: **the Square order is still
   built from ad-hoc line items at our price, never `catalog_object_id`.** Prices
   agreeing today doesn't make them the same system, and a catalog line would
   re-price itself from Square the instant someone edits the register, silently
   diverging from the amount we charged. Pricing is synced deliberately, not
   implicitly.

   ⚠️ A Square variation with **no set price** is a custom-price or duplicate
   line, not a $0 product. The sync skips and reports those. The website's New
   York Steak was auto-linked to exactly such a duplicate; the real item was
   "NY Steak" at $20.

7. **Shop tables AND functions are service-role only.** The tables have RLS on
   with zero policies, which is deny-all. The functions need separate care:
   ⛔ **revoke from `PUBLIC`, not just `anon`/`authenticated`.** Postgres grants
   EXECUTE to PUBLIC by default and grants are additive, so revoking from `anon`
   leaves the PUBLIC grant it inherits. A `SECURITY DEFINER` function has no RLS
   gate — EXECUTE is the only gate. This was shipped wrong on 2026-08-26 and left
   both stock RPCs callable by anyone holding the (publicly-known) anon key.

### The Square link (added 2026-08-26)

The farm rings sales up on Square. Without a link, the same physical plush can be
sold at the register and on the website, because the two count separately.

**Both directions, and why each is built the way it is:**

- **Register → website.** Square's `inventory.count.updated` webhook writes the
  new count into `shop_inventory` via `sync_square_stock`. Only variants that
  carry a `square_variation_id` are touched; a Square event for something the
  website doesn't sell (wedding deposits, pumpkins) is a no-op by design.
- **Website → register.** After a paid order, `adjustInventory()` posts an
  ADJUSTMENT to Square for the mapped lines.

⛔ **The Square order is built from ad-hoc line items at OUR prices, never
`catalog_object_id`.** A catalog line is priced from Square's catalog, and
Square's prices disagree with the website's (Beef Tenderloin $22 vs $29,
Boneless Pork Chop $9 vs $15). Referencing the catalog would make the Square
order total diverge from the amount charged. Pricing and stock are therefore
moved by two separate calls, on purpose.

⛔ **Mapping is one-to-one and must stay that way.** A unique index enforces it.
The website sells Pork Shoulder Roast in three weight tiers against Square's
single "Pork Shoulder Roast" — linking all three would decrement one count for
three different products. `scripts/square-catalog-match.mjs` demotes any
contested match to "needs a human" rather than guessing.

⚠️ **A mapping only does something once the item has inventory tracking ON in
Square.** At the time of writing only 4 of 53 Square variations track stock, and
none of them are the mapped ones — so the plumbing is live but mostly idle until
the farm switches tracking on.

### Abandoned cart recovery (added 2026-08-26)

Email is captured on the checkout page as soon as a valid address is typed, and
the cart is snapshotted against it. Two reminders then stop: ~1h and ~24h.

⛔ **The snapshot stores variant ids and quantities, never prices.** Same rule as
the checkout: a two-day-old email must not be able to check out at a price we no
longer charge, and Square moves prices without us. `subtotal_cents` is stored for
the email and reporting only, recomputed server-side, never used to charge.

The rules that stop it embarrassing the farm, all enforced in the cron:
never mail a cart that has since been ordered (the checkout calls
`mark_cart_recovered`); never mail an unsubscribed address; never mail the same
step twice (the timestamp is written **before** the send, so a crash costs one
reminder rather than sending two); drop sold-out lines and skip the cart entirely
if nothing is left; ignore carts older than a week; and cap sends per run.

⭐ Editing a cart refreshes `updated_at`, which restarts the idle clock — someone
actively shopping has not abandoned anything.

CAN-SPAM is built into the template shell, not left to the caller: every send
carries a working unsubscribe plus the farm's physical address, and the job sets
`List-Unsubscribe` / `List-Unsubscribe-Post` for native one-click in Gmail.

### The cart-reminder A/B test

⛔ **Two independent randomisations, not a six-cell grid.** Three variants times
two senders would need roughly six times the traffic to resolve, and this store
will not produce it. `variant` and `sender` are assigned independently and read
as two separate questions: which argument works (~1/3 each) and who should sign
it (~1/2 each). Same traffic, two answerable questions.

Assignment happens once, on first save, and `coalesce` keeps it — a shopper who
gets Connor at 1h must not get Jalene at 24h. Read results from the
`shop_cart_test_results` view, which counts only carts that were actually
MAILED; including carts that never reached the 1h threshold would dilute every
rate.

⛔ **A sender's `photo` must be a REAL photograph or null.** Never generate a
likeness: a fabricated headshot of a real employee is a worse version of the
fake-provenance-imagery problem, because it puts a face and words on someone who
consented to neither. Jalene has no photo on file and signs without one.

### Known gaps

Ranked.

- ⚠️ **Stock reservation has no TTL.** `claim_shop_stock` decrements outright;
  there is no `reserved` column. Release only happens on the in-request decline
  path, so if the function dies between claim and release the unit is decremented
  forever (phantom sold-out). Needs either a reserved-with-expiry model or the
  webhook above plus a sweeper.
- ⚠️ **Rate limiting is per-instance, in-memory.** Each warm serverless instance
  keeps its own counter, so the "12 per 15 min" is not global, and a cold start
  resets it. Since every attempt calls Square, this endpoint is a card-testing
  oracle with a weak brake. Wants a shared store (Redis/Supabase) and/or the
  Turnstile challenge the repo already uses on the contact form.
- **Admin auth is a single shared token**, and its cookie is set client-side so
  it is not httpOnly. Adequate for one farm team; not real accounts. If this ever
  needs per-person accountability beyond the free-text "counted by" field, that's
  the thing to fix first.
- **Only 7 of 56 variants are linked to Square.** Apparel, plush and flowers have
  no Square counterpart at all. Anything unlinked can still be oversold.
- **Refunds are recorded, not initiated.** The webhook writes `refunded_cents`
  and flips status when a refund happens in the Square dashboard; there is no
  refund button on our side.
- **No CSP.** Not required for the wallets (Square is allowed by default when no
  CSP exists), but a checkout page with no script-integrity control is the one
  gap an assessor would flag under SAQ A-EP. If a CSP is ever added it MUST
  allowlist `web.squarecdn.com` and Square's PCI-connect origin, or card entry
  breaks silently.
- **Cash App Pay, ACH and Afterpay are still off.** Apple Pay and Google Pay
  are live. ACH is worth adding only for large tickets (1% capped at $5 vs
  2.9%+30c) and settles in 2-3 days, so an order can't be treated as paid on
  response.
- **(historical) Digital wallets were off.** Apple/Google Pay run through the same
  `POST /v2/payments` call and need no server change; Apple Pay needs the
  `.well-known/apple-developer-merchantid-domain-association` file plus domain
  registration. The current `Permissions-Policy` header omits `payment`, which
  leaves it at its `self` default — that does NOT block wallets.

## Booking (native calendar)

Added Aug 2026 (Phase 1, behind `NEXT_PUBLIC_NATIVE_CALENDAR`) to replace Acuity
as the calendar of record for farm tours, the Nordic spa, and wedding calls.
Acuity remains live in production until the flag flips (Phase 3). Phase 2
(same month) added the on-page booking widgets, wedding-call scheduling +
Google Meet, gift certificates, and the farm's admin booking surface.

```
src/lib/booking/
  products.ts            THE CATALOG — slugs, prices, party size, lead time. Static.
  engine.ts               pure availability math (schedules + exceptions + blackouts
                           + booked units -> offered slots); no I/O
  store.ts                Supabase I/O: schedule reads, claim/confirm/release RPCs,
                           gift-certificate RPCs, gift-certificate insert, the
                           best-effort booking_audit writer
  time.ts                 the only place America/Los_Angeles <-> UTC conversion happens
  flag.ts                 the NEXT_PUBLIC_NATIVE_CALENDAR kill switch — GUEST-FACING
                           surfaces only, see rule 9
  client.ts               browser-side availability fetch + idempotency-aware submit,
                           used by every BookingFlow instance
  booking-number.ts       customer-facing booking number generator
  confirmation-email.ts   customer + farm confirmation emails (composes the
                           "MEET LINK NEEDED" farm-notification fallback, rule 8)
  cancel-email.ts         farm-initiated cancellation email (refund and/or
                           gift-restore composed together when both apply)
  reminder-email.ts       48h / morning-of reminder emails
  gift.ts                 gift certificate PRODUCTS (fixed price/kind/scope), code
                           generation, and issuance (insert + one 23505 retry)
  gift-email.ts           gift certificate purchase + delivery emails
  google-calendar.ts      wedding-call Meet-link creation via a domain-wide-delegated
                           service account impersonating events@; NEVER throws (rule 8)
  ics.ts                  .ics calendar attachment for confirmation/reminder emails
src/components/booking/
  BookingFlow.tsx          client widget: date/slot pick -> party -> details -> pay
  BookingPayment.tsx       Square card + wallet bootstrap, scoped to the widget
  NativeBookingSection.tsx server wrapper — returns null when the flag is off, so
                           mounting it on a guest page is always flag-off-safe
src/app/api/booking/
  availability/route.ts   GET — offered slots per product (or combo pairs)
  checkout/route.ts       POST — the one transactional booking endpoint
  gift/checkout/route.ts  POST — gift certificate purchase (charge, then issue)
src/app/gift-certificates/page.tsx + GiftBody.tsx   gift certificate purchase page
src/app/wedding-call/page.tsx   wedding-call scheduling page (mounts BookingFlow
                                 directly — no pricing card, the product is free)
src/app/api/cron/booking-reminders/route.ts   expired-hold sweep + reminder sends
supabase-booking.sql      schema + RPCs, applied by hand (no migration runner here)
```

### Admin booking surface

Lives inside the existing farm-store admin (`/shop/admin`, `src/lib/shop/admin-auth.ts`
shared-token gate) rather than a new admin app — same operator, same login.

```
src/app/api/shop/admin/booking/
  route.ts               GET — bookings + blackouts in a date range
  blackouts/route.ts      POST/DELETE — wedding + closure blackouts
  schedules/route.ts      POST/DELETE — weekly recurring availability
  manual/route.ts         POST — phone/walk-in bookings (claims capacity, no charge)
  cancel/route.ts         POST — farm-initiated cancel + Square refund + gift restore;
                           detects a combo_group and cancels/refunds/emails the whole
                           pair atomically, never a single leg of a combo
  certs/route.ts          GET/POST — gift certificate issue, lookup, void
src/app/shop/admin/
  CalendarTab.tsx          bookings + blackout calendar view
  SchedulesTab.tsx         weekly schedule editor
  CertsTab.tsx             gift certificate issue/lookup/void UI
```

### The rules that keep this honest

1. **The engine is pure; the RPC is the authority.** `engine.ts` decides what's
   offered; `claim_booking_slots` enforces capacity under an advisory lock.
   Availability shown to users is real counts — scarcity is never invented.
2. **Slots are held BEFORE the card is charged** (10-min pending hold), released
   on decline, swept by cron if a crash leaks one.
3. **The server derives every price from `products.ts`.** The browser sends
   product/date/time/party only.
4. **All schedule wall-times are America/Los_Angeles**; storage is timestamptz.
   Conversion happens only in `time.ts`.
5. **A wedding is a blackout** (`booking_blackouts.kind='wedding'`) that blocks
   tours + spa. Weddings are not bookings.
6. **Everything guest-facing is behind `NEXT_PUBLIC_NATIVE_CALENDAR`** until
   cutover (Phase 3). Acuity remains the live calendar of record until then.
7. **Every admin mutation writes `booking_audit`.** `auditBooking()` in
   `store.ts` is a best-effort insert (it never throws — auditing must not
   break a booking) but every admin route calls it with actor `"admin"` and a
   detail payload that names exactly what changed: a blackout created, a
   schedule edited, a manual booking taken, a cancel/refund, a cert issued or
   voided. The customer-facing checkout/cron paths default to actor
   `"system"` instead.
8. **Meet-link creation is best-effort; a wedding-call booking NEVER fails on
   calendar errors.** `google-calendar.ts`'s `createWeddingCallEvent()` never
   throws — a missing service-account config, a non-2xx response, or a
   network error all resolve `null` and log the booking number. When that
   happens the confirmation email still sends: the customer copy promises the
   Meet link will follow by email, and the farm notification is flagged
   `MEET LINK NEEDED` so a human closes the loop by hand. The booking itself
   confirms regardless — a calendar hiccup is never the reason a wedding
   couple's call fails to book.
9. **Admin booking screens are NOT flag-gated by design.** `flag.ts`'s kill
   switch guards guest-facing surfaces only (rule 6); the admin routes under
   `/api/shop/admin/booking/*` and their `/shop/admin` tabs have no
   `nativeCalendarEnabled()` check anywhere in them. This is deliberate:
   Jalene needs to seed real schedules and blackouts, and the farm needs to
   take manual bookings and issue gift certificates, before cutover — not
   after. Guests see none of it until the flag flips; the admin surface is
   just data entry against tables no guest-facing route reads while the flag
   is off.
10. **Gift certificates charge BEFORE they insert** (the opposite order from a
    booking, which claims capacity first) — there is no capacity to protect,
    so nothing may be written until money has actually moved. If the insert
    then fails, there is no row to force-confirm the way a paid booking has:
    the route logs a `CRITICAL` line with the Square payment id and returns
    `{ success: true, code: null }` rather than a failure, since the customer
    was in fact charged. The farm reconciles from that log line and issues
    the code by hand.

## Conventions worth keeping

- **Fire-and-forget for leads, transactional for orders.** `/api/inquiries` writes
  Supabase first then fans out and never fails on a downstream error. Checkout is
  the opposite: ordered, and it stops when a step genuinely fails.
- **Server-side tracking.** GA4 via Measurement Protocol and Meta via CAPI, so an
  ad blocker doesn't erase a conversion.
- **Static content lives in `src/data/`**, not in the component that renders it —
  FAQ arrays there also feed `FAQPage` JSON-LD, so one edit updates both.
- **`robots.txt` and `llms.txt` are static files** in `public/`. Do not convert
  `robots.txt` to a typed route; it can't emit the Cloudflare `Content-Signal`
  line. Bump `Last-Updated` in `llms.txt` when you edit it.
