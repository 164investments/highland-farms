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

7. **Shop tables AND functions are service-role only.** The tables have RLS on
   with zero policies, which is deny-all. The functions need separate care:
   ⛔ **revoke from `PUBLIC`, not just `anon`/`authenticated`.** Postgres grants
   EXECUTE to PUBLIC by default and grants are additive, so revoking from `anon`
   leaves the PUBLIC grant it inherits. A `SECURITY DEFINER` function has no RLS
   gate — EXECUTE is the only gate. This was shipped wrong on 2026-08-26 and left
   both stock RPCs callable by anyone holding the (publicly-known) anon key.

### Known gaps

Ranked. The first is the one that can lose money silently.

- ⚠️ **No payment↔order reconciliation.** There is no Square webhook. The charge
  is the only thing that must succeed; the order insert and emails run after it
  and are best-effort. If the order write fails AND the emails fail, the customer
  is charged and the farm never learns the order exists — the only trace is a
  `console.error` in the Vercel log carrying the Square payment id. A
  `payment.created` webhook that reconciles into `shop_orders` is the fix, and it
  also heals the next gap.
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
- **Inventory has no admin UI.** The farm edits `shop_inventory` in Supabase
  Studio.
- **In-person Square POS sales do not decrement `shop_inventory`.** The POS
  catalog shares no SKUs with the website, so the same physical plush can be sold
  twice.
- **No refund/cancel flow.** Refunds happen in the Square dashboard and are not
  reflected back into `shop_orders.status`.
- **No CSP.** Not required for the wallets (Square is allowed by default when no
  CSP exists), but a checkout page with no script-integrity control is the one
  gap an assessor would flag under SAQ A-EP. If a CSP is ever added it MUST
  allowlist `web.squarecdn.com` and Square's PCI-connect origin, or card entry
  breaks silently.
- **Digital wallets are off.** Apple/Google Pay run through the same
  `POST /v2/payments` call and need no server change; Apple Pay needs the
  `.well-known/apple-developer-merchantid-domain-association` file plus domain
  registration. The current `Permissions-Policy` header omits `payment`, which
  leaves it at its `self` default — that does NOT block wallets.

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
