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

6. **Square is the payment rail, not the catalog.** The farm's Square POS catalog
   has different SKUs *and different prices* from the website. Never sync one to
   the other without a human decision.

7. **Shop tables are service-role only.** `shop_inventory`, `shop_orders` and
   `shop_order_items` have RLS on with no anon grants. The browser never reads
   them. This follows the Aug 2026 remediation where ten `sc_*` tables shipped
   with RLS off and full anon CRUD.

### Known gaps

- **Inventory has no admin UI.** The farm edits `shop_inventory` in Supabase
  Studio. A small authenticated admin page is the obvious next step.
- **No refund/cancel flow.** Refunds happen in the Square dashboard and are not
  reflected back into `shop_orders.status`.
- **Digital wallets are off.** Apple/Google Pay would need `payment=*` added to
  the `Permissions-Policy` header in `next.config.ts`.

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
